-- Multi-tenant Row-Level Security (F24, Fáze 4).
--
-- Defense-in-depth on top of the existing application-layer isolation
-- (every service already scopes queries by organizace_id/uzivatel.organizace_id,
-- see docs/04-data-model.md §4.6). This adds a second, database-level
-- guarantee: even a buggy WHERE clause in application code can never
-- return or mutate another organization's rows.
--
-- Policy shape: permissive when app.current_org is unset (NULL/empty) —
-- that's the case for public/unauthenticated requests (results, live
-- results, embed widget, kiosk, public registration) and for
-- system/cron jobs (GDPR retention) that intentionally operate across
-- all tenants. Restrictive only when app.current_org IS set (an
-- authenticated request) and doesn't match the row's organization.
--
-- FORCE ROW LEVEL SECURITY is required because the app's own database
-- role owns these tables (it ran the migrations) — by default Postgres
-- exempts table owners from RLS, which would make the policies below a
-- no-op for the one role that actually needs them.

-- Poznámka: id sloupce jsou Prisma @default(uuid()) uložené jako `text`,
-- ne nativní PostgreSQL typ `uuid` — parametry proto musí být text, jinak
-- `u.id = target_udalost_id` selže na "operator does not exist: text = uuid".
CREATE OR REPLACE FUNCTION app_tenant_ok(target_udalost_id text) RETURNS boolean AS $$
  SELECT current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR EXISTS (
      SELECT 1 FROM udalost u
      WHERE u.id = target_udalost_id
        AND u.organizace_id = current_setting('app.current_org', true)
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_tenant_ok_via_trasa(target_trasa_id text) RETURNS boolean AS $$
  SELECT current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR EXISTS (
      SELECT 1 FROM trasa t
      JOIN udalost u ON u.id = t.udalost_id
      WHERE t.id = target_trasa_id
        AND u.organizace_id = current_setting('app.current_org', true)
    );
$$ LANGUAGE sql STABLE;

ALTER TABLE organizace ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizace FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizace
  USING (
    current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR id::text = current_setting('app.current_org', true)
  );

ALTER TABLE udalost ENABLE ROW LEVEL SECURITY;
ALTER TABLE udalost FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON udalost
  USING (
    current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR organizace_id::text = current_setting('app.current_org', true)
  );

ALTER TABLE trasa ENABLE ROW LEVEL SECURITY;
ALTER TABLE trasa FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON trasa USING (app_tenant_ok(udalost_id));

ALTER TABLE kategorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategorie FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kategorie USING (app_tenant_ok_via_trasa(trasa_id));

ALTER TABLE start_vlna ENABLE ROW LEVEL SECURITY;
ALTER TABLE start_vlna FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON start_vlna USING (app_tenant_ok_via_trasa(trasa_id));

ALTER TABLE prihlaska ENABLE ROW LEVEL SECURITY;
ALTER TABLE prihlaska FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON prihlaska USING (app_tenant_ok_via_trasa(trasa_id));

ALTER TABLE zaznam_udalosti ENABLE ROW LEVEL SECURITY;
ALTER TABLE zaznam_udalosti FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON zaznam_udalosti USING (app_tenant_ok_via_trasa(trasa_id));

ALTER TABLE publikacni_cil ENABLE ROW LEVEL SECURITY;
ALTER TABLE publikacni_cil FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON publikacni_cil USING (app_tenant_ok(udalost_id));
