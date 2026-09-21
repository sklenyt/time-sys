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
- Pokud by v budoucnu bylo potřeba škálovat na víc instancí (velká akce, hodně souběžných diváků), `ResultsEventsService` musí nahradit skutečný pub/sub (Redis) — `docker-compose.yml` proto Redis záměrně **ne**obsahuje dopředu (nepoužívaná služba navíc), přidat ji zpátky až v okamžiku skutečné potřeby škálovat.
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

## 15.9 Hotové nasazovací artefakty (vlastní VPS/Docker varianta)

Pro §8.8 variantu 2 (vlastní VPS + Docker) jsou v repozitáři konkrétní, spustitelné soubory — ne jen popis:

- `apps/api/Dockerfile`, `apps/web/Dockerfile` — vícestupňový build, zrcadlí přesně sekvenci z `.github/workflows/ci.yml` (`npm ci` → build `@depo/shared` → `prisma generate` → build). `apps/web/Dockerfile` bere `VITE_API_URL` jako build-time `ARG` (Vite ho zapéká do statických souborů, nejde měnit za běhu kontejneru).
- `apps/web/nginx.conf` — SPA fallback (`try_files … /index.html`), jinak by reload na `/mereni/:id` apod. spadl na 404.
- `docker-compose.prod.yml` + `Caddyfile` — Postgres (jen pro tuhle variantu, u managed Postgre se ten blok smaže) + obě appky + Caddy s automatickým Let's Encrypt TLS (§8.8). Obsahuje pojmenovaný volume pro `apps/api/uploads` (fotodůkaz sporných doběhů, F41) — bez něj by fotky zmizely při každém redeploy, protože kontejnerový filesystem je jinak efemérní.
- `.env.prod.example` — kopírovat na `.env.prod` (je v `.gitignore`, nikdy necommitovat se skutečnými hodnotami) a doplnit produkční secrety podle §15.7.

**Neověřeno reálným `docker build`/`docker compose up`** — psáno a kontrolováno v sandboxovaném vývojovém prostředí bez přístupu k Docker daemonu. Než se použije naostro, projít aspoň jednou na vlastním VPS krok za krokem (komentář v hlavičce `docker-compose.prod.yml`) a případné drobnosti (verze base image, oprávnění na volume) doladit tam.

## 15.10 Zvolený hosting: Supabase (DB) + Fly.io (API/web)

Rozhodnuto pro provoz, kde appku sdílí víc organizátorů zároveň (multi-tenant, F24) — Supabase má proti Neon výhodu, že výchozí `postgres` role **není** superuser (žádný extra krok s vytvářením role navíc), a s víc organizátory na různých kalendářích závodů odpadá i riziko Supabase free-tier pauzy po 7 dnech nečinnosti (viz diskuze v chatu). Fly.io zůstává pro běh API + web, protože Supabase samo o sobě nehostuje libovolný Node.js proces — jen Postgres (+ volitelně Auth/Storage/Edge Functions, které appka nepoužívá).

### 15.10.1 Založení Supabase projektu (ruční krok — jen vlastník repozitáře)

