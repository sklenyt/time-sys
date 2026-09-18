# 11. Referenční přehled reálného schématu (Časomíra 1.33)

Tento dokument zaznamenává **skutečnou** strukturu databáze vytěženou přímo z dodaného souboru `Casomira_1_33_2022.accde` nástrojem `mdbtools`, doplněnou o pozorování z reálných dat proběhlého závodu (Břežanský kostitřas 2025, MTB, 3 tratě, ~95 startujících). Viz metodická poznámka v [01-analysis.md §1.1](01-analysis.md). Slouží jako **zdroj pravdy pro migraci** ([09-migration.md](09-migration.md)) a jako podklad pro nový datový model ([04-data-model.md](04-data-model.md)).

> Pozn.: VBA kód formulářů zůstává i po této inspekci nedostupný (`.accde` je zkompilovaný p-kód) — jde čistě o strukturu a obsah tabulek, ne o byznys logiku ve VBA. Logika je tam, kde to jde, odvozena z tvaru a obsahu dat.

## 11.1 Seznam tabulek

| Tabulka | Účel |
|---|---|
| `tblZavod` | Jedna konkrétní trať/distance závodu (např. "Krátká 20km") |
| `tblConfig` | Globální nastavení instalace — název akce, branding, FTP/export, e-mail SMTP (1 řádek) |
| `tblStart` | Definice startu/vlny (název, čas startu, ms-přesný čítač) |
| `tblStartovniListina` | Startovní listina — jeden řádek = jeden závodník přihlášený na konkrétní trať |
| `tblVekovaKategorie` | Číselník kategorií, vázaný na konkrétní `tblZavod` |
| `tblZaznamy` | Syrové časomíra záznamy (číslo + čas + typ opravy) — jádro měření |
| `tblZmenyZaznamu` | Číselník důvodů/typů opravy záznamu |
| `tblTypUkonceni` | Číselník: DNS / DNF / DQ |
| `tblCipy` | Párování RFID čipu ↔ startovní číslo (v tomto závodě nevyužito) |
| `tblLogy` | Globální (nejen na 1 závod) jemnozrnný log akcí aplikace |
| `tblVysledky`, `tblVysledkyTMP` | Denormalizovaná "plochá" tabulka pro tisk/export výsledků (výstup dotazu, ne zdrojová data) |
| `tblSeznamZavodniku` | Pomocný číselník křestních jmen → pohlaví (pro automatické doplnění pohlaví při zápisu) |
| `tblImport`, `tblImportParovani`, `tblImportParovaniKanoistika` | Podpora importu přihlášek z externích zdrojů (obecné sloupce a/b/c…, mapovací tabulky) |
| `tblSloupce`, `tblLokalizace` | UI metadata Accessu (šířky sloupců, texty pro lokalizaci formulářů) — čistě technické, bez byznys hodnoty pro nový systém |

## 11.2 Klíčové tabulky — sloupce (zkráceně, s komentáři z DB)

### `tblZavod` (trať/distance)
`id, nazevzavodu, popiszavodu, pocetkol, delka, preferovanystart, dokoncene, htmlsoubor, htmlhlavicka, htmltypexportu, ftpserver, ftpcesta, ftpuzivatel, ftpheslo, druzstvo_pocet, druzstvo_cil, druzstvo_vysledek, ftpserver2..heslo2, htmlpocetradek`

Reálný příklad (4 tratě jedné akce): `"Krátká 20km"`, `"Střední 35km"`, `"Dlouhá 58km"`, `"Střední elektro 35km"` — každá se svým FTP cílem pro export HTML výsledků.

### `tblStart`
`id, nazevstartu, odstartovano (TIMESTAMP), casintervalovehostartu (TIMESTAMP, "odloženo o x sekund"), odstartovanoms (DOUBLE), poznamka`

Reálný příklad: `"dlouhá" → 2025-09-20 11:30:00`, `"střední" → 11:40:00`, `"krátká" → 12:00:00` — tři vlny startu pro tři tratě, každá se svým ms-čítačem.

