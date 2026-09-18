# 3. Architektura nového systému

## 3.1 Cíle modernizace

1. Zachovat to, co funguje: jednoduchost workflow "číslo + Enter", auditní log, robustní offline chování.
2. Odstranit platformní závislost na Windows/Accessu → webová aplikace přístupná z prohlížeče na jakémkoli zařízení.
3. Umožnit skutečnou spolupráci více stanovišť v reálném čase namísto ručního kopírování souborů.
4. Zachovat odolnost vůči výpadku internetu v místě konání závodu — klíčový požadavek, nejde slevit ve prospěch "cloud-only" řešení.
5. Živá publikace výsledků online bez manuálního exportu/uploadu.
6. Moderní řízení přístupu (role: organizátor, časoměřič, stanoviště, čtenář výsledků) a zálohování v cloudu.

## 3.2 Architektura na vysoké úrovni

Vzhledem k tvrdému požadavku na spolehlivost bez internetu na místě volíme **offline-first / lokálně-synchronizovanou architekturu**, ne čistě cloudovou aplikaci závislou na neustálém připojení.

```mermaid
flowchart TB
    subgraph Zavodiste["Místo konání závodu (může být bez internetu)"]
        A["Zařízení u cíle (notebook/tablet)<br/>PWA — modul Měření"]
        B["Zařízení na stanovišti 1<br/>PWA — modul Měření"]
        C["Zařízení na stanovišti 2<br/>PWA — modul Měření"]
        D["Lokální WiFi / hotspot<br/>(peer sync mezi zařízeními)"]
        A <--> D
        B <--> D
        C <--> D
    end

    subgraph Cloud["Cloudový backend (při dostupném připojení)"]
        E["API server<br/>REST + WebSocket"]
        F[("Centrální databáze<br/>PostgreSQL")]
        G["Modul živých výsledků<br/>(veřejná stránka)"]
        H["Export modul (XLSX/PDF)"]
        E --> F
        E --> G
        E --> H
    end

    D -. "sync při dostupném internetu / mobilní data" .-> E
    G --> I["Divák / veřejnost<br/>(prohlížeč, mobil)"]
```

**Klíčová myšlenka:** každé zařízení v terénu běží jako **PWA** (Progressive Web App) s lokální databází (IndexedDB) a funguje plně offline. Zařízení se mezi sebou i s cloudem synchronizují, jakmile je dostupné jakékoli spojení (lokální WiFi hotspot mezi stanovišti, nebo mobilní data/internet směrem k centrální databázi). Tím se nahrazuje dnešní "kopírování souboru přes USB" automatickou a průběžnou synchronizací, ale princip "funguje to i bez internetu" zůstává zachován.

## 3.3 Vrstvy systému

```mermaid
flowchart LR
    subgraph Client["Klientská vrstva (PWA)"]
        UI["UI komponenty<br/>(React)"]
        Local["Lokální stav + úložiště<br/>(IndexedDB)"]
        Sync["Sync engine<br/>(event log + reconciliace)"]
        SW["Service Worker<br/>(offline cache, instalace)"]
    end
    subgraph API["Backendová vrstva"]
        REST["REST API"]
        WS["WebSocket / SSE gateway"]
        Auth["Auth & RBAC"]
        Biz["Doménová logika<br/>(kategorizace, pořadí, validace)"]
    end
    subgraph Data["Datová vrstva"]
        PG[("PostgreSQL")]
        Cache[("Redis — cache / pub-sub pro realtime")]
        Blob["Object storage<br/>(exporty XLSX/PDF)"]
    end

    UI --> Local --> Sync
    Sync <--> REST
    UI <--> WS
    REST --> Auth --> Biz --> PG
    WS --> Cache
    Biz --> Cache
    Biz --> Blob
```

## 3.4 Klíčové moduly a mapování na use case

| Modul | Nahrazuje v Accessu | Poznámka |
|---|---|---|
| **Správa závodu** | formulář "Nastavení" | Web formulář — kategorie, číselné řady, typ startu |
| **Přihlášky** | ruční import | Import CSV/Google Forms, případně vlastní registrační formulář |
| **Zápis na místě** | formulář zápisu | Vyhledávání podle jména/klubu, offline na tabletu u stolu |
| **Měření (jádro)** | hlavní formulář časomíry | Numpad optimalizovaný pro rychlost, identické chování na PC i tabletu |
| **Kontrolní stanoviště** | kopírování `!!záznamy` přes USB | Stejná aplikace na libovolném zařízení, auto-sync místo USB |
| **RFID/čárové kódy** | externí HW řešeno mimo Access | Web Serial/Web Bluetooth API nebo externí zařízení přes API |
| **Kdo běží / DNF** | lokální dotaz na jednom PC | Živě aktualizovaný přehled dostupný všem oprávněným zařízením |
| **Opravy a audit** | log v tabulce | Webové rozhraní s filtrováním, stejná logika zachování času |
| **Výsledky a exporty** | ruční export/tisk | Okamžitý přepočet, TOP3, XLSX/PDF, jedním klikem publikovatelná stránka |
| **Role a přístupy** | sdílené heslo na tabulku | RBAC, individuální účty, pozvánky e-mailem |

## 3.5 Synchronizační strategie (nejkritičtější technické rozhodnutí)

Nahrazuje dnešní ruční kopírování tabulky `!! záznamy` mezi stanovišti. Požadavky:

