# @depo/api

Backend Depo — NestJS + Prisma + PostgreSQL, podle [`docs/05-tech-stack.md`](../../docs/05-tech-stack.md), [`docs/04-data-model.md`](../../docs/04-data-model.md) a [`docs/06-api-design.md`](../../docs/06-api-design.md).

## Spuštění lokálně

```bash
# 1. Postgres (buď docker compose z kořene repa, nebo vlastní lokální instance)
docker compose up -d postgres

# 2. Proměnné prostředí
cp .env.example .env   # uprav DATABASE_URL, pokud neběží přes docker-compose

# 3. Instalace a migrace (spouštět z kořene repa kvůli workspaces)
npm install
npm run build --workspace=@depo/shared
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma

# 4. Běh
npm run dev:api
```

API poslouchá na `http://localhost:3000/api/v1`, zdravotní kontrola na `GET /api/v1/health`.

## Co je hotové (proof-of-concept vertikální řez)

Cílem téhle první verze je **ověřit, že celý řetězec funguje end-to-end na reálné Postgres databázi**, ne dodat kompletní business logiku ze všech dokumentů — to je práce na celou Fázi 1 ([`docs/10-roadmap.md`](../../docs/10-roadmap.md)).

- `POST /events`, `GET /events`, `GET /events/:id` — založení události
- `POST /events/:eventId/routes`, `GET .../routes` — trasy
- `POST /routes/:routeId/categories` — kategorie
- `POST /routes/:routeId/entries`, `GET .../entries?search=` — startovní listina, **trasa a kategorie povinné** (F03)
- `POST /routes/:routeId/records` — **jádro systému**: zápis doběhu, idempotentní přes `klientEventId`, ukládá i nerozpoznané číslo (F06, F07)

Ověřeno end-to-end (viz commit): založení organizace → událost → trasa → kategorie → přihláška → zápis doběhu → výpočet časů → idempotentní opakování zápisu.

## Co chybí (další práce ve Fázi 1/2, ne bug)

- Autentizace/RBAC (F18, F19) — endpointy teď nejsou chráněné.
- `POST /routes/:id/start`, mezičasy na stanovištích, oprava záznamu (`/records/:id/correct`).
- `/sync/events` offline-first synchronizace ([`docs/03-architecture.md §3.5`](../../docs/03-architecture.md)) — teď je jen jeden přímý zápis přes REST, ne offline fronta.
- Odvozené pohledy `vysledky_view`, `kdo_bezi_view` ([`docs/04-data-model.md §4.5`](../../docs/04-data-model.md)).
- FTP/SFTP export (F34–F37), RFID (F22).
- Šifrování `publikacni_cil.heslo_sifrovane` (teď je ve schématu jen sloupec, bez šifrovací vrstvy).
