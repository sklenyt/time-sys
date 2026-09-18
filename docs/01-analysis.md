# 1. Analýza současného řešení — Časomíra (MS Access)

> Analyzovaná verze: 1.33 (`Casomira_1_33_2022.accde`), zdroj: oficiální dokumentace autora na prozavody.cz + přímá inspekce reálného souboru databáze (viz 1.1) včetně dat z ostrého závodu.

## 1.1 Metodická poznámka — aktualizováno po obdržení reálného souboru

Soubor `.accde` je sice zkompilovaný (VBA kód je nenávratně převeden do p-kódu, takže **formuláře/logiku** z něj získat nelze), ale **datové tabulky zůstávají ve standardním formátu Jet/ACE** a dodaný soubor neměl aktivní databázové heslo na úrovni enginu — proto šlo nástrojem `mdbtools` (open-source, Linux) přímo vytěžit **skutečnou strukturu tabulek, sloupců, indexů, komentářů i reálná data z proběhlého závodu** (Břežanský kostitřas 2025, ~95 startujících, 3 tratě 20/35/58 km).

Datový model v [04-data-model.md](04-data-model.md) a referenční přehled v [11-legacy-schema-reference.md](11-legacy-schema-reference.md) tedy **už nejsou odvozený/logický odhad, ale potvrzené reálné schéma** včetně názvů tabulek, typů sloupců, cizích klíčů a interních číselníků. Zbytek této kapitoly (procesy, role, use case) vychází z oficiální dokumentace autora a je reálnými daty potvrzen — konkrétní ověřená zjištění jsou shrnuta v §1.11.

## 1.2 Co program řeší a pro koho

**Časomíra** je desktopová aplikace pro ruční/poloautomatické měření časů menších a středně velkých sportovních závodů — běh, horská kola, triatlon, aquatlon, duatlon, plavání a podobné vytrvalostní akce. Cílí primárně na **pořadatele lokálních závodů** (spolky, obce, komunitní akce v řádu stovek až nižších tisíc závodníků), pro které se nevyplatí investice do bezkontaktní čipové časomíry.

Klíčová filozofie programu: **obsluha zapisuje pouze startovní číslo a stiskne Enter — čas si program vezme sám z hodin počítače.** Časoměřič se nemusí soustředit na čtení stopek, jen na správné přiřazení čísla doběhnuvšímu závodníkovi.

## 1.3 Technologická platforma současného řešení

| Vlastnost | Hodnota |
|---|---|
| Platforma | Microsoft Access (desktopová databázová aplikace) |
| Provoz | Pouze Windows (XP–11), 32bit i 64bit varianty zvlášť |
| Runtime | MS Access nebo zdarma Access Runtime, doporučeno 2010+ |
| Distribuce | `.accde` — zkompilovaný, needitovatelný balíček |
| Architektura | Monolitická jednosouborová databáze (soubor = aplikace i data) |
| Vícenásobný přístup | Neřešeno síťově — sdílení mezi stanovišti = ruční kopírování souboru/tabulky |
| Zabezpečení | Heslo na úroveň souboru + hesla pro citlivé tabulky (`!!starty`, `!!záznamy`) |
| Publikace výsledků | Export do HTML/XLSX/PDF, ručně nahráno na web |

Profil typický pro nástroj vzniklý "od praktika pro praktiky" — hlavní prioritou byla **spolehlivost offline provozu v terénu** (start/cíl závodu často bez internetu), ne škálovatelnost nebo multi-user přístup.

## 1.4 Aktéři systému (role)

1. **Organizátor / administrátor závodu** — nastavuje závod, kategorie, číselné řady, importuje přihlášky, spravuje výstupy.
2. **Časoměřič u cíle** — hlavní obsluha zapisující startovní čísla při doběhu (typicky v páru s "diktujícím").
3. **Diktující** — sleduje trať/cíl a nahlas diktuje čísla doběhnuvších.
4. **Obsluha kontrolního stanoviště na trati** — měří mezičasy na vzdálených bodech, data předává/importuje do hlavní databáze.
5. **Závodník** — pasivní účastník; registruje se předem (online přihláška) nebo na místě.
6. **Divák / veřejnost** — konzumuje výsledky online (HTML export) nebo na vyvěšených sestavách.

## 1.5 Use case — přehled

