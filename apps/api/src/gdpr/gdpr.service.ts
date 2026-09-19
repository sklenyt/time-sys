import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

const VYCHOZI_RETENCE_DNI = 730; // 2 roky, viz docs/08-security.md §8.7

/**
 * Ochrana osobních údajů (GDPR, docs/08-security.md §8.7) — právo na
 * výmaz a retenční politika. Přihláška se při anonymizaci maže celá
 * (jméno, kontakt, zdravotní poznámka), ale `zaznam_udalosti` zůstává —
 * jen se odpojí `prihlaska_id`, aby výsledky a audit log neztratily
 * integritu.
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private readonly prisma: PrismaService) {}

  async anonymizovatPrihlasku(trasaId: string, prihlaskaId: string, uzivatelId: string | null): Promise<void> {
    const prihlaska = await this.prisma.prihlaska.findFirst({ where: { id: prihlaskaId, trasaId } });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }

    await this.prisma.$transaction([
      this.prisma.zaznamUdalosti.updateMany({ where: { prihlaskaId }, data: { prihlaskaId: null } }),
      this.prisma.prihlaska.delete({ where: { id: prihlaskaId } }),
      this.prisma.auditLog.create({
        data: {
          uzivatelId,
          entita: "prihlaska",
          entitaId: prihlaskaId,
          // trasaId je uložené v JSON payloadu, protože audit_log nemá
          // vlastní sloupec — AuditLogService podle něj dohledává
          // anonymizace patřící ke konkrétní trati i po smazání přihlášky.
          puvodniHodnota: { trasaId, startovniCislo: prihlaska.startovniCislo },
          novaHodnota: { anonymizovano: true },
        },
      }),
    ]);
  }

  private retenceDni(): number {
    const env = process.env.GDPR_RETENCE_DNI;
    const parsed = env ? Number(env) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : VYCHOZI_RETENCE_DNI;
  }

  /** Jednou denně anonymizuje přihlášky u událostí starších než retenční lhůta. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async anonymizovatStareUdalosti(): Promise<void> {
    const hranice = new Date(Date.now() - this.retenceDni() * 24 * 60 * 60 * 1000);
    const stalePrihlasky = await this.prisma.prihlaska.findMany({
      where: { trasa: { udalost: { datum: { lt: hranice } } } },
      select: { id: true, trasaId: true },
    });
    for (const p of stalePrihlasky) {
      try {
        await this.anonymizovatPrihlasku(p.trasaId, p.id, null);
      } catch (err) {
        this.logger.warn(`Anonymizace přihlášky ${p.id} selhala: ${err}`);
      }
    }
    if (stalePrihlasky.length > 0) {
      this.logger.log(`GDPR retence: anonymizováno ${stalePrihlasky.length} přihlášek po ${this.retenceDni()} dnech.`);
    }
  }
}