1. Registrace na [supabase.com](https://supabase.com), **New project** — zvolit region blízko cílové skupiny (Frankfurt pro ČR/SK), nastavit silné DB heslo a **uložit ho stranou** (zobrazí se jen jednou).
2. Počkat na provision (pár minut), pak **Project Settings → Database → Connection string**. Appka běží jako jeden dlouhožijící proces na Fly.io (ne serverless funkce), takže na rozdíl od §15.2.1 **není potřeba** pooled (`:6543`/PgBouncer) connection string ani `directUrl` — stačí přímý connection string na portu `5432` pro `DATABASE_URL` i pro migrace.
3. **Ověřit, že role skutečně není superuser** (§8.9 kontrolní seznam, netýká se jen Neon) — připojit se `psql` (nebo Supabase **SQL Editor**) na ten connection string a spustit:
   ```sql
   SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
   ```
   **Reálně ověřeno (2026-09): `rolsuper = false`, ale `rolbypassrls = true`** — na rozdíl od původního předpokladu výše Supabase výchozí `postgres` roli `BYPASSRLS` **dává**. Je to samostatný příznak od `SUPERUSER` a stejně nebezpečný pro multi-tenant izolaci (§8.9) — appka na výchozí roli tiše obchází RLS mezi organizacemi. Řešení, stejné jako u Neonu (§15.2.1), potvrzené funkční:
   ```sql
   CREATE ROLE depo_app LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
   GRANT ALL PRIVILEGES ON DATABASE postgres TO depo_app;
   GRANT ALL ON SCHEMA public TO depo_app;
   ```
   Ověřit znovu tím samým dotazem pro `depo_app` — obě hodnoty musí být `false`. Teprve tuhle roli použít v `DATABASE_URL`, nikdy výchozí `postgres`.
4. Spustit migrace proti `DATABASE_URL` s rolí `depo_app` jednorázově z libovolného stroje s repem (potřeba `npm install` v rootu repa předem, aby `prisma` CLI existovalo lokálně):
   ```bash
   DATABASE_URL='postgresql://depo_app:HESLO@db.xxxxxxxxxxxx.supabase.co:5432/postgres' ./node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   ```
   Heslo v connection stringu drž na **jen písmena a číslice** — speciální znaky (`@`, `/`, `#`, `%`) je potřeba URL-kódovat, jinak parsing connection stringu tiše selže na chybnou autentizaci (P1000).

### 15.10.2 Nasazení API + web na Fly.io (ruční krok — jen vlastník repozitáře)

Appka už má hotový `apps/api/Dockerfile` a `apps/web/Dockerfile` (§15.9) — Fly.io je umí použít přímo, žádný nový Dockerfile navíc.

1. Nainstalovat `flyctl` (`curl -L https://fly.io/install.sh | sh`), `fly auth login`.
2. Pro API: `fly launch --dockerfile apps/api/Dockerfile --no-deploy` v rootu repa, zvolit jméno appky a region. `fly secrets set DATABASE_URL=... JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... PUBLISH_TARGET_ENC_KEY=... WEB_APP_URL=...` (hodnoty podle §15.7, `DATABASE_URL` ze Supabase výše), pak `fly deploy`.
3. Pro web: `fly launch --dockerfile apps/web/Dockerfile --no-deploy` v samostatné appce, `fly deploy --build-arg VITE_API_URL=https://<jméno-api-appky>.fly.dev/api/v1`.
4. Bez vlastní domény appky běží na přidělených `*.fly.dev` adresách (TLS řeší Fly.io automaticky) — vlastní doménu (§15.7 `WEB_APP_URL`) lze napojit později přes `fly certs add`, beze změny appky.

**Ověřeno reálným Fly.io/Supabase účtem** — postup výše byl reálně projitý (Supabase projekt, `depo_app` role, `prisma migrate deploy`, `fly launch`/`fly deploy`). Při prvním nasazení appka spadla do crash-loopu (`fly logs` → `Error loading shared library libssl.so.1.1`, `machine has reached its max restart count of 10`) — Prisma engine na holém `node:22-alpine` bez OpenSSL. Oprava (už promítnutá do `apps/api/Dockerfile` a `apps/api/prisma/schema.prisma` v tomhle repu): `RUN apk add --no-cache openssl` v obou stage a `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` v generátoru. Kdo appku nasazuje ze staršího clonu, musí si `git pull` tuhle opravu natáhnout před `fly deploy`.

### 15.10.3 Automatizace nasazení API přes GitHub Actions

`fly launch` vygeneruje `fly.toml` jen lokálně — nikdy se necommitne automaticky, takže CI o něm neví, dokud ho vlastník repozitáře sám nepřidá. Bez něj `deploy-api` job v `.github/workflows/ci.yml` nemá co nasadit.

**Jednorázové kroky, který musí udělat vlastník repozitáře (ne appka sama):**

1. Zkontrolovat, že `fly.toml` v rootu repa neobsahuje žádné tajemství (jen jméno appky, region, porty — hodnoty jako `DATABASE_URL` jdou přes `fly secrets set`, ne do `fly.toml`), pak ho commitnout a pushnout.
2. Vygenerovat deploy token: `fly tokens create deploy -x 999999h --app depo-time` (dlouhá platnost, jen pro CI).
3. V GitHubu → Settings → Secrets and variables → Actions přidat:
   - `FLY_API_TOKEN` — token z kroku 2.
   - `PROD_DATABASE_URL` — stejná hodnota jako `DATABASE_URL` v `fly secrets` (connection string s rolí `depo_app`, ne superuser/bootstrap role Supabase).

Od té chvíle `deploy-api` job (běží jen po zeleném `main`, po `build` a `api-tests`) sám spustí `prisma migrate deploy` proti Supabase a pak `flyctl deploy` — bez ručního zásahu z terminálu. Web na Cloudflare Pages se nasazuje automaticky už teď (vlastní integrace Cloudflare ↔ GitHub, mimo tenhle workflow).
