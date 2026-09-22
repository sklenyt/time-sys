import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Prihlaska } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { ImportEntriesResponseDto, Pohlavi, RegistrationInfoDto, RegistrationResponseDto, TypStartu } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { UpdateEntryDto } from "./dto/update-entry.dto";
import { PublicRegisterDto } from "./dto/public-register.dto";
import { StartVlnyService } from "../start-vlny/start-vlny.service";
import { CategoriesService } from "../categories/categories.service";
import { decryptSecret, encryptSecret } from "../common/secret-crypto";

const MAX_POKUSU_O_CISLO = 5;

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly startVlny: StartVlnyService,
    private readonly categories: CategoriesService
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
          clenoveDruzstva: dto.clenoveDruzstva?.length
            ? (dto.clenoveDruzstva.map((c) => ({ prijmeni: c.prijmeni, jmeno: c.jmeno, rocnik: c.rocnik ?? null, klub: c.klub ?? null })) as Prisma.InputJsonValue)
            : undefined,
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
   * volitelně rocnik, pohlavi (M/Z), klub. Když sloupec kategorie chybí
   * nebo je prázdný, ale řádek má ročník i pohlaví, kategorie se dopočítá
   * automaticky (F03, `CategoriesService.navrhniKategorii`) — stejný
   * princip, jaký měla legacy Časomíra (viz git historie 01-analysis.md
   * §1.2). Nepovinné sloupce `clen1_prijmeni`/`clen1_jmeno`/`clen1_rocnik`/
   * `clen1_klub` … `clen4_*` zakládají štafetu/družstvo (max 4 členové,
   * legacy vzor). Chybný řádek se přeskočí a zaznamená do `chyby` — jeden
   * špatný řádek nezmaří zbytek importu.
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

      if (!radek.cislo || Number.isNaN(cislo)) {
        chyby.push({ radek: cisloRadku, zprava: "Chybí nebo neplatné startovní číslo" });
        continue;
      }
      if (!radek.prijmeni?.trim() || !radek.jmeno?.trim()) {
        chyby.push({ radek: cisloRadku, zprava: "Chybí příjmení nebo jméno" });
        continue;
      }

      const pohlavi =
        radek.pohlavi?.toUpperCase() === "M" || radek.pohlavi?.toUpperCase() === "Z"
          ? (radek.pohlavi.toUpperCase() as Pohlavi)
          : undefined;
      const rocnik = radek.rocnik ? Number(radek.rocnik) : undefined;
      const platnyRocnik = rocnik && !Number.isNaN(rocnik) ? rocnik : undefined;

      const kategorieKod = (radek.kategorie ?? "").toLowerCase();
      let kategorieId = kategoriePodleKodu.get(kategorieKod);
      if (!kategorieId && !radek.kategorie?.trim() && platnyRocnik && pohlavi) {
        const navrh = await this.categories.navrhniKategorii(trasaId, platnyRocnik, pohlavi);
        kategorieId = navrh?.id;
      }
      if (!kategorieId) {
        chyby.push({
          radek: cisloRadku,
          zprava: radek.kategorie?.trim()
            ? `Neznámá kategorie "${radek.kategorie}"`
            : "Chybí kategorie a nešlo ji dopočítat z ročníku/pohlaví",
        });
        continue;
      }

      try {
        await this.create(trasaId, {
          startovniCislo: cislo,
          prijmeni: radek.prijmeni.trim(),
          jmeno: radek.jmeno.trim(),
          kategorieId,
          klub: radek.klub?.trim() || undefined,
          pohlavi,
          rocnik: platnyRocnik,
          clenoveDruzstva: parseClenoveDruzstvaZRadku(radek),
        });
        importovano += 1;
      } catch (err) {
        const zprava = err instanceof ConflictException ? (err.getResponse() as { message: string }).message : "Import řádku selhal";
        chyby.push({ radek: cisloRadku, zprava });
      }
    }

    return { importovano, chyby };
  }

  /**
   * F11 (UC12 v git historii 01-analysis.md) — ruční nastavení stavu
   * ukončení (DNS/DNF/DQ, nebo `null` pro návrat do běžného stavu) a/nebo
   * úprava soupisky družstva. Obojí je organizátorská akce nad startovní
   * listinou, ne časoměřičský zápis — proto samostatný endpoint od
   * `POST /records`.
   */
  async update(trasaId: string, entryId: string, dto: UpdateEntryDto, uzivatelId: string | null) {
    const prihlaska = await this.prisma.prihlaska.findFirst({ where: { id: entryId, trasaId } });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }

    const zmeny: Prisma.PrihlaskaUpdateInput = {};
    // trasaId v puvodniHodnota je nutný, aby AuditLogService.listForRoute
    // (entita="prihlaska" nemá vlastní sloupec trasa_id) tenhle záznam
    // vůbec dohledal — stejná konvence jako GdprService.anonymizovatPrihlasku.
    const puvodniHodnota: Record<string, unknown> = { trasaId };
    const novaHodnota: Record<string, unknown> = {};

    if (dto.stavUkonceni !== undefined && dto.stavUkonceni !== prihlaska.stavUkonceni) {
      zmeny.stavUkonceni = dto.stavUkonceni;
      puvodniHodnota.stavUkonceni = prihlaska.stavUkonceni;
      novaHodnota.stavUkonceni = dto.stavUkonceni;
    }
    if (dto.clenoveDruzstva !== undefined) {
      zmeny.clenoveDruzstva = dto.clenoveDruzstva?.length
        ? (dto.clenoveDruzstva.map((c) => ({ prijmeni: c.prijmeni, jmeno: c.jmeno, rocnik: c.rocnik ?? null, klub: c.klub ?? null })) as Prisma.InputJsonValue)
        : Prisma.DbNull;
      puvodniHodnota.clenoveDruzstva = prihlaska.clenoveDruzstva;
      novaHodnota.clenoveDruzstva = dto.clenoveDruzstva ?? null;
    }

    if (Object.keys(zmeny).length === 0) {
      return odsifrovatPrihlasku(prihlaska);
    }

    const [aktualizovana] = await this.prisma.$transaction([
      this.prisma.prihlaska.update({ where: { id: entryId }, data: zmeny }),
      this.prisma.auditLog.create({
        data: {
          uzivatelId,
          entita: "prihlaska",
          entitaId: entryId,
          puvodniHodnota: puvodniHodnota as Prisma.InputJsonObject,
          novaHodnota: novaHodnota as Prisma.InputJsonObject,
        },
      }),
    ]);
    return odsifrovatPrihlasku(aktualizovana);
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
      include: { kategorie: true, cip: true },
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
        create: { prihlaskaId, kodCipu, stav: "PRIREZEN", vydanoAt: new Date() },
        update: { kodCipu, stav: "PRIREZEN", vydanoAt: new Date(), vracenoAt: null },
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

