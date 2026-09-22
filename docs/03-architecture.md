# 3. Architektura systému

## 3.1 Cíle návrhu

1. Jednoduchost workflow "číslo + Enter", auditní log, robustní offline chování.
2. Žádná platformní závislost → webová aplikace přístupná z prohlížeče na jakémkoli zařízení.
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

| Modul | Poznámka |
|---|---|
| **Správa závodu** | Web formulář — kategorie, číselné řady, typ startu |
| **Přihlášky** | Import CSV/Google Forms, případně vlastní registrační formulář |
| **Zápis na místě** | Vyhledávání podle jména/klubu, offline na tabletu u stolu |
| **Měření (jádro)** | Numpad optimalizovaný pro rychlost, identické chování na PC i tabletu |
| **Kontrolní stanoviště** | Stejná aplikace na libovolném zařízení, auto-sync mezi stanovišti |
| **RFID/čárové kódy** | Web Serial/Web Bluetooth API nebo externí zařízení přes API |
| **Kdo běží / DNF** | Živě aktualizovaný přehled dostupný všem oprávněným zařízením |
| **Opravy a audit** | Webové rozhraní s filtrováním, auditovatelná historie změn |
| **Výsledky a exporty** | Okamžitý přepočet, TOP3, XLSX/PDF, jedním klikem publikovatelná stránka |
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

## 3.9 Local Capture Agent — napojení RFID decodérů (F22, N12)

Prohlížečové API (Web Serial, Web Bluetooth) jsou nedostatečná jako jediná cesta pro připojení profesionálních RFID decodérů: fungují jen v Chromiu, vyžadují explicitní gesto uživatele při každém párování, a řada decodérů (UHF čtečky na startu/cíli) komunikuje po **síti (TCP/UDP)**, ne přes USB/serial — to prohlížeč z bezpečnostních důvodů vůbec neumožní. Řešení, konzistentní s offline-first architekturou (§3.2–3.5):

```mermaid
flowchart LR
    Reader["RFID decodér / anténa<br/>(sériový port nebo TCP/UDP)"]
    Agent["Local Capture Agent<br/>malá lokální služba (Node.js)<br/>běží na časoměřičském zařízení"]
    PWA["PWA klient<br/>(stejné zařízení, localhost)"]
    Local["IndexedDB<br/>(stejný event log jako ruční zápis)"]

    Reader -->|"surová čtení čipů"| Agent
    Agent -->|"překlad na stejný formát<br/>jako POST /routes/id/records"| PWA
    PWA --> Local
```

- **Local Capture Agent** je malá doplňková služba (Node.js proces, distribuovaná jako jednoduchý instalovatelný balíček nebo součást PWA přes budoucí desktop wrapper), která běží přímo na časoměřičském notebooku/mini-PC vedle RFID decodéru.
- Naslouchá nativnímu protokolu decodéru (sériová linka, nebo lokální TCP/UDP socket — podle konkrétního výrobce čtečky) a **překládá každé přečtení čipu na stejnou strukturu záznamu**, jakou generuje ruční zápis "číslo + Enter" (viz `POST /routes/{id}/records` v [06-api-design.md](06-api-design.md)).
- Agent je záměrně **hloupý a bezstavový** — neprovádí žádnou byznys logiku (kategorizace, výpočet pořadí), pouze převádí surová čtení na standardní event. Veškerá logika zůstává v PWA/backendu, agent lze tak snadno nahradit i pro jiný typ hardwaru (čtečka čárových kódů, jiný výrobce RFID) beze změny zbytku systému.
- **Implementováno (Fáze 4):** server-side ingest endpoint `POST /routes/{id}/records/rfid` (viz [06-api-design.md](06-api-design.md)) — na rozdíl od ruční varianty nezná startovní číslo, jen `kodCipu`; endpoint ho dohledá přes aktuálně spárovanou přihlášku (`POST/DELETE /routes/{id}/entries/{entryId}/chip`, F29) a odtud dál běží úplně stejná logika jako `POST /records` (kolize stanovišť, sync, živé výsledky). Agent tak může mluvit přímo s backendem místo (nebo vedle) lokálního PWA klienta — obě cesty vedou do stejného event logu. Ověřeno end-to-end mock agentem (skript simulující čtení čipu a volání ingest endpointu), bez potřeby reálného RFID hardwaru.
- **Kontrola připojení hardwaru** (design pro budoucí konkrétní ovladač) — agent by měl pravidelně (řádově sekundy) ověřovat, že decodér i všechny nakonfigurované antény skutečně odpovídají (u UHF readerů typicky dotaz na stav portů přes LLRP/SDK výrobce), a stav viditelně hlásit obsluze přímo na obrazovce Měření. Bez toho se výpadek antény uprostřed závodu projeví jen jako "nikdo neprobíhá cílem" — obsluha si všimne až se zpožděním a bez jasné příčiny. Stejný princip jako existující indikátor stavu offline fronty (§3.4) — stav připojení musí být vždy viditelný, ne tichý.
- **Zůstává mimo scope:** samotný ovladač/protokol konkrétního výrobce decodéru (sériová linka/TCP/UDP parsing) — investice do konkrétního HW dává smysl až po ověření základního systému v ostrém provozu. Podrobnosti hardwarových variant a provozní workflow párování čipů viz **[12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md)**.