### `tblStartovniListina`
`id, startovnicislo (UNIQUE), prijmeni, jmeno, rocnik, stat, email, mobil, klub, idzavod→tblZavod, idvekovakategorie→tblVekovaKategorie, idstartu→tblStart, registrovan, nedokoncil→tblTypUkonceni, zaplacenodatum, zaplacenocastka, casovapenalizace, metry ("pro x hodinové závody"), kategorie2, kategorie3, +4× (prijmeniN/jmenoN/rocnikN/klubN) pro štafety/družstva`

Řádek `id=1, startovnicislo=0, prijmeni="-", jmeno="-"` je pevně přítomný **placeholder pro chybný/nerozpoznaný zápis** (viz [01-analysis.md §1.10](01-analysis.md)).

### `tblZaznamy` (jádro měření)
`id, datumcas (TIMESTAMP), cip, startovnicislo, chyba (BOOLEAN), idzmeny→tblZmenyZaznamu, datumcasms (INTEGER)`

Reálný příklad (výřez z ostrého závodu):
```
id, datumcas,            cip, startovnicislo, chyba, idzmeny, datumcasms
1,  2025-09-20 13:02:36,  ,   211,            0,     3,       14663187
2,  2025-09-20 13:05:47,  ,   221,            0,     1,       14854218
7,  2025-09-20 13:13:26,  ,   20,             0,     4,       15313093
```
`idzmeny=1` (originál) je nejčastější (68 z 98 řádků v tomto závodě), `idzmeny=3` (přepis nuly na číslo) druhý nejčastější (25×), `idzmeny=4` (přepsané číslo) zbytek (5×) — reálný poměr oprav cca 30 % záznamů, což potvrzuje, že opravy jsou **běžná součást provozu**, ne okrajový případ, a nový systém je musí mít prvotřídně podporované (ne jako výjimku).

### `tblZmenyZaznamu` (číselník důvodu opravy)
```
1  originál
2  přepis posl. řádku
3  přepis nuly na číslo
4  přepsané číslo
5  změna v úpravách
```

### `tblTypUkonceni` (číselník)
```
1  (prázdné = dokončil)
2  DNS
3  DNF
4  DQ
```

### `tblVekovaKategorie`
`id, vekovakategorie (kód, např. "MAk"), popiskategorie (text, např. "Muži \"A\""), mz (M/Z), vekod, vekdo, zavod→tblZavod`

Reálný příklad ukazuje, že kód kategorie kóduje jak věkovou/pohlavní skupinu, tak zkratku tratě (`MAk` = Muži A + krátká, `MAs` = Muži A + střední, `MAd` = Muži A + dlouhá) — protože kategorie je vázaná na konkrétní `tblZavod` (=trať), ne na akci jako celek.

### `tblLogy` (globální jemnozrnný log)
`id, cas (TIMESTAMP), popis (VARCHAR 200, formátovaný text)`

Formáty pozorované v reálných datech:
- `"Start ID: 1 | 951614625"` — zahájení startu (ID startu, ms-čítač)
- `"Start-zrušeno ID: 1 odstartovano: 24.08.2021 8:16:32 | MSodstartovano: 951614625 | MS: 951742984"` — zrušení/oprava startu
- `"|0|24.08.2021 8:14:57||||*|MS:951519281"` — jemnozrnný log průběžného zadávání číslice (ne jen finální Enter)
- `"Chyba |0|23.08.2021 20:04:10|0|23.08.2021 20:04:10||*|MS:907673515|-1|0"` — chybový/korekční stav

Log je **volně formátovaný text** (ne strukturovaná data) — v novém systému nahrazujeme strukturovanou event tabulkou (viz [04-data-model.md §4.6](04-data-model.md)), která nese stejnou informaci, ale strojově zpracovatelně.

### `tblVysledky` / `tblVysledkyTMP`
Široká plochá tabulka (60+ sloupců) — kombinuje identitu závodníka, časy (`doba`, `doba1`, `doba2`, vše i v ms variantě), **předpočítaná pořadí** pro každý řez (`poradizavod`, `poradimz`, `poradikategorie`, `poradikategorie2/3`, `poradiklub`, vše i "ms" varianta pro tie-break na setiny), mezičasy jako text (`mezicasy3`), příznak `nedokoncil`. Toto je typický Access vzor "denormalizovaná tabulka jako cache pro tisk/export sestavy" — v novém systému nahrazeno **odvozeným pohledem/materializovaným view** nebo on-the-fly výpočtem (viz [04-data-model.md](04-data-model.md) a [06-api-design.md](06-api-design.md) `GET /races/{id}/results`).

