# 10. Fázovaná roadmapa

Fáze navazují na cíle architektury ([03-architecture.md §3.1](03-architecture.md)) a jsou seřazené tak, aby po každé fázi existoval **použitelný přírůstek**, ne jen rozpracovaný celek. Odhady jsou orientační pro malý tým (1–2 vývojáři + konzultace s organizátorem).

## Fáze 0 — Návrh (hotovo)

| Položka | Stav |
|---|---|
| Návrh architektury, datového modelu, API, UI mockupů | ✅ tento dokumentační balík |
| Grafická identita Depo (logo, barvy, typografie) | ✅ [14-graficka-identita.md](14-graficka-identita.md) |
| Validace návrhu s organizátorem (uživatelský feedback na mockupy a workflow) | ⏳ další krok — viz §10.5 |

## Fáze 1 — Základní kostra a MVP jádro

Cíl: nahradit **nejkritičtější denní use case** — samotné měření na jedné trati na jednom zařízení.

- ✅ Monorepo, sdílené typy (`@depo/shared`), NestJS + Prisma API, Vite + React PWA frontend s Depo identitou — ověřeno end-to-end (organizace → akce → trať → kategorie → přihláška → záznam měření)
- ✅ **Autentizace a základní RBAC** (F18, F19) — JWT access/refresh, `POST /auth/register|login|refresh`, role vázaná na konkrétní událost (`uzivatel_role`), bootstrap prvního ADMINa události bez nutnosti pozvánky, viz [08-security.md](08-security.md). Zatím vynuceno jen na zápisu/opravě měření (`RecordsController`) — RBAC na správě tratí/startovní listiny je následující krok.
- ✅ **Oprava záznamu se zachováním času** (F08) — `PATCH /routes/:id/records/:recordId/correct`, nový řádek `typ_udalosti=OPRAVA` odkazující na původní přes `nahrazuje_zaznam_id`, čas se nikdy nemění
- ✅ **Základní auditní log** (F09) — `audit_log` záznam s `puvodni_hodnota`/`nova_hodnota` při každé opravě; samotný zápis měření je již sebe-auditující přes `zaznam_udalosti.uzivatel_id`/`cas`
- ✅ **Výpočet výsledků** (F12) — `GET /routes/:id/results`, on-the-fly z `zaznam_udalosti` (žádná zvlášť udržovaná tabulka, viz [04-data-model.md §4.5](04-data-model.md)): pořadí celkové i po kategoriích, časová penalizace zohledněna, DNS/DNF/DQ vyřazeni do samostatné sekce. Veřejné čtení bez přihlášení (F16 — základ pro živou stránku). Export XLSX (F13) zatím chybí.
- ✅ **Zahájení startu** (UC5) — `POST/DELETE /routes/:id/start`, `GET/POST /routes/:id/start-waves`. U hromadného startu se vlna zakládá automaticky při první přihlášce, takže organizátor nemusí nic zvlášť konfigurovat — jen klikne "Start". Vlnový/intervalový start vyžaduje explicitní založení pojmenovaných vln.
- Modul správy trasy (F01, F02) — [07-ui-mockups.md §7.2](07-ui-mockups.md)
- Startovní listina — ruční zápis + CSV import (F03, F04) — [§7.8](07-ui-mockups.md)
- **Modul měření** — číslo + Enter, zachování systémového času (F06, F07) — [§7.3](07-ui-mockups.md), jádro dle [04-data-model.md §4.2](04-data-model.md)
- **Responzivní layout pro telefon/tablet/desktop od prvního řádku kódu** (F25, N08) — ne dodatečná úprava; klíčové obrazovky (Měření, Startovní listina, Kdo běží) se navrhují rovnou pro dotyk na iPadu/telefonu, viz [05-tech-stack.md §5.2.1](05-tech-stack.md)
- Nouzový kontakt a zdravotní poznámka u přihlášky (F31) — nízká náročnost, reálný bezpečnostní přínos, doporučeno zařadit hned do MVP (viz [12-rfid-a-doporuceni.md §12.6](12-rfid-a-doporuceni.md))
- Export výsledků do XLSX (F13)
- **Automatický export výsledků na FTP/SFTP jako statická HTML stránka** (F34, F35) — [03-architecture.md §3.10](03-architecture.md#310-export-a-publikace-výsledků-na-ftpsftp-f34f37), mockup [§7.10](07-ui-mockups.md)
- Backend API pro jedno zařízení/jednu trať bez multi-device synchronizace (zjednodušená verze `/sync/events` — jen lokální perzistence, cloud sync odložen na Fázi 2)

**Akceptační kritérium fáze:** organizátor dokáže odměřit celý menší závod (1 trať, 1 zařízení) v Depu od registrace po publikaci výsledků.

## Fáze 2 — Terén a offline (odhad 4–6 týdnů)

Cíl: plná terénní spolehlivost a síťová spolupráce mezi stanovišti.

- PWA shell, Service Worker, instalovatelnost — včetně iOS/iPadOS specifik (vlastní "Přidat na plochu" onboarding, safe-area layout) (N01, N05, F25)
- IndexedDB lokální úložiště a plně offline provoz modulu měření
- Synchronizace více zařízení/stanovišť (F15, F17) — event-log sync dle [03-architecture.md §3.5](03-architecture.md)
- Detekce a řešení kolizí (`NEEDS_REVIEW`) v UI (§7.1, §7.6)
- Modul "Kdo běží / DNF" v realtime (F10) — [§7.4](07-ui-mockups.md)

**Akceptační kritérium fáze:** dvě zařízení (cíl + 1 kontrolní stanoviště) zapisují nezávisle offline a po obnovení spojení se data bezkonfliktně sloučí bez ruční intervence (mimo skutečné kolize).

## Fáze 3 — Živé výsledky a rozšířená bezpečnost (odhad 3–5 týdnů)

- Realtime publikace výsledků (WebSocket/SSE), veřejná mobilní stránka (F16) — [§7.5](07-ui-mockups.md)
- Podpora více souběžných publikačních cílů a vlastní HTML šablony (F36, F37) — rozšíření základního FTP exportu z Fáze 1
- Vložitelný embed widget živých výsledků (F38) — viz [13-konkurencni-analyza.md §13.6](13-konkurencni-analyza.md)
- Kioskový režim live stránky pro promítání v cíli (F42), fotofiniš/video záznam sporných doběhů (F41)
- Auditní log v UI s filtrováním (§7.6)
- HTTPS/TLS, šifrování citlivých polí, GDPR retenční politika

**Akceptační kritérium fáze:** organizátor pozve spolupracovníky s odlišnými rolemi bez sdílení hesla; diváci sledují výsledky na mobilu bez manuálního uploadu.

## Fáze 4 — RFID/čtečky a rozšíření (odhad průběžně, dle poptávky)

- Podpora RFID čipů přes Local Capture Agent (F22, F29, F30) — hardwarové varianty, párování, evidence záloh, viz **[12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md)** a [03-architecture.md §3.9](03-architecture.md#39-local-capture-agent--napojení-rfid-decodérů-f22-n12)
- AI rozpoznávání startovních čísel z fotografií jako levnější alternativa k RFID (F40) — viz [13-konkurencni-analyza.md §13.4](13-konkurencni-analyza.md)
- Vlastní online registrační formulář (F23)
- Multi-tenant provoz pro více organizátorů (F24) — Row-Level Security dle [04-data-model.md §4.6](04-data-model.md)
- Pokročilé reporty, historie výkonů, rekordy tratě (F26)
- SMS/e-mail notifikace při doběhu (F32), QR kód na startovním čísle, detekce podezřelých mezičasů (F33) — viz [12-rfid-a-doporuceni.md §12.12](12-rfid-a-doporuceni.md) pro doporučené pořadí zařazení
- "NearMe" odlehčené GPS upozornění divákům (F39) — viz [13-konkurencni-analyza.md §13.6](13-konkurencni-analyza.md)
- Zvážení CRDT knihovny pro obecnější konflikty, pokud vlastní event-log sync narazí na limity (viz [05-tech-stack.md §5.3](05-tech-stack.md))

## 10.5 Doporučený bezprostřední další krok

1. Projít tuto dokumentaci s organizátorem — potvrdit, že mockupy v [07-ui-mockups.md](07-ui-mockups.md) odpovídají očekávání, a upřesnit priority mezi Fázemi 2–4.
2. Pokračovat ve Fázi 1: autentizace/RBAC, offline synchronizace (`/sync/events`), `vysledky_view`/`kdo_bezi_view`, FTP export.
3. Otestovat na reálném závodě s reálnými přihláškami jako akceptačním datasetem.