| # | Use case | Aktér | Popis |
|---|---|---|---|
| UC1 | Nastavení závodu | Organizátor | Definice závodu, kategorií, počtu kol, číselných řad |
| UC2 | Import přihlášek | Organizátor | Import startovní listiny z externího zdroje (Google Forms apod.) |
| UC3 | Zápis závodníka na místě | Organizátor/obsluha | Ruční zápis, automatický výpočet kategorie z ročníku a pohlaví |
| UC4 | Kontrola zařazení do kategorie | Organizátor | Validace/oprava automaticky přiřazené kategorie |
| UC5 | Odstartování závodu | Časoměřič | Uložení přesného startovního času (hromadně/vlnově/intervalově) |
| UC6 | Zápis doběhu / mezičasu | Časoměřič | Zadání čísla + Enter → uložení aktuálního času, dopočet kola/celku |
| UC7 | Měření na kontrolním stanovišti | Obsluha na trati | Lokální záznam mezičasů na vzdáleném počítači |
| UC8 | Konsolidace dat ze stanovišť | Organizátor | Export/import mezi počítači, sloučení do hlavní databáze |
| UC9 | Čtečka čipů/čárových kódů | Časoměřič | Automatický převod kódu na startovní číslo |
| UC10 | "Kdo ještě běží? / DNF" | Organizátor | Přehled odstartovaných, kteří nedoběhli počet kol |
| UC11 | Oprava chyby/překlepu | Časoměřič/organizátor | Přepis čísla se zachováním času, zápis do logu |
| UC12 | Záznam DNF | Organizátor | Označení nedokončení ve startovní listině |
| UC13 | Audit změn | Organizátor | Log vložených/upravených záznamů (kdo, kdy, původní/nová hodnota) |
| UC14 | Výpočet a zobrazení výsledků | Organizátor | Přepočet pořadí v kategoriích, TOP3, celkové výsledky |
| UC15 | Export/tisk výsledků | Organizátor | Export XLSX/PDF, tisk sestav podle kategorií |
| UC16 | Publikace online | Organizátor | Export HTML a nahrání na web |

## 1.6 Klíčový proces: měření v reálném čase (jádro aplikace)

Nejdůležitější a časově nejkritičtější proces celého systému:

1. Časoměřič klikne na "Start" → program uloží aktuální systémový čas jako start závodu (případně vlny/intervalu).
2. Diktující sleduje cílovou čáru a nahlas čte startovní čísla doběhnuvších (případně zapisuje i na papír jako zálohu).
3. Časoměřič zadá číslo a stiskne **Enter**.
4. Program v tu chvíli uloží **aktuální systémový čas** jako čas doběhu — čas se nikdy nezadává ručně.
5. Program dopočítá čas posledního kola (rozdíl od předchozího mezičasu/startu) a celkový čas.
6. Pokud obsluha číslo nestihne zapsat, Enter bez čísla → řádek s hodnotou `0`, opravitelný dodatečně. Stejně u neexistujícího čísla.
7. Oprava špatného čísla se provádí **se zachováním původního času** — čas se mění jen ve výjimečných definovaných případech.
8. Každý zápis i oprava se ukládá do **logu změn** (kdo/kdy/původní a nová hodnota) — jednoduchá auditní stopa.

Návrh je promyšlený z hlediska minimalizace lidské chyby pod časovým tlakem — obsluha se soustředí jen na čísla, ne na čas; chyby lze zpětně dohledat a opravit bez ztráty přesnosti měření.

## 1.7 Proces: měření na více kontrolních stanovištích

1. Na každém stanovišti běží samostatná offline instance databáze s vlastní startovní listinou.
2. Časy na jednotlivých počítačích musí být předem synchronizovány (ruční kontrola shody systémových hodin).
3. Po závodě se tabulka záznamů ručně zkopíruje (např. USB) a vloží/importuje do hlavní databáze v cíli.
4. Počet měřených míst musí odpovídat nastavenému počtu "kol" závodu.

**Toto je zásadní slabina současné architektury** — synchronizace je manuální, offline, bez verzování a bez automatické kontroly konzistence.

## 1.8 Proces: kategorizace a výsledky

- Kategorie se přiřazuje automaticky na základě ročníku narození a pohlaví/jména.
- Lze importovat databázi klubové příslušnosti pro rychlejší zápis na místě.
- Výsledky se počítají prakticky okamžitě po závodě — sestava TOP3 v každé kategorii i celkové pořadí.

## 1.9 Zhodnocení současného řešení

### Silné stránky

- Extrémně spolehlivý **offline provoz** — pro start/cíl v terénu bez internetu zásadní přednost.
- Workflow "číslo + Enter → čas se vezme sám" minimalizuje chybovost pod tlakem.
- Auditní log změn — dobrá praxe i v moderních systémech.
- Nízké náklady (freeware), roky ověřené v provozu (od 2017, aktuální v1.33).
- Nízké nároky na hardware.

### Slabé stránky / rizika

- **Platformní uzamčení** — jen Windows + Access/Runtime, dosluhující kombinace.
- **Single point of failure** — celá časomíra na jednom notebooku, pád stroje bez zálohy může ohrozit závod.
- **Žádná nativní síťová spolupráce** — sdílení dat mezi stanovišti je manuální, náchylné na chyby a zpoždění.
- **Bezpečnost na úrovni "heslo pro celý soubor"** — žádné rolové řízení přístupu, žádné individuální účty.
- **Žádný mobilní přístup** — obsluha na stanovišti potřebuje PC s Accessem, ne tablet/telefon.
- Publikace výsledků je **dávková** (ruční export a upload), ne živá.
- Bariéra vstupu pro nové organizátory — instalace Access Runtime, řešení blokovaného spuštění.