## 3.10 Export a publikace výsledků na FTP/SFTP (F34–F37)

Na rozdíl od RFID (§3.9), toto **není** odložená položka — jde o klíčovou funkci, kterou organizátoři reálně aktivně používají, takže patří do MVP (F34, F35 jsou Must have v [02-requirements.md](02-requirements.md)).

```mermaid
flowchart LR
    Trigger["Spouštěč:<br/>interval (N min) NEBO<br/>nový zaznam_udalosti"]
    Worker["Export worker<br/>(backend job)"]
    View[("vysledky_view")]
    Render["Renderer<br/>HTML šablona + data"]
    Queue["Fronta s retry<br/>(exponenciální backoff)"]
    FTP["FTP / FTPS / SFTP<br/>server organizátora"]

    Trigger --> Worker
    Worker --> View
    View --> Render
    Render --> Queue
    Queue -->|"úspěch"| FTP
    Queue -.->|"chyba → nový pokus"| Queue
```

- **Spouštěč** je konfigurovatelný na úrovni `publikacni_cil` (§4.10 v [04-data-model.md](04-data-model.md)): buď pevný interval v minutách, nebo okamžitě po každém přijatém `zaznam_udalosti` typu `DOJEZD`/`OPRAVA` na dané události — u malého závodu (řádově desítky zápisů) je "export po každém zápisu" klidně reálná výchozí volba bez rizika přetížení.
- **Export worker** je samostatný proces/queue job v backendu (ne request-response cesta) — selhání FTP uploadu (výpadek hostingu, špatné heslo) nesmí nijak zpomalit ani ohrozit zápis měření, který zůstává nezávislý (stejný princip oddělení jako u realtime vrstvy, §3.6).
- **Fronta s retry** — na rozdíl od staré Časomíry, kde selhání FTP uploadu bylo tiché (žádná chybová hláška v UI, organizátor musel sám zkontrolovat výsledky na webu), nový systém neúspěšný pokus zopakuje (exponenciální backoff, např. 3 pokusy) a viditelně to promítne do `publikacni_cil.posledni_export_stav` v UI.
- **Renderer** generuje statickou HTML stránku ze stejného odvozeného stavu jako živá stránka výsledků (§3.6, `vysledky_view`) — jde o dva **výstupní formáty téhož zdroje pravdy**, ne dvě samostatně udržovaná data, takže nemůže dojít k rozjetí hodnot mezi "živou" a "FTP" verzí výsledků.
- Tento kanál je záměrně nezávislý na tom, jestli organizátor používá i vestavěnou živou stránku Depa (F16) — řeší jiný problém: **publikaci na vlastní doméně/webu klubu**, kterou si organizátor typicky udržuje roky napříč ročníky závodu a nechce ji opouštět.
