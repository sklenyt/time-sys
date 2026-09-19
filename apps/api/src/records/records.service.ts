import { Injectable } from "@nestjs/common";
import type { ZaznamUdalosti } from "@prisma/client";
import { TypOpravy, TypUdalosti } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRecordDto } from "./dto/create-record.dto";

function formatDuration(ms: number): string {
  const totalCentis = Math.round(ms / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Zápis doběhu — jádro celého systému (F06). Idempotentní přes
   * klientEventId, protože klient může requst při výpadku spojení
   * zopakovat beze změny obsahu (viz 06-api-design.md).
   */
  async create(trasaId: string, dto: CreateRecordDto) {
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