- Musí fungovat i když dvě zařízení zapíší nezávisle na sobě a spojí se až později (offline-first).
- Nesmí docházet k tichému přepsání/ztrátě záznamu — každý zápis časoměřiče je "posvátný".
- Konflikt (např. oprava stejného záznamu na dvou místech) musí být buď automaticky bezkonfliktně sloučen, nebo viditelně nahlášen k ručnímu rozhodnutí.

**Zvolený přístup: append-only event log + lokální reconciliace**

1. Každý zápis (`ZAZNAM` vznikl / `ZAZNAM` opraven / `START` zahájen / `ZAVODNIK` DNF) je **immutable event** s jednoznačným ID (UUID generovaným na klientovi), časovým razítkem a ID zařízení.
2. Klient ukládá eventy lokálně do IndexedDB ihned při vzniku (nikdy nečeká na síť).
3. Při dostupném spojení klient pošle nové eventy na server (`POST /sync/events`) a stáhne eventy, které ještě nemá.
4. Aktuální stav (např. "poslední hodnota čísla u záznamu X") je **odvozen přehráním eventů** seřazených podle logického (ne nutně nástěnného) pořadí — stejný princip jako dnešní auditní log, jen strojově konzistentní.
5. Skutečné konflikty (dvě různé opravy téhož záznamu z různých zařízení dřív, než se stihly synchronizovat) se neřeší tichým "poslední vyhrává", ale:
   - pokud jde o **opravu čísla při zachovaném čase** → poslední zápis podle serverového přijetí vyhrává, ale **obě verze zůstávají v logu** (nic se nemaže),
   - pokud jde o **nejednoznačnou kolizi** (např. stejné startovní číslo doběhlo na dvou stanovištích v témže kole) → záznam se označí `NEEDS_REVIEW` a zobrazí se organizátorovi k ručnímu rozhodnutí (obdoba dnešního "vlož 0 a oprav to později").
6. Tento model je v praxi jednodušší než plné CRDT struktury (např. Automerge/Yjs), protože doména je "z valné většiny append-only" (nová časová razítka vznikají, existující se upravují jen zřídka a v jasně definovaných situacích) — plná CRDT knihovna je zvažována jako budoucí vylepšení, ne nutnost pro MVP (viz [05-tech-stack.md](05-tech-stack.md)).

```mermaid
sequenceDiagram
    participant D1 as Zařízení Cíl
    participant D2 as Zařízení Stanoviště 1
    participant API as Backend API
    participant DB as PostgreSQL

    D1->>D1: Zápis čísla 42 + Enter → event uložen do IndexedDB
    Note over D1: Offline — žádné spojení
    D2->>D2: Zápis mezičasu čísla 17 → event uložen lokálně
    Note over D1,D2: Později — dostupná WiFi/mobilní data
    D1->>API: POST /sync/events (nové eventy od D1)
    D2->>API: POST /sync/events (nové eventy od D2)
    API->>DB: Append eventů, validace, přepočet odvozeného stavu
    API-->>D1: Eventy, které D1 ještě nemá (od D2 a jiných)
    API-->>D2: Eventy, které D2 ještě nemá (od D1 a jiných)
    API->>API: WebSocket broadcast změn výsledků
```

## 3.6 Realtime vrstva

- **WebSocket** kanál pro připojená zařízení organizátora/časoměřičů — okamžité promítnutí nových záznamů, přehledu "kdo běží", výsledků.
- **Server-Sent Events (SSE)** nebo cachovaná/edge stránka pro veřejné živé výsledky — vydrží nápor diváků bez zatížení hlavního API.
- Realtime vrstva je **doplněk**, ne závislost: pokud spojení chybí, aplikace funguje plně na lokálních datech a dožene stav při obnovení spojení (bod 3.5).

## 3.7 Nasazení (deployment)

```mermaid
flowchart TB
    subgraph Edge["Edge / CDN"]
        StaticSite["Statická PWA shell + veřejné výsledky"]
    end
    subgraph AppTier["Aplikační vrstva (Docker kontejnery)"]
        API1["API instance"]
        WSGW["WebSocket gateway"]
    end
    subgraph DataTier["Datová vrstva"]
        PG[("PostgreSQL — managed")]
        Redis[("Redis")]
        S3["Object storage (exporty)"]
    end
    Browser["Prohlížeč klienta"] --> StaticSite
    Browser --> API1
    Browser --> WSGW
    API1 --> PG
    API1 --> Redis
    API1 --> S3
    WSGW --> Redis
```

Doporučeno nasazení na **managed platformu** (Render/Railway/Fly.io) nebo malý VPS s Dockerem — odpovídá provoznímu rozpočtu komunitních závodů (viz N10 v [02-requirements.md](02-requirements.md)). Podrobnosti technologií viz [05-tech-stack.md](05-tech-stack.md).

## 3.8 Multi-tenancy

Pokud má systém sloužit více organizátorům/klubům současně (F24), zavádí se `organizace` jako top-level entita, ke které se váže vše ostatní (závody, uživatelé, role). Izolace na úrovni řádků (row-level security v PostgreSQL) zajišťuje, že organizátor A nikdy neuvidí data organizátora B. V MVP lze začít v single-tenant režimu a rozšířit později bez zásadní změny datového modelu (viz [04-data-model.md](04-data-model.md)).
