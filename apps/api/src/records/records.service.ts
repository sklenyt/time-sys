import { Injectable, NotFoundException } from "@nestjs/common";
import type { ZaznamUdalosti } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { TypOpravy, TypUdalosti } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRecordDto } from "./dto/create-record.dto";
import { CorrectRecordDto } from "./dto/correct-record.dto";
import { formatDuration } from "../common/format-duration";

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const [posledniZaznam] = prihlaska
      ? await this.prisma.zaznamUdalosti.findMany({
          where: { prihlaskaId: prihlaska.id, typUdalosti: TypUdalosti.DOJEZD },
          orderBy: { cas: "desc" },
          take: 1,
        })
      : [];

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
        vytvorenoKlientAt: klientCas,
        klientEventId: dto.klientEventId,
      },
    });

    const startCas = posledniZaznam?.cas ?? prihlaska?.startVlna?.casStartu ?? null;
    const casKola = startCas ? formatDuration(klientCas.getTime() - startCas.getTime()) : null;
    const casCelkem = prihlaska?.startVlna?.casStartu
      ? formatDuration(klientCas.getTime() - prihlaska.startVlna.casStartu.getTime())
      : null;

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

  private toResponse(
    zaznam: ZaznamUdalosti,
    casKola: string | null = null,
    casCelkem: string | null = null
  ) {
    return {
      id: zaznam.id,
      trasaId: zaznam.trasaId,
      startovniCisloRaw: zaznam.startovniCisloRaw,
      prihlaskaId: zaznam.prihlaskaId,
      typUdalosti: zaznam.typUdalosti,
      cas: zaznam.cas.toISOString(),
      stav: zaznam.stav,
      casKola,
      casCelkem,
    };
  }
}
