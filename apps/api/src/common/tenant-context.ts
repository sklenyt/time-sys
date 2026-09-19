import { AsyncLocalStorage } from "async_hooks";

/**
 * Per-request organizace_id nesená přes AsyncLocalStorage (F24, Fáze 4).
 * `TenantContextInterceptor` ji nastaví z přihlášeného uživatele,
 * `PrismaService` ji čte a promítá do session proměnné `app.current_org`
 * pro Row-Level Security politiky (docs/04-data-model.md §4.6).
 *
 * Prázdný store (žádný běžící request context, nebo neautentizovaný/
 * veřejný request) znamená "bez omezení" — RLS politiky jsou navržené
 * jako permissive, když `app.current_org` není nastaveno, aby veřejné
 * stránky (výsledky, embed, kiosek, registrace) i systémové úlohy (GDPR
 * retence) fungovaly beze změny napříč všemi organizacemi.
 */
export const tenantContext = new AsyncLocalStorage<string | null>();
