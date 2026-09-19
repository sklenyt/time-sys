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

- `POST /auth/register|login|refresh`, `GET /auth/me` — účty, JWT access (15 min) + refresh (30 dní) token (F18, F19)
- `POST /events/:eventId/roles`, `GET .../roles` — přiřazení role na události; první roli na události si smí přiřadit sám přihlášený uživatel (bootstrap ADMINa bez pozvánky), další role přiřazuje jen ADMIN
- `POST /events`, `GET /events`, `GET /events/:id` — založení události
- `POST /events/:eventId/routes`, `GET .../routes` — trasy
- `POST /routes/:routeId/categories` — kategorie
- `POST /routes/:routeId/entries`, `GET .../entries?search=` — startovní listina, **trasa a kategorie povinné** (F03)
- `POST /routes/:routeId/records` — **jádro systému**: zápis doběhu, idempotentní přes `klientEventId`, ukládá i nerozpoznané číslo (F06, F07). Vyžaduje roli `ADMIN`/`ORGANIZATOR`/`CASOMERIC`/`STANOVISTE` na dané události.
- `PATCH /routes/:routeId/records/:recordId/correct` — oprava startovního čísla se zachováním původního času (F08), zapisuje do `audit_log` (F09). Stejné role jako zápis.
- `GET /routes/:routeId/results` — **výpočet výsledků on-the-fly** (F12): pořadí celkové i po kategoriích, časová penalizace, DNS/DNF/DQ a nedoběhnutí v samostatné sekci `neklasifikovani`. Veřejné bez přihlášení (F16).

Ověřeno end-to-end (viz commit): registrace/přihlášení → založení organizace → událost → bootstrap role ADMIN → trasa → kategorie → přihláška → zápis doběhu → oprava záznamu → výpočet výsledků → idempotentní opakování zápisu.

**Rozsah RBAC v této fázi:** chráněný je jen zápis/oprava měření (nejcitlivější operace, jádro F06/F08). Správa organizace/události/tratě/startovní listiny je zatím veřejná (bootstrap krok bez existujícího uživatele) — rozšíření RBAC i na tyto endpointy je následující krok, ne bezpečnostní díra v aktuálním rozsahu MVP.

## Co chybí (další práce ve Fázi 1/2, ne bug)

- RBAC na správě organizace/události/tratě/startovní listiny (zatím veřejné).
- `POST /routes/:id/start`, mezičasy na stanovištích — bez toho výsledky ukazují běžce jako neklasifikované (chybí `start_vlna.cas_startu`).
- `/sync/events` offline-first synchronizace ([`docs/03-architecture.md §3.5`](../../docs/03-architecture.md)) — teď je jen jeden přímý zápis přes REST, ne offline fronta.
- `kdo_bezi_view` ([`docs/04-data-model.md §4.5`](../../docs/04-data-model.md)), export výsledků do XLSX (F13).
- FTP/SFTP export (F34–F37), RFID (F22).
- Šifrování `publikacni_cil.heslo_sifrovane` (teď je ve schématu jen sloupec, bez šifrovací vrstvy).
