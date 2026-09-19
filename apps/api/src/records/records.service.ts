import { Injectable, NotFoundException } from "@nestjs/common";
import type { ZaznamUdalosti } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import { join, extname } from "path";
import { ConflictItemDto, RecordResponseDto, StavCipu, StavZaznamu, TypOpravy, TypUdalosti } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRecordDto } from "./dto/create-record.dto";
import { CorrectRecordDto } from "./dto/correct-record.dto";
import { RfidRecordDto } from "./dto/rfid-record.dto";
import { formatDuration } from "../common/format-duration";
import { PublishTargetsService } from "../publish-targets/publish-targets.service";
import { ResultsEventsService } from "../results/results-events.service";
import { EmailService } from "../notifications/email.service";

/**
 * "Ve stejném kole" (03-architecture.md §3.5) — okno, v němž se druhý
 * DOJEZD téže přihlášky z JINÉHO zařízení považuje za možnou kolizi
 * stanovišť, ne za legitimní další kolo vícekolového závodu.
 */
const KOLIZE_OKNO_MS = 15 * 60 * 1000;

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publishTargets: PublishTargetsService,
    private readonly resultsEvents: ResultsEventsService,
    private readonly email: EmailService
  ) {}

  /**
   * Zápis doběhu — jádro celého systému (F06). Idempotentní přes
   * klientEventId, protože klient může requst při výpadku spojení
   * zopakovat beze změny obsahu (viz 06-api-design.md).
   */
  async create(trasaId: string, dto: CreateRecordDto, uzivatelId: string | null = null) {
    const existing = await this.prisma.zaznamUdalosti.findUnique({
      where: { klientEventId: dto.klientEventId },
    });
    if (existing) {
      return this.toResponse(existing);
    }

    await this.prisma.zarizeni.upsert({
      where: { id: dto.zarizeniId },
      create: { id: dto.zarizeniId, nazev: "Neregistrované zařízení", typ: "CIL" },
      update: { posledniSyncAt: new Date() },
    });

    const typUdalosti = dto.typUdalosti ?? TypUdalosti.DOJEZD;

    const prihlaska = await this.prisma.prihlaska.findFirst({
      where: { trasaId, startovniCislo: dto.startovniCislo },
      include: { startVlna: true },
    });

    const klientCas = new Date(dto.klientCas);

    const drivejsiZaznamyDojezdu = prihlaska
      ? await this.prisma.zaznamUdalosti.findMany({
          where: { prihlaskaId: prihlaska.id, typUdalosti: TypUdalosti.DOJEZD },
          orderBy: { cas: "desc" },
        })
      : [];
    const [posledniZaznam] = drivejsiZaznamyDojezdu;

    // Kolize stanovišť (03-architecture.md §3.5): stejná přihláška dostala
    // DOJEZD z jiného zařízení nedávno — dvě nezávislá zařízení mohla
    // zaznamenat tentýž doběh. Nic se nezahazuje, jen se to označí
    // k ručnímu rozhodnutí organizátora; legitimní další kolo (typicky ze
    // stejného zařízení na cíli) zůstává OK. Netýká se MEZICAS (F17) — na
    // více kontrolních bodech běžec logicky prochází vícekrát, to není
    // kolize dvou zařízení tvrdících totéž o cíli.
    const kolizniZaznam =
      typUdalosti === TypUdalosti.DOJEZD
        ? drivejsiZaznamyDojezdu.find(
            (z) =>
              z.zarizeniId !== dto.zarizeniId &&
              Math.abs(z.cas.getTime() - klientCas.getTime()) < KOLIZE_OKNO_MS
          )
        : undefined;
    const stav = kolizniZaznam ? StavZaznamu.NEEDS_REVIEW : StavZaznamu.OK;

    const zaznam = await this.prisma.zaznamUdalosti.create({
      data: {
        trasaId,
        prihlaskaId: prihlaska?.id,
        startovniCisloRaw: dto.startovniCislo,
        typUdalosti,
        cas: klientCas,
        zarizeniId: dto.zarizeniId,
        uzivatelId,
        typOpravy: TypOpravy.ORIGINAL,
        stav,
        vytvorenoKlientAt: klientCas,
        klientEventId: dto.klientEventId,
      },
    });

    // Čas na trati k tomuto bodu (split) — smysluplný jak pro cíl, tak pro
    // mezičas. Čas od předchozího kola (casKola) dává smysl jen u DOJEZD
    // (vícekolový závod), u MEZICAS se nepočítá.
    const casCelkem = prihlaska?.startVlna?.casStartu
      ? formatDuration(klientCas.getTime() - prihlaska.startVlna.casStartu.getTime())
      : null;
    const casKola =
      typUdalosti === TypUdalosti.DOJEZD
        ? (() => {
            const startCas = posledniZaznam?.cas ?? prihlaska?.startVlna?.casStartu ?? null;
            return startCas ? formatDuration(klientCas.getTime() - startCas.getTime()) : null;
          })()
        : null;

    if (typUdalosti === TypUdalosti.DOJEZD) {
      // Fire-and-forget — nesmí zpomalit ani ohrozit odpověď na zápis měření (§3.10).
      // Mezičas výsledky neovlivňuje, export ani živé přepočítání by tu bylo zbytečné.
      this.publishTargets.exportPoZaznamuProTrasu(trasaId).catch(() => {});
      this.resultsEvents.oznamZmenu(trasaId);

      // F32 — e-mail rodině/blízké osobě při doběhu, taky fire-and-forget.
      if (prihlaska?.oznamovaciEmail && casCelkem) {
        this.prisma.trasa
          .findUnique({ where: { id: trasaId } })
          .then((trasa) => {
            if (!trasa) return;
            return this.email.posliOznameniODobehu({
              komu: prihlaska.oznamovaciEmail!,
              prijmeni: prihlaska.prijmeni,
              jmeno: prihlaska.jmeno,
              startovniCislo: prihlaska.startovniCislo,
              trasaNazev: trasa.nazev,
              casCelkem,
            });
          })
          .catch(() => {});
      }
    }

    return this.toResponse(zaznam, casKola, casCelkem);
  }

  /**
   * F22 — ingest z Local Capture Agentu (viz docs/03-architecture.md §3.9).
   * RFID decodér zná jen kód čipu, ne startovní číslo — dohledá se
   * aktuálně spárovaná přihláška (F29, `EntriesService.pairChip`) a odtud
   * dál běží úplně stejná logika jako ruční zápis "číslo + Enter".
   */
  async createFromChip(trasaId: string, dto: RfidRecordDto, uzivatelId: string | null = null) {
    const cip = await this.prisma.cip.findFirst({
      where: { kodCipu: dto.kodCipu, stav: StavCipu.PRIREZEN, prihlaska: { trasaId } },
      include: { prihlaska: true },
    });
    if (!cip) {
      throw new NotFoundException(`Čip ${dto.kodCipu} není na této trati přiřazen žádné přihlášce`);
    }
    return this.create(
      trasaId,
      {
        startovniCislo: cip.prihlaska.startovniCislo,
        zarizeniId: dto.zarizeniId,
        klientCas: dto.klientCas,
        klientEventId: dto.klientEventId,
        typUdalosti: dto.typUdalosti,
      },
      uzivatelId
    );
  }

  /**
   * Oprava startovního čísla se zachováním původního času (F08).
   * Nikdy UPDATE — nový řádek typ_udalosti=OPRAVA odkazující na
   * původní přes nahrazuje_zaznam_id, viz 04-data-model.md §4.2.
   * Zapisuje i do audit_log (F09).
   */
  async correct(trasaId: string, zaznamId: string, dto: CorrectRecordDto, uzivatelId: string | null) {
    const original = await this.prisma.zaznamUdalosti.findFirst({
      where: { id: zaznamId, trasaId },
    });
    if (!original) {
      throw new NotFoundException("Záznam nenalezen na této trati");
    }

    const novaPrihlaska = await this.prisma.prihlaska.findFirst({
      where: { trasaId, startovniCislo: dto.noveStartovniCislo },
    });

    const opravenyZaznam = await this.prisma.zaznamUdalosti.create({
      data: {
        trasaId,
        prihlaskaId: novaPrihlaska?.id,
        startovniCisloRaw: dto.noveStartovniCislo,
        typUdalosti: TypUdalosti.OPRAVA,
        cas: original.cas,
        zarizeniId: original.zarizeniId,
        uzivatelId,
        typOpravy: dto.typOpravy,
        nahrazujeZaznamId: original.id,
        vytvorenoKlientAt: original.vytvorenoKlientAt,
        klientEventId: uuidv4(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        uzivatelId,
        entita: "zaznam_udalosti",
        entitaId: opravenyZaznam.id,
        puvodniHodnota: {
          startovniCisloRaw: original.startovniCisloRaw,
          prihlaskaId: original.prihlaskaId,
        },
        novaHodnota: {
          startovniCisloRaw: opravenyZaznam.startovniCisloRaw,
          prihlaskaId: opravenyZaznam.prihlaskaId,
        },
      },
    });

    this.resultsEvents.oznamZmenu(trasaId);
    return this.toResponse(opravenyZaznam);
  }

  /**
   * Kolize stanovišť k ručnímu rozhodnutí organizátora (§3.5 bod 5) —
   * všechny záznamy se `stav=NEEDS_REVIEW` na dané trati, obohacené o
   * jméno/číslo přihlášky pro přehlednost.
   */
  async listConflicts(trasaId: string): Promise<ConflictItemDto[]> {
    const zaznamy = await this.prisma.zaznamUdalosti.findMany({
      where: { trasaId, stav: StavZaznamu.NEEDS_REVIEW },
      include: { prihlaska: true },
      orderBy: { cas: "desc" },
    });
    return zaznamy.map((z) => ({
      ...this.toResponse(z),
      zarizeniId: z.zarizeniId,
      startovniCislo: z.prihlaska?.startovniCislo ?? z.startovniCisloRaw,
      prijmeni: z.prihlaska?.prijmeni ?? null,
      jmeno: z.prihlaska?.jmeno ?? null,
    }));
  }

  /**
   * Ruční potvrzení kolize organizátorem — záznam zůstává v logu beze
   * změny obsahu, jen se přestane nabízet jako "ke kontrole". Nic
   * nemaže ani nepřepisuje (§3.5 bod 5: obě verze zůstávají v logu).
   */
  async resolveConflict(trasaId: string, zaznamId: string, uzivatelId: string | null): Promise<RecordResponseDto> {
    const zaznam = await this.prisma.zaznamUdalosti.findFirst({ where: { id: zaznamId, trasaId } });
    if (!zaznam) {
      throw new NotFoundException("Záznam nenalezen na této trati");
    }
    const vyreseny = await this.prisma.zaznamUdalosti.update({
      where: { id: zaznamId },
      data: { stav: StavZaznamu.OK },
    });
    await this.prisma.auditLog.create({
      data: {
        uzivatelId,
        entita: "zaznam_udalosti",
        entitaId: zaznamId,
        puvodniHodnota: { stav: StavZaznamu.NEEDS_REVIEW },
        novaHodnota: { stav: StavZaznamu.OK },
      },
    });
    return this.toResponse(vyreseny);
  }

  /**
   * F41 — fotodůkaz sporného doběhu, vázaný na konkrétní záznam
   * (typicky NEEDS_REVIEW kolize, viz docs/12-rfid-a-doporuceni.md §12.8).
   * Ukládá se na lokální disk — jen odkaz na soubor u záznamu, žádná
   * zvláštní infrastruktura navíc.
   */
  async uploadPhoto(trasaId: string, zaznamId: string, soubor: Express.Multer.File): Promise<RecordResponseDto> {
    const zaznam = await this.prisma.zaznamUdalosti.findFirst({ where: { id: zaznamId, trasaId } });
    if (!zaznam) {
      throw new NotFoundException("Záznam nenalezen na této trati");
    }

    const uploadDir = join(process.cwd(), "uploads", "zaznamy");
    await fs.mkdir(uploadDir, { recursive: true });
    const pripona = extname(soubor.originalname) || ".jpg";
    const souborNazev = `${zaznamId}${pripona}`;
    await fs.writeFile(join(uploadDir, souborNazev), soubor.buffer);

    const aktualizovany = await this.prisma.zaznamUdalosti.update({
      where: { id: zaznamId },
      data: { fotoSouborNazev: souborNazev },
    });
    return this.toResponse(aktualizovany);
  }

  async getPhotoPath(trasaId: string, zaznamId: string): Promise<string> {
    const zaznam = await this.prisma.zaznamUdalosti.findFirst({ where: { id: zaznamId, trasaId } });
    if (!zaznam?.fotoSouborNazev) {
      throw new NotFoundException("Fotodůkaz k tomuto záznamu nenalezen");
    }
    return join(process.cwd(), "uploads", "zaznamy", zaznam.fotoSouborNazev);
  }

  /** Veřejné i pro SyncService (mapování na stejný tvar při pull delta eventů). */
  toResponse(
    zaznam: ZaznamUdalosti,
    casKola: string | null = null,
    casCelkem: string | null = null
  ): RecordResponseDto {
    return {
      id: zaznam.id,
      trasaId: zaznam.trasaId,
      startovniCisloRaw: zaznam.startovniCisloRaw,
      prihlaskaId: zaznam.prihlaskaId,
      typUdalosti: zaznam.typUdalosti as TypUdalosti,
      cas: zaznam.cas.toISOString(),
      stav: zaznam.stav as StavZaznamu,
      casKola,
      casCelkem,
      maFotodukaz: Boolean(zaznam.fotoSouborNazev),
    };
  }
}