## 11.3 Pozorovaný objem dat (referenční závod)

| Tabulka | Počet řádků |
|---|---|
| `tblStartovniListina` | 95 |
| `tblZaznamy` | 98 |
| `tblVysledky` | 94 |
| `tblLogy` | 1552 (napříč více závody/roky v jednom souboru, ne jen tento závod) |
| `tblCipy` | 0 (RFID nevyužito) |
| `tblSeznamZavodniku` | 269 (číselník jmen pro odhad pohlaví) |

Řádový objem potvrzuje cílovou skupinu z [01-analysis.md](01-analysis.md): jednotky až nižší stovky závodníků na trať, řádově desítky až stovky časoměřičských zápisů — z hlediska výkonu triviální zátěž i pro nejjednodušší cloudové řešení; hlavní inženýrská výzva není objem dat, ale **spolehlivost pod časovým tlakem a offline provoz** (viz N01–N03 v [02-requirements.md](02-requirements.md)).

## 11.4 Mapování starý → nový model (přehled)

Podrobná DDL viz [04-data-model.md](04-data-model.md). Zkrácený přehled:

| Starý (Access) | Nový (time-sys) | Poznámka |
|---|---|---|
| *(neexistuje jako entita)* | `udalost` | Nová nadřazená entita sdružující tratě jedné akce — dřív jen konvence přes `tblConfig` |
| `tblZavod` | `trasa` | 1 řádek = 1 distance/trať v rámci `udalost` |
| `tblStart` | `start_vlna` | Beze změny konceptu, ms-hack odpadá (viz níže) |
| `tblStartovniListina` | `prihlaska` | Placeholder "číslo 0" řešen validací v aplikaci, ne pevným řádkem v datech |
| `tblVekovaKategorie` | `kategorie` | `vekod`/`vekdo` zůstávají, doplněno o možnost kategorie napříč tratěmi |
| `tblZaznamy` | `zaznam_udalosti` (event) | Rozšířeno o `zarizeni_id`, `uzivatel_id` pro víceuživatelský provoz |
| `tblZmenyZaznamu` | `enum typ_opravy` | Zachován stejný princip řízeného výčtu |
| `tblTypUkonceni` | `enum stav_ukonceni` (DNS/DNF/DQ) | Beze změny sémantiky |
| `tblCipy` | `cip` | Beze změny konceptu |
| `tblLogy` (volný text) | `audit_log` (strukturovaný, FK na `zaznam_udalosti`) | Nahrazen strukturovanými sloupci místo parsování textu |
| `tblVysledky`/`tblVysledkyTMP` | odvozený pohled `vysledky_view` / on-the-fly výpočet | Není nutné fyzicky ukládat, počítá se z `zaznam_udalosti` |
| `odstartovano` + `odstartovanoMS` (dual timestamp hack) | jediný `timestamptz` (mikrosekundová přesnost) | PostgreSQL řeší nativně, odpadá aplikační obchvat |
| `tblSeznamZavodniku` | `ciselnik_jmen_pohlavi` (volitelný pomocný modul) | Nice-to-have, ne kritická cesta |
| `tblImport*`, `tblSloupce`, `tblLokalizace` | nenahrazuje se 1:1 | Technické pomocné tabulky Accessu/UI, nahrazeny standardním importním modulem a i18n frameworkem (viz [05-tech-stack.md](05-tech-stack.md)) |

## 11.5 Co tato inspekce nezměnila oproti původnímu odhadu

Původní odvozený model z veřejné dokumentace (viz historie dokumentu) byl v hlavních rysech správný — potvrdily se: workflow číslo+Enter, automatická kategorizace, auditní log, absence síťové spolupráce. Inspekce reálného souboru hlavně **zpřesnila detaily** (DNS/DQ vedle DNF, řízený číselník důvodu opravy, dual-timestamp trik, chybějící entita "akce" nad "tratí") — viz shrnutí v [01-analysis.md §1.10](01-analysis.md).
