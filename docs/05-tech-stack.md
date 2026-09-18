# 5. Technologický stack a zdůvodnění

Výběr je optimalizován pro tři priority dané analýzou ([01-analysis.md](01-analysis.md)): **offline-first spolehlivost**, **nízké provozní náklady** komunitních akcí a **rychlost vývoje** malým týmem.

## 5.1 Přehled

| Vrstva | Volba | Alternativy zvažované a zamítnuté |
|---|---|---|
| Frontend (terénní klient) | **React + TypeScript**, PWA (Vite) | Svelte (menší ekosystém pro offline/PWA nástroje), Vue (bez zásadní výhody), nativní mobilní appka (F28 — zbytečné 2× náklady na vývoj) |
| Lokální úložiště klienta | **IndexedDB** přes `Dexie.js` | `localStorage` (limit velikosti, jen string), WebSQL (deprecated) |
| Offline/service worker | **Workbox** (Google) | Ruční service worker (zbytečná režie údržby cache strategií) |
| Synchronizace | Vlastní **event-log sync** nad REST (viz [03-architecture.md §3.5](03-architecture.md#35-synchronizační-strategie-nejkritičtější-technické-rozhodnutí)) | Plné CRDT (Automerge/Yjs) — zvažováno jako budoucí vylepšení, pro MVP zbytečná komplexita vůči povaze dat (převážně append-only) |
| Backend API | **Node.js + NestJS (TypeScript)** | Python/FastAPI (rovnocenná volba, NestJS vybrán pro sdílené typy s TS frontendem přes monorepo) |
| Realtime | **WebSocket** (Socket.IO nebo nativní `ws`) + volitelně SSE pro veřejné výsledky | GraphQL subscriptions (zbytečná komplexita pro tento rozsah) |
| Databáze | **PostgreSQL 16+** | MySQL (slabší podpora JSONB a RLS), SQLite pro produkci (nevhodné pro multi-writer/multi-device server) |
| Cache / pub-sub pro realtime | **Redis** | In-memory v rámci jednoho API procesu (nefunguje při horizontálním škálování) |
| Object storage (exporty) | **S3-kompatibilní storage** (např. Cloudflare R2 / MinIO) | Ukládání souborů na disk API serveru (ztráta při redeploy kontejneru) |
| Generování XLSX | **ExcelJS** | `xlsx`/SheetJS (licenční omezení novějších verzí pro zápis) |
| Generování PDF | **Puppeteer/Playwright** (HTML → PDF) nebo **PDFKit** | LaTeX pipeline (zbytečná komplexita) |
| Autentizace | **JWT** (access + refresh token) + RBAC middleware | Session cookies (horší pro offline klienty s dlouhou dobou bez spojení) |
| Hosting (MVP) | **Fly.io / Railway / Render** (managed kontejnery) | Vlastní VPS + Docker Compose (nižší náklady, ale vyšší provozní zátěž — vhodné pro Fázi 2+, viz [10-roadmap.md](10-roadmap.md)) |
| CI/CD | **GitHub Actions** | GitLab CI (repozitář je na GitHubu) |
| Monitoring/chyby | **Sentry** (free tier dostačuje pro tento rozsah) | Vlastní logování bez agregace |

## 5.2 Proč PWA, a ne desktopová/nativní aplikace

Klíčový požadavek z analýzy je **odstranění platformní závislosti na Windows** při zachování **plné offline funkčnosti** — to jsou dva zdánlivě protichůdné požadavky, které PWA řeší současně:

- Instalovatelná na Windows, macOS, Linux, Android i iOS z jednoho zdrojového kódu.
- Service worker cachuje statické assety i logiku → aplikace se spustí i bez připojení.
- IndexedDB dává lokální "databázi v prohlížeči" srovnatelnou kapacitou jako souborová databáze Accessu, ale bez nutnosti instalace enginu.
- Žádný app store schvalovací proces ani nutnost dvou codebase (iOS/Android) jako u nativní varianty (F28 v [02-requirements.md](02-requirements.md) je vědomě "Won't have" pro MVP).

## 5.3 Proč vlastní event-log sync, a ne hotová CRDT knihovna

Zvažovány byly Automerge a Yjs (obě řeší bezkonfliktní offline-first sync obecně). Doména časomíry má ale specifickou vlastnost zjištěnou v [11-legacy-schema-reference.md §11.2](11-legacy-schema-reference.md) (reálná data): **cca 70 % záznamů jsou čisté nové vstupy (`originál`), zbytek jsou opravy s jasně definovanou sémantikou** (přepis nuly, přepis čísla) — ne obecné konkurenční úpravy libovolných polí. Vlastní řešení nad jednoduchým append-only event logem (viz [04-data-model.md §4.2](04-data-model.md#42-klíčové-designové-rozhodnutí-zaznam_udalosti-jako-append-only-event-log)):

- je jednodušší na pochopení, ladění a audit (klíčové pro důvěryhodnost časomíry v závodě),
- nemá cizí závislost s vlastní kompatibilitní historií formátu,
- lze v budoucnu nahradit/doplnit CRDT knihovnou, pokud se ukáže potřeba obecnějších konfliktů (např. současná editace popisu kategorie z více zařízení) — viz Fáze 4 v [10-roadmap.md](10-roadmap.md).

## 5.4 Proč NestJS/Node, a ne Python/FastAPI

Obě volby jsou v analýze rovnocenné z hlediska rychlosti vývoje a podpory WebSocketů. NestJS vybrán, protože:

- Sdílení TypeScript typů (DTO, event schéma) mezi frontendem a backendem v monorepu snižuje riziko nesouladu formátu synchronizačních eventů — kritické pro spolehlivost.
- Vestavěná podpora dependency injection a modulární struktura usnadňuje pozdější multi-tenant rozšíření (F24).

Python/FastAPI zůstává validní alternativou, pokud by tým měl silnější Python expertízu — technicky nic nebrání výměně bez dopadu na datový model.

## 5.5 Proč PostgreSQL

- Nativní `timestamptz` s mikrosekundovou přesností řeší přímo problém, který starý systém obcházel dual-timestamp trikem (viz [11-legacy-schema-reference.md](11-legacy-schema-reference.md)).
- Row-Level Security pro multi-tenant izolaci "zdarma" bez aplikační vrstvy navíc (viz [04-data-model.md §4.6](04-data-model.md)).
- `JSONB` pro flexibilní pole (např. `clenove_druzstva` nahrazující rigidní `prijmeni2..4/jmeno2..4` ze starého schématu).
- Vyzrálé nástroje pro zálohování a point-in-time recovery — důležité, protože data ze závodu jsou **nenahraditelná** (zdroj časů se negeneruje znovu).

## 5.6 Náklady (orientační, komunitní závod řádu stovek závodníků)

| Položka | Odhad |
|---|---|
| Hosting API + DB (managed, malý plán) | 0–15 USD/měsíc (řada platforem má free tier dostatečný pro tento rozsah) |
| Object storage exportů | řádově centy/měsíc |
| Doména + TLS | doména ~200 Kč/rok, TLS zdarma (Let's Encrypt / platforma) |
| Sentry / monitoring | free tier |

Odpovídá požadavku N10 z [02-requirements.md](02-requirements.md).