## 1.10 Ověřená zjištění z reálného souboru a ostrého závodu

Přímá inspekce potvrdila a zpřesnila několik bodů z oficiální dokumentace — podrobný technický přehled viz [11-legacy-schema-reference.md](11-legacy-schema-reference.md):

- **Placeholder závodník pro číslo 0**: ve startovní listině skutečně existuje řádek `StartovniCislo = 0, Prijmeni = "-", Jmeno = "-"` — potvrzuje popsané chování "prázdný/neplatný zápis → řádek s číslem 0 k dodatečné opravě" (UC6, F07). Není to speciální stav, je to obyčejný "závodník" v tabulce.
- **Ukončení má 3 typy, ne jen DNF**: `tblTypUkonceni` obsahuje `DNS` (nenastoupil), `DNF` (nedokončil), `DQ` (diskvalifikován) — požadavek F11 v [02-requirements.md](02-requirements.md) je třeba rozšířit o DNS a DQ vedle DNF.
- **Důvod opravy je řízená hodnota, ne volný text**: `tblZmenyZaznamu` je malý číselník důvodů opravy záznamu (`originál`, `přepis posl. řádku`, `přepis nuly na číslo`, `přepsané číslo`, `změna v úpravách`) — audit log tedy nezaznamenává jen "co se změnilo", ale i **strojově čitelný typ opravy**. Nový systém by měl tento princip zachovat (enum typu opravy, ne jen diff hodnot).
- **Log je jemnozrnnější, než se čekalo**: `tblLogy` neloguje jen finální potvrzený zápis (Enter), ale prakticky **každou dílčí změnu stavu** (rozepsané zadávání čísla, zrušení startu, chybové stavy) napříč celou historií aplikace (log v dodaném souboru sahá od 2021 do 2025, tedy přes více závodů/sezón v jednom souboru) — log je globální pro celou instalaci, ne svázaný s konkrétním závodem. To je zároveň slabina (nelze snadno oddělit log jednoho závodu) i inspirace (finegrained audit trail) pro nový systém.
- **Trik s duální přesností času**: `tblStart.odstartovano` (DATETIME, ~sekundová přesnost) je doplněno `odstartovanoMS` (číslo, milisekundový čítač) a stejně tak `tblZaznamy.datumcas` + `datumcasMS`. Access/Jet DATETIME nemá dostatečnou přesnost pro dělené časy v řádu setin sekundy, proto autor vede paralelně milisekundový čítač. **PostgreSQL `timestamp` má nativně mikrosekundovou přesnost** — v novém systému odpadá nutnost tohoto obcházení (viz [04-data-model.md](04-data-model.md)).
- **"Závod" ve starém modelu = jedna trať/distance, ne celá akce**: v reálných datech existují 3 samostatné řádky v `tblZavod` ("Krátká 20km", "Střední 35km", "Dlouhá 58km") pro jednu závodní akci (Břežanský kostitřas) se společnou brandingovou konfigurací v `tblConfig`. Nad "Zavodem" tedy chybí formální entita "závodní akce/event" — je to jen konvence pojmenování a sdílený config. Nový model tuto chybějící úroveň zavádí explicitně (`UDALOST` obsahuje více `TRAS`, viz [04-data-model.md](04-data-model.md)).
- **Kategorie jsou vázané na konkrétní trať, ne na akci jako celek**: `tblVekovaKategorie.Zavod` je cizí klíč na konkrétní trať — stejná věková/pohlavní skupina (např. "Muži A") má samostatný řádek kategorie pro každou distanci, protože se běží zvlášť. Sloupce pro automatický výpočet kategorie podle ročníku (`VekOD`, `VekDO`) v datech existují, ale v tomto konkrétním závodě nebyly využity (kategorie byla přiřazena podle pojmenované skupiny, ne podle přesného rozsahu ročníků) — funkcionalita v programu tedy je, jen se nepoužívá vždy.
- **Čipy (`tblCipy`) byly prázdné** — tento konkrétní závod běžel čistě na ručním zadávání čísel, bez RFID čtečky, což potvrzuje, že "číslo + Enter" je skutečně hlavní a nejpoužívanější cesta systému (ne jen záložní scénář).

## 1.11 Důsledky pro návrh nové aplikace

Z analýzy plynou tři neměnné požadavky, které musí nová architektura respektovat, i když se změní technologie:

1. **Workflow "číslo + Enter"** musí zůstat stejně rychlé a jednoduché — je to jádro spolehlivosti měření pod tlakem.
2. **Odolnost vůči výpadku internetu na místě konání** je tvrdý požadavek, ne "nice to have" — řešení nesmí být čistě cloudové/online-only.
3. **Auditní log** je nutné zachovat a rozšířit (dnes je to jediná forma kontroly kvality dat).

Podrobný návrh architektury viz [03-architecture.md](03-architecture.md), požadavky viz [02-requirements.md](02-requirements.md).