/**
 * Nepovinné CSV sloupce `clen1_prijmeni`/`clen1_jmeno`/`clen1_rocnik`/
 * `clen1_klub` … `clen4_*` — legacy vzor pro štafety/družstva (viz git
 * historie 11-legacy-schema-reference.md §11.2, sloupce prijmeniN/jmenoN/
 * rocnikN/klubN na `tblStartovniListina`). Člen se do pole zařadí, jen
 * když má vyplněné aspoň příjmení i jméno.
 */
function parseClenoveDruzstvaZRadku(radek: Record<string, string>): { prijmeni: string; jmeno: string; rocnik?: number; klub?: string }[] | undefined {
  const clenove: { prijmeni: string; jmeno: string; rocnik?: number; klub?: string }[] = [];
  for (let i = 1; i <= 4; i += 1) {
    const prijmeni = radek[`clen${i}_prijmeni`]?.trim();
    const jmeno = radek[`clen${i}_jmeno`]?.trim();
    if (!prijmeni || !jmeno) continue;
    const rocnik = radek[`clen${i}_rocnik`] ? Number(radek[`clen${i}_rocnik`]) : undefined;
    clenove.push({
      prijmeni,
      jmeno,
      rocnik: rocnik && !Number.isNaN(rocnik) ? rocnik : undefined,
      klub: radek[`clen${i}_klub`]?.trim() || undefined,
    });
  }
  return clenove.length > 0 ? clenove : undefined;
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
