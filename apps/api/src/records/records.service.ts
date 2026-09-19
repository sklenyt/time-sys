import { Injectable, NotFoundException } from "@nestjs/common";
import type { ZaznamUdalosti } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { ConflictItemDto, RecordResponseDto, StavZaznamu, TypOpravy, TypUdalosti } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRecordDto } from "./dto/create-record.dto";
import { CorrectRecordDto } from "./dto/correct-record.dto";
import { formatDuration } from "../common/format-duration";
import { PublishTargetsService } from "../publish-targets/publish-targets.service";

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
    private readonly publishTargets: PublishTargetsService
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
    // stejného zařízení na cíli) zůstává OK.
    const kolizniZaznam = drivejsiZaznamyDojezdu.find(
      (z) =>
        z.zarizeniId !== dto.zarizeniId &&
        Math.abs(z.cas.getTime() - klientCas.getTime()) < KOLIZE_OKNO_MS
    );
    const stav = kolizniZaznam ? StavZaznamu.NEEDS_REVIEW : StavZaznamu.OK;

    const zaznam = await this.prisma.zaznamUdalosti.create({
      data: {
        trasaId,
        prihlaskaId: prihlaska?.id,
        startovniCisloRaw: dto.startovniCislo,
        typUdalosti: TypUdalosti.DOJEZD,
        cas: klientCas,
        zarizeniId: dto.zarizeniId,
        uzivatelId,
        typOpravy: TypOpravy.ORIGINAL,
        stav,
        vytvorenoKlientAt: klientCas,
        klientEventId: dto.klientEventId,
      },
    });

    const startCas = posledniZaznam?.cas ?? prihlaska?.startVlna?.casStartu ?? null;
    const casKola = startCas ? formatDuration(klientCas.getTime() - startCas.getTime()) : null;
    const casCelkem = prihlaska?.startVlna?.casStartu
      ? formatDuration(klientCas.getTime() - prihlaska.startVlna.casStartu.getTime())
      : null;

    // Fire-and-forget — nesmí zpomalit ani ohrozit odpověď na zápis měření (§3.10).
    this.publishTargets.exportPoZaznamuProTrasu(trasaId).catch(() => {});

    return this.toResponse(zaznam, casKola, casCelkem);
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
    };
  }
}
