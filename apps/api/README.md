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

`.env` musí navíc obsahovat `PUBLISH_TARGET_ENC_KEY` — 32 bajtů (64 hex znaků) pro šifrování FTP/SFTP hesel i citlivých osobních údajů přihlášky, a volitelně `GDPR_RETENCE_DNI` (výchozí 730), viz `.env.example`.

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
- `POST /routes/:routeId/records` — **jádro systému**: zápis doběhu, idempotentní přes `klientEventId`, ukládá i nerozpoznané číslo (F06, F07). Volitelné `typUdalosti` (`DOJEZD`, výchozí, nebo `MEZICAS` na kontrolním stanovišti — F17); mezičas se nepočítá do výsledků a nevyvolává kolizní detekci. Vyžaduje roli `ADMIN`/`ORGANIZATOR`/`CASOMERIC`/`STANOVISTE` na dané události.
- `PATCH /routes/:routeId/records/:recordId/correct` — oprava startovního čísla se zachováním původního času (F08), zapisuje do `audit_log` (F09). Stejné role jako zápis.
- `GET /routes/:routeId/records/conflicts`, `PATCH .../records/:recordId/resolve` — kolize stanovišť (F15, `stav=NEEDS_REVIEW`) k ručnímu potvrzení organizátorem; `resolve` jen vyčistí příznak, nic nemaže ani nepřepisuje. Stejné role jako zápis.
- `POST/GET /routes/:routeId/sync/events` — **offline synchronizace** (F15, [03-architecture.md §3.5](../../docs/03-architecture.md#35-synchronizační-strategie-nejkritičtější-technické-rozhodnutí)). `POST` přijme dávku eventů z lokální fronty jednoho zařízení (`{ zarizeniId, events: [{ klientEventId, startovniCislo, klientCas, typUdalosti? }] }`) a zpracuje každý stejnou cestou jako `POST /records` (idempotence, detekce kolize, `typUdalosti` DOJEZD/MEZICAS). `GET ?zarizeniId=&since=` vrátí eventy od JINÝCH zařízení na téže trati vzniklé po `since` (kurzor `prijato_server_at`, zahrnuje DOJEZD/OPRAVA/MEZICAS) — vlastní eventy volajícího zařízení se nevrací, to už má lokálně. Kolize stanovišť: druhý DOJEZD stejné přihlášky z jiného zařízení do 15 minut od prvního dostane `stav=NEEDS_REVIEW` (viz výše), zatímco další kolo z téhož zařízení nebo jakýkoli MEZICAS zůstává `OK` — nic se nezahazuje. Stejné role jako zápis měření.
- `GET /routes/:routeId/results` — **výpočet výsledků on-the-fly** (F12): pořadí celkové i po kategoriích, časová penalizace, DNS/DNF/DQ a nedoběhnutí v samostatné sekci `neklasifikovani`. Veřejné bez přihlášení (F16).
- `GET /routes/:routeId/results/live` — **živé výsledky přes Server-Sent Events** (F16, [03-architecture.md §3.6](../../docs/03-architecture.md)), veřejné jako `/results`. Pošle aktuální stav hned po připojení a znovu po každém DOJEZD/OPRAVA zápisu (debounce 300 ms); realtime vrstva je doplněk — bez SSE klient dostane totéž přes `GET /results`.
- `GET /routes/:routeId/results/export.xlsx`/`export.pdf` — **export výsledků do XLSX/PDF** (F13), stejná data jako `/results`, veřejné stejně jako ono. PDF (`pdfkit`) vkládá vlastní font `apps/api/src/assets/fonts/LiberationSans-{Regular,Bold}.ttf` (SIL OFL, licence v témže adresáři) — vestavěné fonty PDFKitu (Helvetica) umí jen WinAnsi a bez vlastního TTF by česká diakritika (ř, č, š, ě…) vyšla zkomolená.
- `POST/DELETE /routes/:routeId/start`, `GET/POST .../start-waves` — zahájení/zrušení startu vlny (UC5). U hromadného startu (`typStartu=HROMADNY`) se výchozí vlna založí automaticky při první přihlášce na trať, takže `POST .../start` funguje bez nutnosti cokoli zvlášť konfigurovat. Stejné role jako zápis měření, kromě `STANOVISTE` (start řídí jen `ADMIN`/`ORGANIZATOR`/`CASOMERIC`).
- `GET /routes/:routeId/running` — **"Kdo ještě běží / DNF"** (F10): přihlášení bez DNS/DNF/DQ, kteří ještě nemají doběh, s časem na trati od startu. Vyžaduje přihlášení (provozní přehled pro obsluhu, ne veřejná stránka jako výsledky).
- `POST/GET /events/:eventId/publish-targets`, `PATCH/DELETE/POST .../test`/`.../export-now` na `/publish-targets/:cilId` — **publikace výsledků na FTP/FTPS/SFTP, více souběžných cílů, vlastní šablony** (F34–F37). Heslo se šifruje `PUBLISH_TARGET_ENC_KEY` (AES-256-GCM) a nikdy se nevrací v odpovědi. `.../test` skutečně naváže spojení a přihlásí se bez uploadu; `.../export-now` vyrenderuje statickou HTML stránku výsledků pro každou trasu události (`trasa.export_soubor_nazev`, výchozí `<id>.html`) a nahraje ji; `DELETE` trvale smaže cíl (bez omezení, žádná jiná entita na něj neodkazuje). `htmlSablona` může být buď jednoduchá hlavička (vloží se před výchozí tabulku, F34), nebo — pokud obsahuje značku jako `{{TABULKA_VYSLEDKU}}` — celá vlastní stránka s vlastním brandingem (F37); podporované značky: `{{NAZEV_TRASY}}`, `{{TABULKA_VYSLEDKU}}`, `{{RADKY_VYSLEDKU}}`, `{{POCET_KLASIFIKOVANYCH}}`, `{{AKTUALIZOVANO}}`. Export se navíc spouští automaticky: ihned po každém zápisu měření pro cíle s `export_po_kazdem_zaznamu=true`, a jednou za minutu plánovačem (`PublishSchedulerService`) pro cíle, kterým uplynul `interval_minut`. Obojí běží fire-and-forget — chyba exportu nikdy neovlivní odpověď na zápis měření. Vyžaduje roli `ADMIN`/`ORGANIZATOR`.
- `GET /routes/:routeId/audit-log` — **auditní log s filtrováním** (`?uzivatelId=`/`?od=`/`?do=`), zahrnuje opravy záznamů (F09) i GDPR anonymizace přihlášek. Vyžaduje roli `ADMIN`/`ORGANIZATOR`.
- `DELETE /routes/:routeId/entries/:entryId` — **GDPR právo na výmaz** (F31, [08-security.md §8.7](../../docs/08-security.md)): smaže přihlášku celou (jméno, kontakt, zdravotní poznámka), ale `zaznam_udalosti` zůstává s odpojeným `prihlaska_id`, aby výsledky a audit log neztratily integritu. Zapisuje do `audit_log`. Stejná role jako založení přihlášky. Tatáž logika běží i automaticky jednou denně (`GdprService.anonymizovatStareUdalosti`) pro přihlášky u událostí starších než `GDPR_RETENCE_DNI`.

Ověřeno end-to-end (viz commit): registrace/přihlášení → založení organizace → událost → bootstrap role ADMIN → trasa → kategorie → přihláška → start → zápis doběhu → oprava záznamu → výpočet výsledků → idempotentní opakování zápisu. Ověřeno i záporně: neautentizovaný požadavek na kterýkoli z výše uvedených zápisů dostane 401, pokus založit událost v cizí organizaci 403, a `GET /organizations` cizí organizaci nikdy nevrátí. FTP export ověřen proti reálnému lokálnímu FTP serveru (pyftpdlib) — úspěšné i neúspěšné přihlášení, ruční export, automatický export po zápisu měření a automatický export naplánovaným intervalem i vlastní šablona s vlastním brandingem, vše se souborem skutečně nahraným na disk serveru. Mazání ověřeno včetně negativních případů — smazání trasy/události se startovní listinou vrací `409 Conflict` a data zůstanou zachována, smazání prázdné entity/publikačního cíle vrací `204` a následné čtení `404`. Sync engine ověřen dvěma nezávislými prohlížečovými kontexty (= dvěma zařízeními) zapisujícími offline: po obnovení připojení každé do pár sekund uvidí i zápis toho druhého; skutečná kolize (stejná přihláška, jiné zařízení, do 15 min) je správně označena `NEEDS_REVIEW` a jde ručně potvrdit, aniž by se cokoli ztratilo. MEZICAS ověřen zvlášť: dvě různá zařízení nezávisle zapsala mezičas pro stejné číslo bez `NEEDS_REVIEW`, výsledky zůstaly beze změny. Živé výsledky ověřeny reálným SSE spojením (`curl -N`) — zápis z jednoho klienta se okamžitě promítl do otevřeného streamu druhého. GDPR ověřeno: citlivá pole uložená v Postgres jsou skutečně ciphertext (ověřeno přímým dotazem do DB), API je vrací dešifrovaná; `DELETE .../entries/:id` smaže řádek přihlášky (ověřeno `SELECT count(*)`), zápis v audit logu zůstává dohledatelný i po smazání; retenční úloha spuštěná přímo přes `NestFactory.createApplicationContext` správně anonymizovala jen přihlášky u uměle vytvořené staré události, aktuální data nechala beze změny.

## Co chybí (práce ve Fázi 4, ne bug — Fáze 1, 2 i 3 jsou hotové, viz `docs/10-roadmap.md`)

- RFID (F22, Fáze 4).
- Fotofiniš/video záznam sporných doběhů (F41) — vyžaduje kamerový hardware, vyjmuto z Fáze 3 do Fáze 4.
