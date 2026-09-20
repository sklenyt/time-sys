# 15. Produkční nasazení databáze a API

Doplňuje [§3.7](03-architecture.md#37-nasazení-deployment) (deployment obecně) a [§8.8](08-security.md#88-nasazení-httpstls--konkrétní-kroky)/[§8.9](08-security.md#89-kritický-požadavek-pro-multi-tenant-row-level-security-f24) (TLS, RLS role) — tady je konkrétní kontrolní seznam pro spuštění PostgreSQL a API mimo lokální `docker-compose.yml`, včetně use case, který dosud nebyl nikde explicitně sepsaný: **přepínání mezi zařízeními (telefon ↔ tablet ↔ notebook) uprostřed závodu**.

## 15.1 Jedna věta shrnutí

Lokální `docker-compose.yml` (Postgres + Redis, dev credentials) je jen pro vývoj. Do produkce appka potřebuje: (1) spravovaný PostgreSQL s neprivilegovanou aplikační rolí (§8.9), (2) přesně **jednu** běžící instanci API (§15.4), (3) HTTPS před oběma appkami (§8.8), a (4) `X-Accel-Buffering: no` na SSE endpointu, pokud běží za nginx-like proxy (§15.5, opraveno).

## 15.2 Managed PostgreSQL — na co se ptát u poskytovatele

Appka potřebuje jen běžnou PostgreSQL 15+ s možností založit vlastní neprivilegovanou roli (kvůli RLS, §8.9) — žádná exotická rozšíření. Reálné možnosti podle rozpočtu:

| Varianta | Kdy dává smysl | Past |
|---|---|---|
| **Neon / Supabase** (serverless Postgres) | Malý/střední provoz, chceš platit jen za to, co se použije | Výchozí connection string často vede přes **PgBouncer v transaction módu** — Prisma Migrate to nezvládne (viz §15.2.1) |
| **Railway / Render Postgres** | Chceš mít API i DB na jedné platformě, jednoduché nastavení | Bootstrap uživatel je typicky superuser — nutná samostatná role (§8.9) |
| **AWS RDS / DigitalOcean Managed DB** | Větší provoz, potřeba víc kontroly (PITR, replikace) | Dražší, víc konfigurace (VPC, security groups) |
| **Vlastní VPS + Postgres v Dockeru** | Nejlevnější, plná kontrola | Zálohy a HA si musíš vyřešit sám |

Ve všech případech platí kontrolní seznam z §8.9 (appka se **nesmí** připojovat rolí se `SUPERUSER`/`BYPASSRLS`).

### 15.2.1 Connection pooling a Prisma Migrate

Pokud poskytovatel dá connection string přes PgBouncer (transaction pooling mode — časté u Neon/Supabase), `prisma migrate deploy` na něm typicky selže (chybí podpora prepared statements na úrovni session, kterou migrace používají). Řešení, až na to dojde:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — používá běžící appka
  directUrl = env("DIRECT_URL")     // přímé spojení — jen pro `prisma migrate deploy`
}
```

`DATABASE_URL` pak ukazuje na pooled port (u Supabase např. `:6543` s `?pgbouncer=true`), `DIRECT_URL` na přímý port (`:5432`). **Tohle se nepřidává preventivně** — dokud appka běží proti jedné neschovávané Postgres instanci (lokální dev, VPS, RDS bez poolingu), `directUrl` je zbytečná a jen by vyžadovala nastavit `DIRECT_URL` i tam, kde je zbytečné (dev, CI). Přidat až ve chvíli, kdy se skutečně zvolí pooled poskytovatel.

### 15.2.2 Zálohy

Minimum pro ostrý provoz: denní automatický snapshot + možnost point-in-time recovery aspoň pár dní zpět (většina managed platforem tohle nabízí v základu, u vlastního VPS řeší `pg_dump` na cron + upload do object storage). GDPR retenční mazání (`GDPR_RETENCE_DNI`, §8.7) běží nezávisle na zálohách — zálohy slouží pro havárii, ne pro GDPR compliance.

## 15.3 Migrace v CI/CD

`prisma migrate deploy` (ne `migrate dev`) proti produkční `DATABASE_URL`/`DIRECT_URL` jako samostatný krok nasazení, spuštěný aplikační rolí (§8.9) — stejný princip jako `.github/workflows/ci.yml` už dělá proti CI databázi. Nikdy nespouštět migrace z appky samotné při startu (race condition při více instancích/restartech).

## 15.4 Kolik instancí API? Přesně jedna.

Živé výsledky (F16, SSE) běží přes in-process `Subject` (`apps/api/src/results/results-events.service.ts`), ne přes Redis pub/sub — to je vědomé zjednodušení pro MVP, zdokumentované přímo v kódu. Důsledek: **při více než jedné běžící instanci API za load balancerem by SSE klienti připojení na instanci A nikdy neuviděli změnu, kterou zapsala instance B** — živé výsledky by se pro část diváků tiše přestaly aktualizovat (fungoval by jen `GET /results` fallback, tj. nutnost ručně obnovit stránku).

- **Pro komunitní závod (řádově desítky až stovky souběžných diváků) jedna instance stačí** — NestJS/Node zvládne tohle zatížení bez problémů, žádná akce není potřeba.
- Pokud by v budoucnu bylo potřeba škálovat na víc instancí (velká akce, hodně souběžných diváků), `ResultsEventsService` musí nahradit skutečný pub/sub (Redis — proto ho `docker-compose.yml` už má připravený, i když ho appka zatím nepoužívá). Do té doby je `redis` služba v `docker-compose.yml` čistě rezerva pro budoucí škálování, appka na ni dnes nijak nesahá.
- Toto omezení se **netýká** databáze/migrací/autentizace — jen realtime SSE vrstvy. Víc instancí by jinak fungovalo správně (stateless JWT auth, sdílená Postgres jako zdroj pravdy).

## 15.5 Reverzní proxy a SSE (opraveno)

Nginx (a řada managed platforem, které ho používají pod kapotou) defaultně bufferuje proxované odpovědi — u SSE streamu (`GET /routes/:id/results/live`) by to znamenalo, že klient dostane živé updaty se zpožděním nebo vůbec, dokud se spojení neuzavře, přestože lokálně (bez proxy) je vše v pořádku. Endpoint teď posílá `X-Accel-Buffering: no` a `Cache-Control: no-cache` (`apps/api/src/results/results.controller.ts`), takže nginx buffering pro tuhle cestu vypne automaticky. U jiné proxy (Caddy, Traefik) buffering u streamovaných odpovědí typicky není problém vůbec, hlavička nijak neškodí.

Zbytek TLS/reverzní proxy nastavení (Caddy vs. nginx+certbot, `trust proxy`) viz [§8.8](08-security.md#88-nasazení-httpstls--konkrétní-kroky) — tady se nic nemění.

## 15.6 CORS — proč `cors: true` a ne omezený origin

`apps/api/src/main.ts` má vědomě `cors: true` (odráží libovolný origin). API používá výhradně Bearer token (žádné cookies), takže chybějící ambientní přihlašovací údaje dělají CORS restrikci jako obranu proti CSRF zbytečnou — útočníkova stránka nemá jak platný token získat jen tím, že si prohlížeč sám pošle cookie. Omezení na konkrétní `WEB_APP_URL` origin by přidalo jen defense-in-depth proti scénáři, kdy token unikne jinou cestou (XSS) — momentálně to není blokující položka pro nasazení, ale dá se dodat později přidáním `origin: process.env.WEB_APP_URL` do `NestFactory.create` bez dalších závislostí.

## 15.7 Environment proměnné — produkční checklist

Viz `apps/api/.env.example` pro plný seznam s komentáři. Nejdůležitější rozdíly oproti dev hodnotám:

- `DATABASE_URL` — aplikační role bez `SUPERUSER`/`BYPASSRLS` (§8.9), ne dev `depo`/`depo_dev_password`.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PUBLISH_TARGET_ENC_KEY` — skutečné náhodné hodnoty (`.env.example` má návod přímo v komentáři), nikdy `change-me`/`0`×64 z testovacího `env-setup.ts`.
- `WEB_APP_URL` — musí být veřejná HTTPS adresa PWA (ne `localhost:5173`), jinak QR kódy na startovních číslech (F33) povedou na nedostupnou adresu.
- `SMTP_*` — bez nich e-mailová oznámení o doběhu (F32) jen tiše neproběhnou (nekritická cesta), ale pro produkci je smysluplné je nastavit.
- `apps/web`: `VITE_API_URL` musí ukazovat na veřejnou HTTPS adresu API (buildne se do statických souborů, nejde měnit za běhu — změna vyžaduje nový build).

