import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Prihlaska } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { ImportEntriesResponseDto, Pohlavi, RegistrationInfoDto, RegistrationResponseDto, TypStartu } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { PublicRegisterDto } from "./dto/public-register.dto";
import { StartVlnyService } from "../start-vlny/start-vlny.service";
import { decryptSecret, encryptSecret } from "../common/secret-crypto";

const MAX_POKUSU_O_CISLO = 5;

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
          email: dto.email,
          telefon: dto.telefon,
          oznamovaciEmail: dto.oznamovaciEmail,
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

  /** Info pro veřejný registrační formulář (F23) — název, stav otevřenosti, dostupné kategorie. */
  async getRegistrationInfo(trasaId: string): Promise<RegistrationInfoDto> {
    const trasa = await this.prisma.trasa.findUnique({
      where: { id: trasaId },
      include: { kategorie: true, udalost: true },
    });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }
    return {
      trasaNazev: trasa.nazev,
      udalostNazev: trasa.udalost.nazev,
      otevrena: !trasa.dokoncena && !trasa.registraceUzavrena,
      kategorie: trasa.kategorie as RegistrationInfoDto["kategorie"],
    };
  }

  /**
   * Veřejná sebe-registrace (F23, Fáze 4) — na rozdíl od organizátorského
   * `create()` si závodník nevolí startovní číslo, přiřadí se automaticky
   * (nejnižší volné), aby nešlo obsadit/zablokovat cizí číslo. Při souběhu
   * dvou registrací ve stejnou chvíli se pokus o kolidující číslo tiše
   * zopakuje s dalším volným.
   */
  async registerPublic(trasaId: string, dto: PublicRegisterDto): Promise<RegistrationResponseDto> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }
    if (trasa.dokoncena || trasa.registraceUzavrena) {
      throw new BadRequestException("Registrace na tuto trasu už je uzavřená");
    }

    for (let pokus = 0; pokus < MAX_POKUSU_O_CISLO; pokus += 1) {
      const posledni = await this.prisma.prihlaska.aggregate({
        where: { trasaId },
        _max: { startovniCislo: true },
      });
      const dalsiCislo = (posledni._max.startovniCislo ?? 0) + 1 + pokus;

      try {
        const prihlaska = await this.create(trasaId, { ...dto, startovniCislo: dalsiCislo });
        return { startovniCislo: prihlaska.startovniCislo, prijmeni: prihlaska.prijmeni, jmeno: prihlaska.jmeno };
      } catch (err) {
        if (err instanceof ConflictException && pokus < MAX_POKUSU_O_CISLO - 1) {
          continue; // souběh dvou registrací — zkusí další volné číslo
        }
        throw err;
      }
    }
    throw new ConflictException("Registraci se nepodařilo dokončit, zkuste to prosím znovu");
  }

  /**
   * F29 — spárování RFID čipu s přihláškou, nutná příprava pro F22 ingest
   * endpoint (`POST /routes/:id/records/rfid`), který podle kódu čipu
   * dohledá startovní číslo. `@@unique([kodCipu, stav])` v schema.prisma
   * zabraňuje dvěma zároveň aktivně přiřazeným čipům se stejným kódem.
   */
  async pairChip(trasaId: string, prihlaskaId: string, kodCipu: string) {
    const prihlaska = await this.prisma.prihlaska.findFirst({ where: { id: prihlaskaId, trasaId } });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }
    try {
      return await this.prisma.cip.upsert({
        where: { prihlaskaId },
        create: { prihlaskaId, kodCipu, stav: "PRIREZEN" },
        update: { kodCipu, stav: "PRIREZEN" },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException(`Čip ${kodCipu} je už přiřazený jiné aktivní přihlášce`);
      }
      throw err;
    }
  }

  async unpairChip(trasaId: string, prihlaskaId: string): Promise<void> {
    const prihlaska = await this.prisma.prihlaska.findFirst({ where: { id: prihlaskaId, trasaId } });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }
    await this.prisma.cip.deleteMany({ where: { prihlaskaId } });
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
