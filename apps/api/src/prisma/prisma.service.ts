import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { tenantContext } from "../common/tenant-context";

/**
 * Modely chráněné multi-tenant Row-Level Security politikami (F24, Fáze 4,
 * viz migrace `add_multi_tenant_rls` a docs/04-data-model.md §4.6).
 * `Uzivatel`/`UzivatelRole`/`Zarizeni`/`AuditLog`/`Cip` záměrně vynechány —
 * autentizační a zařízení-orientované tabulky bez přímé/nepřímé vazby na
 * organizaci přes `udalost`, nebo (u AuditLog) s proměnlivou entitou, kde
 * by jednotné omezení bylo zavádějící; izolace tam zůstává jen na
 * aplikační vrstvě jako dosud.
 */
const TENANT_SCOPED_MODELS = new Set([
  "Organizace",
  "Udalost",
  "Trasa",
  "Kategorie",
  "StartVlna",
  "Prihlaska",
  "ZaznamUdalosti",
  "PublikacniCil",
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    // Promítne per-request organizace_id (viz TenantContextInterceptor) do
    // session proměnné, kterou čtou RLS politiky. `runInTransaction` značí,
    // že volající kód (zatím jen GdprService) už sám řídí vlastní
    // transakci — tam se nevnořuje další, volající si `set_config` nastaví
    // sám, pokud ho potřebuje.
    this.$use(async (params, next) => {
      if (params.runInTransaction) return next(params);
      if (!params.model || !TENANT_SCOPED_MODELS.has(params.model)) return next(params);
      const organizaceId = tenantContext.getStore();
      if (!organizaceId) return next(params);

      return this.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_org', ${organizaceId}, true)`;
        const model = params.model!.charAt(0).toLowerCase() + params.model!.slice(1);
        return (tx as unknown as Record<string, Record<string, (args: unknown) => unknown>>)[model][params.action](
          params.args
        );
      });
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
