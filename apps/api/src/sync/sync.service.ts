import { Injectable } from "@nestjs/common";
import { SyncPullResponseDto, SyncPushResponseDto, TypUdalosti } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RecordsService } from "../records/records.service";
import { PushSyncEventsDto } from "./dto/push-sync-events.dto";

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: RecordsService
  ) {}

  /**
   * Přijme dávku eventů z lokální fronty jednoho zařízení (F15). Každý
   * event se zpracuje stejnou cestou jako POST /records (idempotence přes
   * klientEventId, detekce kolize stanovišť) — sync engine na serveru
   * nemá žádnou zvláštní logiku navíc, jen dávkuje stejný zápis.
   */
  async pushEvents(trasaId: string, dto: PushSyncEventsDto, uzivatelId: string | null): Promise<SyncPushResponseDto> {
    const vysledky: SyncPushResponseDto["vysledky"] = [];

    for (const event of dto.events) {
      try {
        const zaznam = await this.records.create(
          trasaId,
          {
            startovniCislo: event.startovniCislo,
            zarizeniId: dto.zarizeniId,
            klientCas: event.klientCas,
            klientEventId: event.klientEventId,
            typUdalosti: event.typUdalosti,
          },
          uzivatelId
        );
        vysledky.push({ klientEventId: event.klientEventId, stav: zaznam.stav, zaznam });
      } catch (err) {
        vysledky.push({
          klientEventId: event.klientEventId,
          stav: "CHYBA",
          chyba: err instanceof Error ? err.message : "Neznámá chyba při zpracování eventu",
        });
      }
    }

    await this.prisma.zarizeni
      .update({ where: { id: dto.zarizeniId }, data: { posledniSyncAt: new Date() } })
      .catch(() => {});

    return { vysledky };
  }

  /**
   * Delta-pull (GET /sync/events?since=) — eventy, které volající zařízení
   * ještě nemá: vzniklé po `since` od JINÝCH zařízení na téže trati.
   * Kurzor je `prijato_server_at` posledního vráceného eventu.
   */
  async pullEvents(trasaId: string, zarizeniId: string, since: string | undefined): Promise<SyncPullResponseDto> {
    const sinceDate = since ? new Date(since) : new Date(0);

    const zaznamy = await this.prisma.zaznamUdalosti.findMany({
      where: {
        trasaId,
        typUdalosti: { in: [TypUdalosti.DOJEZD, TypUdalosti.OPRAVA, TypUdalosti.MEZICAS] },
        prijatoServerAt: { gt: sinceDate },
        zarizeniId: { not: zarizeniId },
      },
      orderBy: { prijatoServerAt: "asc" },
    });

    const cursor =
      zaznamy.length > 0
        ? zaznamy[zaznamy.length - 1].prijatoServerAt.toISOString()
        : sinceDate.toISOString();

    return { cursor, eventy: zaznamy.map((z) => this.records.toResponse(z)) };
  }
}
