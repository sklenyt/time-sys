# 13. Konkurenční analýza — co dělají podobné systémy jinak

## 13.1 Metodika a omezení

Průzkum vychází z webového vyhledávání (výsledkové úryvky) a přímo staženého obsahu z GitHubu — v tomto prostředí je totiž přístup přes `WebFetch` k naprosté většině veřejných webů blokovaný síťovou politikou prostředí (výjimka: `github.com`), takže u komerčních produktů (MYLAPS, RACE RESULT, ChronoTrack, SportIdent, RaceJoy) vycházím z výsledkových úryvků vyhledávače, ne z plného obsahu jejich stránek. U open-source projektů na GitHubu (PikaTimer, OpenRaceTiming) jsem si mohl přečíst celé README. Zdroje jsou uvedené na konci dokumentu — doporučuju si komerční produkty před finálním rozhodnutím ověřit přímo, průzkum slouží jako směr, ne jako vyčerpávající specifikace.

## 13.2 Tři kategorie systémů — a kam patří time-sys

| Kategorie | Zástupci | Cílová skupina | Model |
|---|---|---|---|
| **Profesionální/enterprise** | MYLAPS, RACE RESULT, ChronoTrack Live | Velké závody, maratony, motorsport | Vlastní hardware (transpondéry), placené licence/předplatné, řádově tisíce až statisíce Kč |
| **Volně dostupné nástroje pro malé závody** | PikaTimer, fsTimer, OpenRaceTiming, Webscorer, **stará Časomíra** | Komunitní/klubové závody (stovky závodníků) | Zdarma nebo freemium, obsluha = sám organizátor, žádný specializovaný tým |
| **Časoměřičské služby (outsourcing)** | results.cz, SportSoft, WOWTIMING.CZ, AM Chrono | Organizátoři, kteří nechtějí měřit sami | Placená služba — firma přijede s vlastním vybavením a obsluhou |

**time-sys patří do druhé kategorie** — stejně jako stará Časomíra. To je důležité měřítko: neporovnávat se s MYLAPS (jiná liga, jiný rozpočet), ale s PikaTimer/fsTimer/Webscorer, protože to je skutečná konkurence pro stejný typ uživatele.

## 13.3 Profesionální systémy — co mají navíc (a proč to většinou není pro nás)

- **MYLAPS** — vlastní RFID transpondéry s přesností 1/1000 s, platforma Speedhive pro publikaci a historii výkonů, lap counting pro motorsport. Vyžaduje nákup/pronájem hardwaru a předplatné transpondérů — mimo rozpočet komunitního závodu (N10).
- **RACE RESULT** — kompletní balíček (registrace + časomíra + skórování), transparentní ceník hardwaru (dekodér ~3 790 USD, transpondéry ~85 USD/ks), bezdrátový "Loop Box" pro mezičasy na trati bez kabeláže. Zajímavé jako **inspirace pro cenovou transparentnost**, ne jako přímý vzor rozsahu funkcí.
- **ChronoTrack Live** — end-to-end správa závodu, **vestavěný widget živých výsledků k vložení (embed) do vlastního webu organizátora** formou iframe/JS snippetu, a SMS aktualizace pro diváky na trati. Tohle je nápad, který stojí za zvážení i pro nás (§13.6).
- **SportIdent** — dominantní v orientačním běhu, řeší kontrolní body přes fyzické "razítkování" čipovou kartou do krabičky na stanovišti (ne anténa na dálku) — jiný fyzický princip než RFID anténa, ale koncepčně blízké naší architektuře kontrolních stanovišť ([03-architecture.md](03-architecture.md)). Pokud by time-sys měl v budoucnu cílit i na orientační běh, tohle je referenční mechanismus.

## 13.4 Volně dostupné nástroje srovnatelného rozsahu — nejrelevantnější srovnání

### PikaTimer (open source, GPLv3) — nejbližší přímý vzor

Desktopová Java aplikace pro malé/střední závody. Klíčová zjištění z README:

