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

`.env` musí navíc obsahovat `PUBLISH_TARGET_ENC_KEY` — 32 bajtů (64 hex znaků) pro šifrování FTP/SFTP hesel, viz `.env.example`.

API poslouchá na `http://localhost:3000/api/v1`, zdravotní kontrola na `GET /api/v1/health`.

## Co je hotové (proof-of-concept vertikální řez)

Cílem téhle první verze je **ověřit, že celý řetězec funguje end-to-end na reálné Postgres databázi**, ne dodat kompletní business logiku ze všech dokumentů — to je práce na celou Fázi 1 ([`docs/10-roadmap.md`](../../docs/10-roadmap.md)).

- `POST /auth/register|login|refresh`, `GET /auth/me` — účty, JWT access (15 min) + refresh (30 dní) token (F18, F19)
- `POST /events/:eventId/roles`, `GET .../roles` — přiřazení role na události; první roli na události si smí přiřadit sám přihlášený uživatel (bootstrap ADMINa bez pozvánky), další role přiřazuje jen ADMIN
- `POST /organizations` — zakladatel se automaticky stává členem nové organizace (`uzivatel.organizace_id`), pokud ještě žádnou nemá; `GET /organizations` vrací jen organizaci přihlášeného uživatele, ne všechny
- `POST /events`, `GET /events`, `GET /events/:id` — založení události jen ve vlastní organizaci (`uzivatel.organizace_id` musí odpovídat `organizaceId` v těle požadavku), `GET /events` vrací jen události vlastní organizace. Vyžaduje jen přihlášení, ne konkrétní roli — na založení první události v organizaci ještě nemůže mít žádnou.
- `POST /events/:eventId/routes`, `POST /routes/:routeId/categories`, `POST /routes/:routeId/entries` — vyžadují roli `ADMIN`/`ORGANIZATOR` na dané události
- `PATCH /events/:eventId`, `PATCH /routes/:routeId` — úprava události/trasy (název, datum, počet kol, typ startu, `dokoncena`), stejná role jako založení. Přesun události mezi organizacemi nepodporováno.
- `DELETE /events/:eventId`, `DELETE /routes/:routeId` — trvalé smazání, stejná role jako založení. Vrátí `409 Conflict`, pokud událost/trasa obsahuje startovní listinu nebo záznamy měření (FK `RESTRICT` v Prisma schématu) — nejdřív je nutné smazat je, nejde tedy nechtěně zahodit odměřená data.
- `GET .../routes`, `GET .../categories`, `GET .../entries?search=` — startovní listina, **trasa a kategorie povinné** (F03)
- `POST /routes/:routeId/entries/import` — **import startovní listiny z CSV** (F04): multipart soubor v poli `soubor`, sloupce `cislo,prijmeni,jmeno,kategorie` (kód kategorie na trati) povinné, `rocnik,pohlavi,klub` volitelné. Chybný řádek se přeskočí a vrátí v `chyby`, zbytek souboru se naimportuje. Stejná role jako založení přihlášky.
- `POST /routes/:routeId/records` — **jádro systému**: zápis doběhu, idempotentní přes `klientEventId`, ukládá i nerozpoznané číslo (F06, F07). Vyžaduje roli `ADMIN`/`ORGANIZATOR`/`CASOMERIC`/`STANOVISTE` na dané události.
- `PATCH /routes/:routeId/records/:recordId/correct` — oprava startovního čísla se zachováním původního času (F08), zapisuje do `audit_log` (F09). Stejné role jako zápis.
- `GET /routes/:routeId/results` — **výpočet výsledků on-the-fly** (F12): pořadí celkové i po kategoriích, časová penalizace, DNS/DNF/DQ a nedoběhnutí v samostatné sekci `neklasifikovani`. Veřejné bez přihlášení (F16).
- `GET /routes/:routeId/results/export.xlsx` — **export výsledků do XLSX** (F13), stejná data jako `/results`, veřejné stejně jako ono.
- `POST/DELETE /routes/:routeId/start`, `GET/POST .../start-waves` — zahájení/zrušení startu vlny (UC5). U hromadného startu (`typStartu=HROMADNY`) se výchozí vlna založí automaticky při první přihlášce na trať, takže `POST .../start` funguje bez nutnosti cokoli zvlášť konfigurovat. Stejné role jako zápis měření, kromě `STANOVISTE` (start řídí jen `ADMIN`/`ORGANIZATOR`/`CASOMERIC`).
- `GET /routes/:routeId/running` — **"Kdo ještě běží / DNF"** (F10): přihlášení bez DNS/DNF/DQ, kteří ještě nemají doběh, s časem na trati od startu. Vyžaduje přihlášení (provozní přehled pro obsluhu, ne veřejná stránka jako výsledky).
- `POST/GET /events/:eventId/publish-targets`, `PATCH/DELETE/POST .../test`/`.../export-now` na `/publish-targets/:cilId` — **publikace výsledků na FTP/FTPS/SFTP** (F34–F37). Heslo se šifruje `PUBLISH_TARGET_ENC_KEY` (AES-256-GCM) a nikdy se nevrací v odpovědi. `.../test` skutečně naváže spojení a přihlásí se bez uploadu; `.../export-now` vyrenderuje statickou HTML stránku výsledků pro každou trasu události (`trasa.export_soubor_nazev`, výchozí `<id>.html`) a nahraje ji; `DELETE` trvale smaže cíl (bez omezení, žádná jiná entita na něj neodkazuje). Export se navíc spouští automaticky: ihned po každém zápisu měření pro cíle s `export_po_kazdem_zaznamu=true`, a jednou za minutu plánovačem (`PublishSchedulerService`) pro cíle, kterým uplynul `interval_minut`. Obojí běží fire-and-forget — chyba exportu nikdy neovlivní odpověď na zápis měření. Vyžaduje roli `ADMIN`/`ORGANIZATOR`.

Ověřeno end-to-end (viz commit): registrace/přihlášení → založení organizace → událost → bootstrap role ADMIN → trasa → kategorie → přihláška → start → zápis doběhu → oprava záznamu → výpočet výsledků → idempotentní opakování zápisu. Ověřeno i záporně: neautentizovaný požadavek na kterýkoli z výše uvedených zápisů dostane 401, pokus založit událost v cizí organizaci 403, a `GET /organizations` cizí organizaci nikdy nevrátí. FTP export ověřen proti reálnému lokálnímu FTP serveru (pyftpdlib) — úspěšné i neúspěšné přihlášení, ruční export, automatický export po zápisu měření a automatický export naplánovaným intervalem, vše se souborem skutečně nahraným na disk serveru. Mazání ověřeno včetně negativních případů — smazání trasy/události se startovní listinou vrací `409 Conflict` a data zůstanou zachována, smazání prázdné entity/publikačního cíle vrací `204` a následné čtení `404`.

## Co chybí (další práce ve Fázi 1/2, ne bug)

- Mezičasy na kontrolních stanovištích (`typUdalosti=MEZICAS`).
- `/sync/events` offline-first synchronizace ([`docs/03-architecture.md §3.5`](../../docs/03-architecture.md)) — teď je jen jeden přímý zápis přes REST, ne offline fronta.
- Export výsledků do PDF (F13) — jen XLSX zatím hotové.
- RFID (F22).
