import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, type Prihlaska } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { ImportEntriesResponseDto, Pohlavi, TypStartu } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { StartVlnyService } from "../start-vlny/start-vlny.service";
import { decryptSecret, encryptSecret } from "../common/secret-crypto";

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly startVlny: StartVlnyService
  ) {}

  async create(trasaId: string, dto: CreateEntryDto) {
    const startVlnaId = dto.startVlnaId ?? (await this.vychoziVlnaProHromadnyStart(trasaId));

    try {
      const prihlaska = await this.prisma.prihlaska.create({
        data: {
          trasaId,
          startovniCislo: dto.startovniCislo,
          prijmeni: dto.prijmeni,
          jmeno: dto.jmeno,
          rocnik: dto.rocnik,
          pohlavi: dto.pohlavi,
          klub: dto.klub,
          kategorieId: dto.kategorieId,
          startVlnaId,
          // Citlivé osobní údaje (F31) — nikdy plain-text ve sloupci (§8.4).
          nouzovyKontakt: dto.nouzovyKontakt ? encryptSecret(dto.nouzovyKontakt) : undefined,
          zdravotniPoznamka: dto.zdravotniPoznamka ? encryptSecret(dto.zdravotniPoznamka) : undefined,
        },
      });
      return odsifrovatPrihlasku(prihlaska);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException(
          `Startovní číslo ${dto.startovniCislo} už je na této trati obsazené`
        );
      }
      throw err;
    }
  }

  /**
   * Import startovní listiny z CSV (F04, UC2). Očekávané sloupce v hlavičce:
   * cislo, prijmeni, jmeno, kategorie (kód kategorie na této trati),
   * volitelně rocnik, pohlavi (M/Z), klub. Chybný řádek se přeskočí a
   * zaznamená se do `chyby` — jeden špatný řádek nezmaří zbytek importu.
   */
  async importCsv(trasaId: string, obsahSouboru: Buffer): Promise<ImportEntriesResponseDto> {
    const kategorie = await this.prisma.kategorie.findMany({ where: { trasaId } });
    const kategoriePodleKodu = new Map(kategorie.map((k) => [k.kod.toLowerCase(), k.id]));

    let radky: Record<string, string>[];
    try {
      radky = parse(obsahSouboru, { columns: true, trim: true, skip_empty_lines: true });
    } catch {
      return { importovano: 0, chyby: [{ radek: 0, zprava: "Soubor se nepodařilo přečíst jako CSV" }] };
    }

    const chyby: { radek: number; zprava: string }[] = [];
    let importovano = 0;

    for (const [index, radek] of radky.entries()) {
      const cisloRadku = index + 2; // +1 hlavička, +1 na 1-based řádkování pro uživatele

      const cislo = Number(radek.cislo);
      const kategorieKod = (radek.kategorie ?? "").toLowerCase();
      const kategorieId = kategoriePodleKodu.get(kategorieKod);

      if (!radek.cislo || Number.isNaN(cislo)) {
        chyby.push({ radek: cisloRadku, zprava: "Chybí nebo neplatné startovní číslo" });
        continue;
      }
      if (!radek.prijmeni?.trim() || !radek.jmeno?.trim()) {
        chyby.push({ radek: cisloRadku, zprava: "Chybí příjmení nebo jméno" });
        continue;
      }
      if (!kategorieId) {
        chyby.push({ radek: cisloRadku, zprava: `Neznámá kategorie "${radek.kategorie ?? ""}"` });
        continue;
      }

      const pohlavi =
        radek.pohlavi?.toUpperCase() === "M" || radek.pohlavi?.toUpperCase() === "Z"
          ? (radek.pohlavi.toUpperCase() as Pohlavi)
          : undefined;
      const rocnik = radek.rocnik ? Number(radek.rocnik) : undefined;

      try {
        await this.create(trasaId, {
          startovniCislo: cislo,
          prijmeni: radek.prijmeni.trim(),
          jmeno: radek.jmeno.trim(),
          kategorieId,
          klub: radek.klub?.trim() || undefined,
          pohlavi,
          rocnik: rocnik && !Number.isNaN(rocnik) ? rocnik : undefined,
        });
        importovano += 1;
      } catch (err) {
        const zprava = err instanceof ConflictException ? (err.getResponse() as { message: string }).message : "Import řádku selhal";
        chyby.push({ radek: cisloRadku, zprava });
      }
    }

    return { importovano, chyby };
  }

  async findAllForRoute(trasaId: string, search?: string) {
    const prihlasky = await this.prisma.prihlaska.findMany({
      where: {
        trasaId,
        ...(search
          ? {
              OR: [
                { prijmeni: { contains: search, mode: "insensitive" } },
                { jmeno: { contains: search, mode: "insensitive" } },
                { klub: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { kategorie: true },
      orderBy: { startovniCislo: "asc" },
    });
    return prihlasky.map(odsifrovatPrihlasku);
  }

  /**
   * U hromadného startu je vlna implicitní — přihláška se automaticky
   * naváže na jedinou vlnu trati (založí se, pokud ještě neexistuje), aby
   * organizátor nemusel před startovní listinou zvlášť zakládat vlnu ručně.
   * U vlnového/intervalového startu musí vlnu vybrat explicitně (startVlnaId).
   */
  private async vychoziVlnaProHromadnyStart(trasaId: string): Promise<string | undefined> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (trasa?.typStartu !== TypStartu.HROMADNY) {
      return undefined;
    }
    const vlna = await this.startVlny.findOrCreateDefault(trasaId);
    return vlna.id;
  }
}

/** Rozšifruje citlivé osobní údaje (F31) před vrácením z API — v DB zůstávají jen šifrované. */
function odsifrovatPrihlasku<T extends Pick<Prihlaska, "nouzovyKontakt" | "zdravotniPoznamka">>(prihlaska: T): T {
  return {
    ...prihlaska,
    nouzovyKontakt: prihlaska.nouzovyKontakt ? bezpecneDesifrovat(prihlaska.nouzovyKontakt) : prihlaska.nouzovyKontakt,
    zdravotniPoznamka: prihlaska.zdravotniPoznamka ? bezpecneDesifrovat(prihlaska.zdravotniPoznamka) : prihlaska.zdravotniPoznamka,
  };
}

function bezpecneDesifrovat(hodnota: string): string {
  try {
    return decryptSecret(hodnota);
  } catch {
    // starší nešifrovaná data z doby před zavedením šifrování (pokud existují)
    return hodnota;
  }
}
