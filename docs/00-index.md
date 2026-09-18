# time-sys — dokumentace

Moderní webová náhrada desktopové aplikace **Časomíra** (prozavody.cz, MS Access) pro měření časů sportovních závodů. Tento adresář obsahuje kompletní analýzu, architekturu a návrh nové aplikace.

## Obsah dokumentace

| # | Dokument | Obsah |
|---|----------|-------|
| 1 | [01-analysis.md](01-analysis.md) | Analýza současné Access aplikace — účel, role, procesy, use case, silné/slabé stránky |
| 2 | [02-requirements.md](02-requirements.md) | Funkční a nefunkční požadavky na nový systém, MoSCoW priority |
| 3 | [03-architecture.md](03-architecture.md) | Architektura nového systému — offline-first PWA, synchronizace, komponenty |
| 4 | [04-data-model.md](04-data-model.md) | Datový model — entity, tabulky, vztahy, ERD |
| 5 | [05-tech-stack.md](05-tech-stack.md) | Technologický stack a zdůvodnění výběru |
| 6 | [06-api-design.md](06-api-design.md) | Návrh REST/WebSocket API |
| 7 | [07-ui-mockups.md](07-ui-mockups.md) | Návrh obrazovek (screenshoty/mockupy) |
| 8 | [08-security.md](08-security.md) | Bezpečnost, role a řízení přístupu (RBAC) |
| 9 | [09-migration.md](09-migration.md) | Plán migrace dat ze stávajícího Accessu |
| 10 | [10-roadmap.md](10-roadmap.md) | Fázovaná MVP roadmapa |
| 11 | [11-legacy-schema-reference.md](11-legacy-schema-reference.md) | Referenční přehled **reálného** schématu vytěženého z dodaného `.accde` souboru |
| 12 | [12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md) | Detailní návrh RFID čipů (hardware, párování, edge cases) + obecná doporučení pro další rozvoj |
| 13 | [13-konkurencni-analyza.md](13-konkurencni-analyza.md) | Srovnání s podobnými systémy (MYLAPS, RACE RESULT, PikaTimer, RaceJoy a další) — co mají navíc a co z toho zvážit |

## Shrnutí v jedné větě

**time-sys** je offline-first webová (PWA) aplikace pro časomíru sportovních závodů, která zachovává klíčové workflow současného Accessu ("startovní číslo + Enter → čas bere systém"), ale odstraňuje jeho platformní omezení (Windows-only, žádná síťová spolupráce, ruční publikace výsledků) díky moderní architektuře s lokální synchronizací mezi stanovišti a živou publikací výsledků.

## Zdroj analýzy

Výchozím podkladem je hloubková analýza programu Časomíra v1.33 (`Casomira_1_33_2022.accde`), vycházející z oficiální dokumentace autora (prozavody.cz), protože soubor `.accde` je zkompilovaný a heslem chráněný (nelze z něj extrahovat zdrojový kód VBA ani přesnou strukturu tabulek bez přístupu v prostředí MS Access). Datový model je tedy v první verzi **odvozený (logický)** — viz [09-migration.md](09-migration.md) pro postup zpřesnění na skutečná data.

## Stav projektu

Fáze: **Fáze 0 — analýza a návrh architektury** (kód aplikace zatím neexistuje). Další krok: validace návrhu s uživatelem/organizátorem závodů a případně reálná data z proběhlého závodu pro zpřesnění datového modelu.
