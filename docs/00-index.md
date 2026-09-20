# Depo — dokumentace

**Depo** je offline-first webová (PWA) aplikace pro časomíru sportovních závodů. Tento adresář obsahuje kompletní analýzu, architekturu a návrh aplikace.

## Obsah dokumentace

| # | Dokument | Obsah |
|---|----------|-------|
| 1 | [02-requirements.md](02-requirements.md) | Funkční a nefunkční požadavky na systém, MoSCoW priority |
| 2 | [03-architecture.md](03-architecture.md) | Architektura systému — offline-first PWA, synchronizace, komponenty |
| 3 | [04-data-model.md](04-data-model.md) | Datový model — entity, tabulky, vztahy, ERD |
| 4 | [05-tech-stack.md](05-tech-stack.md) | Technologický stack a zdůvodnění výběru |
| 5 | [06-api-design.md](06-api-design.md) | Návrh REST/WebSocket API |
| 6 | [07-ui-mockups.md](07-ui-mockups.md) | Návrh obrazovek (screenshoty/mockupy) |
| 7 | [08-security.md](08-security.md) | Bezpečnost, role a řízení přístupu (RBAC) |
| 8 | [10-roadmap.md](10-roadmap.md) | Fázovaná MVP roadmapa |
| 9 | [12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md) | Detailní návrh RFID čipů (hardware, párování, edge cases) + obecná doporučení pro další rozvoj |
| 10 | [13-konkurencni-analyza.md](13-konkurencni-analyza.md) | Celkový přehled trhu — profily podobných systémů (MYLAPS, RACE RESULT, ChronoTrack, SportIdent/Copérnico, RunSignup, PikaTimer, fsTimer, OpenRaceTiming, Webscorer, RaceJoy, české nástroje a služby) a co z nich zvážit |
| 11 | [14-graficka-identita.md](14-graficka-identita.md) | Grafická identita Depo — logo, barevný systém, typografie, brand guideline |
| 12 | [15-produkcni-nasazeni.md](15-produkcni-nasazeni.md) | Produkční nasazení databáze a API — managed Postgres, pooling, počet instancí, SSE za proxy, multi-device use case |

## Shrnutí v jedné větě

**Depo** je offline-first webová (PWA) aplikace pro časomíru sportovních závodů — klíčové workflow "startovní číslo + Enter → čas bere systém" funguje z jakéhokoli zařízení a prohlížeče, s lokální synchronizací mezi stanovišti a živou publikací výsledků.

## Stav projektu

**Fáze 0–4 hotové** (viz [10-roadmap.md](10-roadmap.md)) — offline-first zápis a sync, živé výsledky a publikace, bezpečnost/GDPR/multi-tenant RLS, RFID a rozšířené reporty. Nad rámec roadmapy dále doplněno: srovnání s legacy programem Časomíra a dorovnání tří nalezených mezer (DNS/DNF/DQ, auto-kategorizace, štafety), grafická identita napříč appkou, hloubková mobilní responzivita, accessibility audit (WCAG kontrast, aria-live), CI s automatizovanými unit/e2e testy, a [produkční nasazovací plán](15-produkcni-nasazeni.md). Další krok: ostrý test na reálném závodě podle §10.5 v roadmapě.
