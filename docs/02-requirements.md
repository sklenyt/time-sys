# 2. Požadavky na nový systém

Požadavky vycházejí z use case analýzy stávající aplikace ([01-analysis.md](01-analysis.md)) a z cílů modernizace. Prioritizace metodou **MoSCoW** (Must / Should / Could / Won't — pro první verzi).

## 2.1 Funkční požadavky

### Must have (MVP — bez toho systém nenahradí Access)

| ID | Požadavek | Vazba na use case |
|---|---|---|
| F01 | Založení závodu (název, datum, počet kol, typ startu: hromadný/vlnový/intervalový) | UC1 |
| F02 | Definice kategorií (ročník od–do, pohlaví, název) | UC1 |
| F03 | Startovní listina — ruční zápis závodníka; **trasa a kategorie jsou povinná pole zápisu** (kategorie se předvyplní automaticky podle ročníku/pohlaví, ale musí být explicitně potvrzena nebo ručně přepsána, nikdy uložena bez hodnoty) | UC3, UC4 |
| F04 | Import startovní listiny z CSV/XLSX | UC2 |
| F05 | Zaznamenání startu (start = aktuální systémový čas serveru/klienta) | UC5 |
| F06 | Zápis doběhu: zadání startovního čísla + Enter → čas = okamžik potvrzení, ne ruční vstup | UC6 |
| F07 | Zpracování prázdného/neplatného čísla jako řádek "0" k dodatečné opravě | UC6 |
| F08 | Oprava čísla v zázname se zachováním původního času | UC11 |
| F09 | Auditní log každého zápisu a opravy (kdo, kdy, původní/nová hodnota) | UC13 |
| F10 | Přehled "kdo ještě běží / DNF" v reálném čase | UC10 |
| F11 | Ruční označení stavu ukončení: **DNS** (nenastoupil) / **DNF** (nedokončil) / **DQ** (diskvalifikován) — potvrzeno reálným číselníkem `tblTypUkonceni`, viz [11-legacy-schema-reference.md](11-legacy-schema-reference.md) | UC12 |
| F12 | Výpočet pořadí — celkové i po kategoriích, TOP3 | UC14 |
| F13 | Export výsledků do XLSX a PDF | UC15 |
| F14 | Funkčnost **plně offline** na místě startu/cíle bez připojení k internetu | — |
| F15 | Synchronizace dat mezi zařízeními na stanovištích a s centrální DB, jakmile je spojení dostupné | UC8 |
| F25 | **Plně responzivní UI optimalizované pro telefon i tablet (včetně iPadu)**, ne jen desktop — časoměřič, obsluha na stanovišti i organizátor u registračního stolu běžně používají tablet nebo telefon, ne notebook. Netýká se jen "menšího okna", ale odlišného rozložení a velikosti dotykových prvků na klíčových obrazovkách (Měření, Startovní listina, Kdo běží) | — |
| F34 | **Automatický export výsledků jako statická HTML stránka a její nahrání na FTP/SFTP server organizátora** — přímá náhrada legacy funkce `tblZavod.ftpserver`/`ftpcesta`/`htmlsoubor` (viz [11-legacy-schema-reference.md](11-legacy-schema-reference.md)); umožňuje publikovat výsledky na vlastní doméně klubu/organizátora nezávisle na tom, zda time-sys hostuje živou stránku (F16) | UC16 |
| F35 | Konfigurovatelný spouštěč exportu — buď v pravidelném intervalu (v minutách, jako legacy `autoexportmin`), nebo okamžitě po každém novém doběhu | UC16 |

### Should have (rychle po MVP)

| ID | Požadavek |
|---|---|
| F16 | Živá veřejná stránka výsledků (bez ručního exportu/uploadu) |
| F17 | Podpora více kontrolních stanovišť s automatickou synchronizací mezičasů |
| F18 | Rolové řízení přístupu (organizátor / časoměřič / stanoviště / veřejnost) |
| F19 | Individuální uživatelské účty místo sdíleného hesla |
| F20 | Vyhledávání v startovní listině podle jména/klubu při zápisu na místě |
| F21 | Import klubové databáze pro rychlejší zápis |
| F36 | Vlastní HTML šablona/hlavička pro export (branding, styl klubového webu) — obdoba legacy `tblConfig.htmlhlavicka` |
| F37 | Podpora více souběžných publikačních cílů (např. 2 různé FTP servery zároveň) — obdoba legacy `ftpserver`/`ftpserver2` |

### Could have (rozšíření)

| ID | Požadavek |
|---|---|
| F22 | Podpora RFID čipů — čtečky/decodéry na startu, cíli i kontrolních stanovištích jako plnohodnotná alternativa k ručnímu zápisu čísla, viz [12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md) |
| F23 | Vlastní online registrační formulář napojený přímo do systému |
| F24 | Multi-tenant provoz pro více organizátorů současně |
| F26 | Pokročilé reporty a statistiky (historie výkonů, rekordy tratě) |
| F29 | Párování RFID čipu se startovním číslem při výdeji startovních čísel (registrace/expo) | 
| F30 | Evidence stavu čipu — vydán / vrácen / ztracen / záložní — s vazbou na vratnou zálohu | 
| F31 | Nouzové/zdravotní údaje závodníka (kontakt na blízkou osobu, alergie) viditelné organizátorovi při incidentu na trati |
| F32 | Automatická e-mail/SMS notifikace blízké osobě při doběhu závodníka do cíle |
| F33 | Detekce podezřele rychlého/pomalého mezičasu (možné zkrácení trati nebo nouzová situace) |
| F38 | Vložitelný widget živých výsledků (iframe/JS snippet) pro vlastní web organizátora — alternativa k FTP exportu bez nutnosti řešit přihlašovací údaje |
| F39 | "NearMe" upozornění divákovi, že sledovaný závodník se blíží k jeho poloze (odlehčená alternativa plného GPS trackingu) |
| F40 | Rozpoznání startovního čísla z fotografie pomocí AI (foto z mobilu/tabletu → automatický záznam + fotka pro závodníka) jako alternativa k RFID bez hardwarové investice, viz [13-konkurencni-analyza.md §13.4](13-konkurencni-analyza.md) |
| F41 | Krátký video záznam u cíle vázaný na konkrétní `zaznam_udalosti`, pro řešení sporných doběhů |
| F42 | "Kioskový" režim veřejné live stránky — zjednodušené zobrazení optimalizované pro promítání na velké obrazovce v cíli (bez interakce) |

### Won't have (v první verzi vědomě vynecháno)

| ID | Požadavek | Důvod |
|---|---|---|
| F27 | Online platby za startovné | Mimo scope časomíry, řeší externí registrační systémy |
| F28 | Nativní mobilní aplikace (App Store/Play Store) | PWA pokrývá potřebu bez nákladů na 2 platformy |

## 2.2 Nefunkční požadavky

| ID | Kategorie | Požadavek |
|---|---|---|
| N01 | Dostupnost | Aplikace musí fungovat bez internetového připojení na místě konání (offline-first) |
| N02 | Výkon | Zápis čísla + Enter → uložení do lokálního úložiště pod 100 ms (žádná viditelná prodleva pod tlakem) |
| N03 | Spolehlivost | Žádná ztráta zapsaného záznamu ani při pádu zařízení nebo prohlížeče (perzistence při každém zápisu) |
| N04 | Konzistence | Synchronizace mezi zařízeními musí být bezkonfliktní nebo s jasně definovaným pravidlem řešení konfliktů |
| N05 | Přenositelnost | Provoz z libovolného moderního prohlížeče na Windows/macOS/Linux/Android/iOS bez instalace desktop softwaru |
| N06 | Bezpečnost | HTTPS/TLS všude, hesla/haše, RBAC, izolace dat mezi organizátory (multi-tenant) |
| N07 | Auditovatelnost | Každá změna dat dohledatelná (kdo, kdy, co), log exportovatelný |
| N08 | Použitelnost | Obrazovka zápisu ovladatelná jen numerickou klávesnicí/numpadem, čitelná i za slunečního svitu na tabletu. **Responzivní layout pro min. 3 třídy zařízení: telefon (~390 px), tablet na výšku i na šířku (iPad ~768–1180 px), desktop** — dotykové cíle min. 44×44 px dle iOS/Android doporučení, ne jen zmenšená desktopová verze |
| N09 | Škálovatelnost | Podpora závodů v řádu tisíců závodníků a desítek souběžných diváckých přístupů na live výsledky |
| N10 | Nízké provozní náklady | Provoz odpovídající rozpočtu komunitních/spolkových akcí (řádově stovky Kč/měsíc nebo méně) |
| N11 | Zálohování | Automatické průběžné zálohování dat do cloudu při dostupném připojení |
| N12 | Rozšiřitelnost o hardware | Architektura musí umožnit napojení RFID decodérů/čteček bez závislosti na tom, zda je podporuje přímo prohlížeč (viz [12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md)) |

## 2.3 Neměnné principy (nesmí se ztratit při modernizaci)

Viz [01-analysis.md §1.11](01-analysis.md#111-důsledky-pro-návrh-nové-aplikace):

1. Workflow "číslo + Enter" — nejkritičtější a nejrychlejší cesta v systému.
2. Odolnost vůči výpadku internetu na místě — tvrdý požadavek (N01).
3. Auditní log — zachovat a rozšířit (F09, N07).