## 15.8 Use case: přepínání mezi zařízeními uprostřed závodu

Tohle **dnes už funguje architektonicky**, jakmile jsou API+DB dostupné z internetu (ne jen `localhost`/LAN):

- Offline fronta (IndexedDB, `apps/web/src/lib/offline-queue.ts`) je lokální nárazník pro výpadek signálu na jednom zařízení, ne zámek vážící data k tomu zařízení. Identita zařízení (`zarizeniId`) slouží jen k rozlišení "vlastní/cizí" zápis pro detekci kolizí stanovišť (§3.5), ne jako autentizace.
- Přihlášení je JWT účet (`POST /auth/login`), nezávislé na zařízení — libovolné zařízení s prohlížečem a stejnými přihlašovacími údaji vidí stejnou trať.
- `Měření.tsx` po každém sync cyklu stahuje "poslední zápisy" ze serveru; zápisy z jiných zařízení se zobrazí jako "z jiného zařízení" (`puvod === "CIZI"`) — viditelnost napříč zařízeními je vestavěná, ne dodatečná.

Co je potřeba, aby tohle fungovalo i mimo jednu Wi-Fi síť (různé mobilní sítě, různá místa v cíli), a ne jen na `localhost`:

1. **API a Postgres dostupné z internetu** přes HTTPS (§15.2, §8.8) — bez toho druhé zařízení na jiné síti nemá jak appku vůbec kontaktovat.
2. **`VITE_API_URL` buildnutá na veřejnou adresu** (§15.7) — jinak appka na druhém zařízení míří na `localhost`, který tam nic neobsahuje.
3. Realtime omezení z §15.4 (jedna instance API) tady nevadí — přepnutí zařízení nezávisí na SSE, jen na tom, že obě zařízení čtou/píšou do stejné sdílené Postgres.

Jinými slovy: multi-device provoz je vedlejší efekt toho, že appka je od základu server-authoritative SaaS (ne desktopová appka s lokálním souborem) — jediné, co dnes chybí, je samotné nasazení mimo `localhost` podle bodů §15.1–§15.6 výše.
