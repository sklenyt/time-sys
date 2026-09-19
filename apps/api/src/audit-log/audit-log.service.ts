import { Injectable } from "@nestjs/common";
import type { AuditLogPolozka } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogFiltr {
  uzivatelId?: string;
  od?: string;
  doData?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auditní log s filtrováním (§7.6) — scoped na trasu. `audit_log` nemá
   * vlastní sloupec `trasa_id`, takže se dohledává dvěma cestami:
   * `entita=zaznam_udalosti` přes `entitaId` v aktuálních záznamech trati,
   * a `entita=prihlaska` (GDPR anonymizace, viz GdprService) přes
   * `trasaId` uložené v JSON payloadu — ta funguje i po smazání
   * přihlášky samotné. Filtry podle uživatele a data jsou volitelné.
   */
  async listForRoute(trasaId: string, filtr: AuditLogFiltr): Promise<AuditLogPolozka[]> {
    const zaznamy = await this.prisma.zaznamUdalosti.findMany({
      where: { trasaId },
      select: { id: true },
    });
    const entitaIds = zaznamy.map((z) => z.id);

    const spolecnyFiltr = {
      uzivatelId: filtr.uzivatelId,
      cas: {
        gte: filtr.od ? new Date(filtr.od) : undefined,
        lte: filtr.doData ? new Date(filtr.doData) : undefined,
      },
    };

    const [zaznamove, prihlaskove] = await Promise.all([
      entitaIds.length > 0
        ? this.prisma.auditLog.findMany({
            where: { entita: "zaznam_udalosti", entitaId: { in: entitaIds }, ...spolecnyFiltr },
            include: { uzivatel: true },
          })
        : Promise.resolve([]),
      this.prisma.auditLog.findMany({
        where: { entita: "prihlaska", ...spolecnyFiltr },
        include: { uzivatel: true },
      }),
    ]);

    const prihlaskoveProTutoTrasu = prihlaskove.filter(
      (p) => (p.puvodniHodnota as Record<string, unknown> | null)?.trasaId === trasaId
    );

    return [...zaznamove, ...prihlaskoveProTutoTrasu]
      .sort((a, b) => b.cas.getTime() - a.cas.getTime())
      .map((p) => ({
        id: p.id,
        cas: p.cas.toISOString(),
        uzivatelId: p.uzivatelId,
        uzivatelJmeno: p.uzivatel?.jmeno ?? null,
        uzivatelEmail: p.uzivatel?.email ?? null,
        entita: p.entita,
        entitaId: p.entitaId,
        puvodniHodnota: p.puvodniHodnota as Record<string, unknown> | null,
        novaHodnota: p.novaHodnota as Record<string, unknown> | null,
      }));
  }
}