- **Automatický FTP/FTPS/SFTP upload reportů v intervalu (30 s / 1 min / 2 min / 5 min)** — prakticky identický koncept jako F34/F35 v [02-requirements.md](02-requirements.md) a jako stará Časomíra. Potvrzuje, že jde o žádaný a osvědčený vzor, ne o zastaralý přežitek — **dobrá zpráva, že náš návrh v [03-architecture.md §3.10](03-architecture.md#310-export-a-publikace-výsledků-na-ftpsftp-f34f37) jde správným směrem.**
- Přímý import z RFID systémů (Ultra, Joey).
- **"In-Progress" report** (kdo odstartoval, ale ještě nedoběhl) — stejný koncept jako naše "Kdo běží/DNF" (F10).
- **Sledování traťových rekordů** (course records) napříč ročníky — přímo validuje naše doporučení F26 v [12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md).
- HTML výstup formátovaný přes DataTables pro pohodlné mobilní zobrazení — my řešíme stejný cíl vlastní mobile-first veřejnou stránkou (F16).
- Co PikaTimer **nemá** a my ano: offline-first architektura pro více spolupracujících zařízení (PikaTimer je jednouživatelská desktopová appka), realtime WebSocket vrstva, RBAC.

### fsTimer (open source)

Cílí explicitně na "malé až středně velké charitativní 5K závody" — identická cílová skupina jako naše. Cross-platform (Win/Mac/Linux). Potvrzuje správnost zaměření na tuto skupinu jako neobsazenou/poddimenzovanou mezeru na trhu.

### OpenRaceTiming (github.com/skoky) — architektonická validace

Zajímavý nález: nezávisle na nás došel ke **stejnému architektonickému řešení** — modulární systém komunikující přes **in-memory event bus s "event sourcing" vzorem** (časoměřičská data tečou z hardwaru přes event store do dalších komponent), a podporuje jak client/server, tak čistě lokální provoz bez internetu. To je téměř doslovně náš návrh `zaznam_udalosti` jako append-only event log ([04-data-model.md §4.2](04-data-model.md)) a offline-first architektura ([03-architecture.md §3.2](03-architecture.md)). Nezávislá konvergence dvou týmů na stejném vzoru je silný signál, že jde o správný přístup pro tuto doménu, ne o zbytečnou komplexitu.

### Webscorer

Mobilní appka (iOS/Android/tablet) pokrývající registraci → měření → výsledky v jednom. Nejbližší k naší vizi "PWA na libovolném zařízení" z existujících nástrojů, ale jako nativní appka, ne web — potvrzuje poptávku po přesně tomhle typu UX, jen s jinou technologií pod kapotou (my volíme PWA kvůli N05, viz [05-tech-stack.md §5.2](05-tech-stack.md)).

## 13.5 Spectator engagement — RaceJoy jako inspirace pro budoucí rozšíření

RaceJoy (používaný přes ekosystém RunSignup u větších závodů) jde dál než jednoduché SMS oznámení doběhu (naše F32):

- **GPS live tracking** polohy závodníka na mapě trati (vyžaduje telefon u závodníka).
- **"NearMe" upozornění** — divák dostane notifikaci, když se sledovaný závodník blíží k jeho poloze (ne jen k cíli).
- Hlasové aktualizace tempa/odhadu doběhu v pravidelných intervalech.
- "Send-a-Cheer" — divák pošle živou "povzbuzovačku" závodníkovi.

**Moje revize vlastního dřívějšího doporučení** ([12-rfid-a-doporuceni.md §12.11](12-rfid-a-doporuceni.md)): plné GPS trackování jsem odrazoval jako mimo rozpočet/rozsah malého závodu — to platí pro plnou verzi (mapa v reálném čase). Ale **"NearMe" upozornění** je odlehčená varianta téhož nápadu — nevyžaduje vlastní mapovou vizualizaci ani kontinuální GPS stream, stačí občasná poloha telefonu diváka + poslední známý mezičas závodníka k hrubému odhadu. Řadil bych to jako **Could have, Fáze 4+**, ne úplně zavrhoval.

## 13.6 Vestavěný "embed widget" — nápad z ChronoTrack, stojí za zvážení

ChronoTrack Live nabízí organizátorovi vložitelný JS/iframe widget živých výsledků přímo do vlastního webu, jako **alternativu** k FTP exportu statické stránky. Pro time-sys by to byl **levný doplněk** k tomu, co už stejně stavíme (F16 živá stránka) — místo pouhého odkazu na `results/live` by organizátor dostal i `<iframe>` snippet k vložení do svého webu, se stejnými daty, ale bez nutnosti řešit FTP přihlašovací údaje vůbec. Navrhuju přidat jako doplněk k F34 v Fázi 3 (souběžně s F16), je to v podstatě jen jiný způsob podání téže živé stránky.

## 13.7 České služby — jiný obchodní model, ne přímá konkurence nástroje

results.cz, SportSoft, WOWTIMING.CZ a AM Chrono jsou **časoměřičské služby** — firma přiveze vlastní čipový systém a obsluhu, organizátor si nekupuje software, ale objednává službu na míru (typicky dražší, ale bez nutnosti mít vlastní tým). To je jiný segment než time-sys/Časomíra, kde časomíru obsluhuje sám organizátor/klub zdarma dostupným nástrojem. Relevantní hlavně jako připomínka, že time-sys konkuruje primárně **rozhodnutí "měřit si to sami" vs. "objednat službu"** — čím jednodušší a spolehlivější bude time-sys, tím míň důvodů bude objednávat drahou externí službu jen kvůli časomíře.

## 13.8 Shrnutí — co zvážit doplnit

| Nápad odjinud | Zdroj | Doporučení |
|---|---|---|
| Automatický FTP/FTPS/SFTP export v intervalu | PikaTimer, stará Časomíra | ✅ Už navrženo jako F34/F35 (Must have) |
| Traťové rekordy napříč ročníky | PikaTimer | ✅ Už navrženo jako F26 |
| "Kdo běží" přehled | PikaTimer ("in-progress") | ✅ Už navrženo jako F10 |
| Embed widget místo/vedle FTP | ChronoTrack Live | 🆕 Zvážit přidat k F34 ve Fázi 3 — nízká náročnost |
| "NearMe" odlehčené GPS upozornění | RaceJoy | 🆕 Revidovat z "nedoporučeno" na Could have, Fáze 4+ |
| SI-kartové razítkování na stanovišti | SportIdent | 🆕 Zvážit jen pokud budeme cílit i na orientační běh — jinak nerelevantní |
| Cenová transparentnost hardwaru | RACE RESULT | 🆕 Inspirace pro budoucí "doporučený hardware" sekci v dokumentaci k RFID ([12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md)), ne kód |

## Zdroje

- [MYLAPS](https://mylaps.com/)
- [RACE RESULT — Software](https://www.raceresult.com/en/software/index)
- [Review of Chip Timing Companies for Endurance Races — RaceID](https://raceid.com/organizer/timing/review-of-chip-timing-providers-for-endurance-races/)
- [ChronoTrack Live — Race Management](https://results.chronotrack.com/www/index/race-management)
- [ChronoTrack Live Results — Event Director Support](https://director.chronotrack.com/hc/en-us/sections/202027726-ChronoTrack-Live-Results)
- [Webscorer — Track live results](https://www.webscorer.com/live-results)
- [Webscorer — Race results](https://www.webscorer.com/race-results)
- [results.cz](https://www.results.cz/sluzby.php)
- [SportSoft — Časoměrné služby](https://old.sportsoft.cz/cs/sluzby/timekeeping)
- [WOWTIMING.CZ](https://www.wowtiming.cz/casomira-pro-bezecke-zavody-presne-mereni-pro-maratony-pulmaratony-10-km-i-5-km/)
- [AM Chrono — Software](https://www.amchrono.cz/cz/s3679/Technologie-a-SW/c2598-Software)
- [Časomíra PrimaRun — Slunečnice.cz](https://www.slunecnice.cz/sw/casomira-primarun/)
- [Mobilní časomíra — Czech Tri Series](http://www.czechtriseries.cz/timing/about)
- [PikaTimer (GitHub)](https://github.com/PikaTimer/pikatimer)
- [OpenRaceTiming (GitHub)](https://github.com/skoky/OpenRaceTiming)
- [result.software (GitHub)](https://github.com/trackmyrace/result.software)
- [fsTimer](http://fstimer.org/)
- [Sportiduino (GitHub)](https://github.com/sportiduino/sportiduino)
- [RaceJoy](https://www.racejoy.net/)
- [RaceJoy — Deep Dive (RaceDirectorsHQ)](https://www.racedirectorshq.com/read/connected-race-day-racejoy-27/)
- [RaceJoy na RunSignup](https://info.runsignup.com/products/raceday/racejoy/)
