# 13. Konkurenční analýza — přehled podobných systémů

Celkový přehled trhu časoměřičských a závodních systémů — ne jen výběr funkcí zajímavých pro Depo, ale ucelený obrázek toho, co jednotlivé nástroje dělají, pro koho jsou, a jak fungují jako celek. Konkrétní doporučení, co z toho zvážit pro Depo, je shrnuté na konci v §13.6.

## 13.1 Metodika a omezení

Průzkum vychází z webového vyhledávání (výsledkové úryvky) a přímo staženého obsahu z GitHubu — v tomto prostředí je totiž přístup přes `WebFetch` k naprosté většině veřejných webů blokovaný síťovou politikou prostředí (výjimka: `github.com`), takže u komerčních produktů vycházím z výsledkových úryvků vyhledávače, ne z plného obsahu jejich stránek. U open-source projektů na GitHubu jsem si mohl přečíst celá README. Zdroje jsou uvedené na konci dokumentu — doporučuju si komerční produkty před finálním rozhodnutím ověřit přímo, průzkum slouží jako mapa terénu, ne jako vyčerpávající specifikace každého produktu.

## 13.2 Mapa trhu — pět kategorií

| Kategorie | Zástupci | Business model | Kam patří Depo |
|---|---|---|---|
| **Profesionální/enterprise (hardware-first)** | MYLAPS, RACE RESULT, ChronoTrack Live, SportIdent/Copérnico | Prodej/pronájem hardwaru + software licence, řádově statisíce Kč | Ne — jiná liga rozpočtu |
| **Registrační platformy s vestavěnou časomírou** | RunSignup | Zdarma pořadateli, provize z platební brány placená účastníkem | Ne přímo, ale zajímavý byznys model |
| **Volně dostupné nástroje pro malé závody** | PikaTimer, fsTimer, OpenRaceTiming, result.software, Webscorer, PrimaRun, Mobilní časomíra | Zdarma / open-source, obsluhuje sám organizátor | **Ano — přímá konkurence** |
| **České časoměřičské služby (outsourcing)** | results.cz, SportSoft, WOWTIMING.CZ, AM Chrono | Placená služba na klíč s vlastní obsluhou | Ne — jiný typ rozhodnutí (dělat sám vs. objednat) |
| **Divácké/engagement nadstavby** | RaceJoy | Doplněk k existující časomíře, ne samostatný systém | Inspirace pro budoucí rozšíření |

## 13.3 Profily jednotlivých systémů

### MYLAPS — profesionální standard motorsportu a velkých běhů

Nizozemská firma, jeden z nejrozšířenějších profesionálních systémů na světě. Systém **X2** dosahuje přesnosti 1/1000 s a okamžité identifikace i za špatného počasí, transpondéry **TR2** vydrží rychlosti do 260 km/h a prodávají se na 1-, 2- nebo 5leté předplatné (nebo bez předplatného ve variantě "Go"). Software **Orbits 5** (úrovně Basic až Advanced) zvládá vícekolové závody a nahrává výsledky na vlastní platformu **Speedhive**, kde mají závodníci dlouhodobou historii výkonů napříč akcemi. Cílí primárně na motorsport a dráhové sporty, ale má i běžeckou/cyklistickou variantu. Pro malý komunitní závod prakticky nedostupné kvůli ceně hardwaru a předplatného.

### RACE RESULT — kompletní balíček s transparentním ceníkem

Německá firma působící ve 120+ zemích, nabízí **celý řetězec** — online registrace, transpondéry, časomíra, skórovací software — jako jeden produkt bez licenčního poplatku za samotný software (platí se jen hardware). Zajímavé je, že mají **veřejně dostupný ceník hardwaru** (dekodér Ubidium ~3 790 USD, transpondéry MotorKart V3 ~85 USD/ks s 3,5letou výdrží baterie, bezdrátový Loop Box pro mezičasy ~2 390 USD) — na rozdíl od většiny konkurence, která ceny sděluje jen na vyžádání. To dělá z RACE RESULT srovnatelně dostupnější volbu pro středně velké závody, které už na freeware nástroj vyrostly, ale na MYLAPS ještě nemají rozpočet.

### ChronoTrack Live — end-to-end správa se zaměřením na diváky

Americká platforma pokrývající celý závod od registrace po výsledky, s důrazem na **zapojení diváků**: vestavěný **vložitelný widget živých výsledků** (iframe/JS snippet) pro vlastní web organizátora, a **SMS aktualizace** informující diváky o postupu závodníka na trati. Škáluje od lokálních 5K až po OCR závody a triatlony s vlnovým startem. Typický příklad platformy, která řeší podobné problémy jako Depo (živé výsledky, komunikace s diváky), ale na výrazně vyšší cenové hladině a s vlastním hardwarem.

### SportIdent + Copérnico — dominance v orientačním běhu a modulární časomíra

**SportIdent** (Německo) je naprostý standard v orientačním běhu a rogainingu — místo RFID antény na dálku závodník fyzicky "orazí" každé kontrolní stanoviště malou plastovou kartou (SI card/stick) do krabičky s otvorem. Má vlastní registrační platformu **SI Entries**. Nad podobným typem dat běží i **Copérnico** (timingsense, Španělsko), který popisuje sám sebe jako "nejjednodušší časomíru na světě" — zajímavé funkce: **globální API pro napojení libovolné registrační platformy** bez nutnosti importovat CSV, **automatická pravidla pro detekci chyb** (změna typu události, diskvalifikace, penalizace) s historií akcí, **video záznam pro každého závodníka** k řešení sporných doběhů, a **pluginový ekosystém** (kiosky pro výdej čísel, obrazovky s výsledky, sledování běžců, analytika). Tenhle modulární/pluginový přístup a video replay jsou nápady, které stojí za zapamatování i pro nás (§13.4).

### RunSignup — zdarma pořadateli, dominantní v USA pro malé/střední závody

Obsluhuje takřka 40 000 závodů a 13 milionů registrací ročně (2026), typicky pro 5K/10K/půlmaraton až po velké seriály. **Byznys model:** software je pro pořadatele **zcela zdarma** (žádné předplatné, žádná provize z tržby závodu) — jediný příjem je transakční poplatek za platbu (typicky 6 % + 1 USD za nákup), který si organizátor může nechat zaplatit účastníkem, rozdělit, nebo absorbovat sám; u bezplatných závodů se poplatek neúčtuje vůbec. Zdarma dostává organizátor i tvorbu webu závodu, e-mailový marketing, mobilní RaceDay app a neomezené focení. V srpnu 2026 spustili **RaceDay Scoring V6** (přepsáno do Rustu pro rychlost) a novou **fotografickou časomíru** — časoměřič fotí startovní čísla mobilem/tabletem na běžné trati, AI z fotek automaticky rozpozná číslo a vygeneruje časový záznam i sdílitelnou fotku pro závodníka zároveň. Tohle je zásadně jiný přístup než RFID i než ruční zápis — bez hardwarové investice, jen s běžným telefonem (§13.4).

### PikaTimer (open-source) — nejbližší přímý vzor pro Depo

Desktopová Java aplikace pod GPLv3, zdarma, určená přesně pro naši cílovou skupinu. Umí přímý import z RFID systémů, vlastní definice kategorií/cen, alfanumerická startovní čísla, sledování traťových rekordů, "in-progress" report (kdo odstartoval, ale nedoběhl), a — klíčově — **automatický upload HTML reportů na FTP/FTPS/SFTP** v pravidelném intervalu (30 s až 5 min). Chybí jí ale síťová spolupráce více zařízení, realtime vrstva a rolové řízení přístupu — je to jednouživatelská desktopová appka, ne webová multi-device platforma, což je přesně mezera, kterou Depo zaplňuje.

### fsTimer (open-source) — stejná cílová skupina jako my

Cross-platformní (Win/Mac/Linux) nástroj cílený explicitně na "malé až středně velké charitativní 5K závody" — identická definice cílové skupiny jako naše. Řeší registraci, zápis časů a tisk výsledků. Potvrzuje, že tahle mezera trhu (svépomocná časomíra pro komunitní závody) je reálná a dlouhodobě obsazovaná víc menšími nezávislými projekty než jedním dominantním hráčem.

### OpenRaceTiming (open-source) — architektonicky nejblíž Depu

Modulární systém komunikující přes in-memory event bus s **event sourcing** vzorem (data tečou z hardwaru přes event store do dalších komponent), s podporou pluggable device connectors (MyLaps, RaceResult, Omega, finish-line kamera, manuální klávesnice jako fallback) a flexibilním nasazením — čistě lokálně bez internetu, nebo klient/server, nebo cloud. Nezávisle došel ke stejné architektuře jako Depo (§13.4).

### result.software (open-source) — filozoficky příbuzný projekt

Nová generace open-source časoměřičského softwaru pod licencí LGPL-3.0, sloganem "Your timing. Your data. Your results." Plný obsah webu nebyl v tomto prostředí dostupný k ověření (blokovaný přístup), ale filozofie — vlastní kontrola nad daty, ne uzamčení v proprietárním cloudu — je v souladu s tím, jak je navržené Depo (self-hosted, otevřený datový model).

### Webscorer — mobilní appka pokrývající celý proces

iOS/Android/tablet aplikace integrující registraci → časomíru → výsledky v jednom. Nejbližší existující nástroj k naší vizi "žádný desktop software, jen zařízení, co má organizátor po ruce" — jen řešený jako nativní appka, ne jako web (my volíme PWA kvůli přenositelnosti mezi platformami bez app store distribuce, viz [05-tech-stack.md §5.2](05-tech-stack.md)).

### RaceJoy — divácká nadstavba, ne samostatná časomíra

Appka pro účastníky a diváky (distribuovaná mj. přes RunSignup) s GPS live trackingem polohy závodníka na mapě, **"NearMe" upozorněním** (divák dostane notifikaci, když se sledovaný závodník blíží jeho poloze), hlasovými aktualizacemi tempa a funkcí "Send-a-Cheer" pro živé povzbuzování. Nejde o časomíru samotnou — potřebuje pod sebou existující systém, který jí dodává data o poloze/postupu. Ukazuje, kam se dá "diváckým zážitkem" jít nad rámec pouhé live stránky výsledků.

### České časoměřičské služby (results.cz, SportSoft, WOWTIMING.CZ, AM Chrono)

Firmy, které **přivezou vlastní čipový systém a obsluhu** — organizátor si nekupuje ani neinstaluje software, objednává kompletní službu. WOWTIMING.CZ nabízí kompletní čipovou časomíru pro běžecké závody (registrace, zpracování výsledků, živé přehledy publikované do sekund od doběhu). SportSoft provozuje vlastní portál s průběžnými výsledky během závodu. Jde o jinou kategorii rozhodování než Depo — "objednat službu" vs. "měřit si to sami" — ale relevantní jako připomínka, že čím spolehlivější a jednodušší bude Depo, tím míň důvodů bude tyhle služby (dražší) objednávat jen kvůli časomíře.

### PrimaRun a Mobilní časomíra — přímí čeští konkurenti stejné kategorie

**Časomíra PrimaRun** je zdarma dostupná aplikace pro malé pořadatele s webovou částí (registrace, publikace výsledků) a desktopovou částí pro obsluhu na místě. **Mobilní časomíra** (czechtriseries.cz) jde ještě dál směrem k tomu, co plánuje Depo — měření přímo přes mobilní telefony, s bezpečnostními klíči generovanými organizátorem pro připojení zařízení, a samotná mobilní aplikace je zdarma. Tyhle dva nástroje jsou nejbližší přímí konkurenti Depa na českém trhu a stojí za hlubší srovnání, až budou k dispozici jejich screenshoty/dokumentace (nebyly v tomto prostředí dostupné k prozkoumání kvůli blokovanému přístupu na jejich domény).

## 13.4 Nové nápady ze širšího průzkumu

Toto jsou zjištění, která se neváží úzce na FTP export, ale vyplynula z celkového pohledu na trh:

- **AI rozpoznávání startovních čísel z fotek** (RunSignup Mobile Timing V5, komerční nástroje jako RaceTagger, 9Pic BibTrack) — časoměřič vyfotí procházející závodníky běžným telefonem/tabletem, AI z fotky rozpozná startovní číslo (udávaná přesnost 90–98 % podle kvality snímku) a vytvoří časový záznam automaticky. Tohle je **genuinně zajímavá třetí cesta** vedle ručního zápisu a RFID — nevyžaduje žádnou hardwarovou investici (na rozdíl od RFID antén, viz [12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md)), jen telefon, který má obsluha stejně u sebe, a navíc rovnou vzniká fotka pro závodníka jako bonus. Stojí za zvážení jako **alternativa k RFID ve Fázi 4**, možná i dřív — technicky jde o rozšíření Local Capture Agent konceptu (§3.9 v [03-architecture.md](03-architecture.md)) o "foto → AI → event" pipeline místo "RFID čtečka → event".
- **Video záznam pro řešení sporných doběhů** (Copérnico) — potvrzuje a rozšiřuje naši dřívější myšlenku fotofiniše ([12-rfid-a-doporuceni.md §12.8](12-rfid-a-doporuceni.md)) o konkrétní realizaci: krátké video ne jen fotka, navázané na konkrétního závodníka.
- **Pluginový/kioskový ekosystém** (Copérnico) — namísto jedné monolitické appky nabízí oddělené "kiosky" pro výdej čísel, obrazovky s výsledky na místě, sledování běžců. Naše architektura (§3.3 v [03-architecture.md](03-architecture.md)) je na tohle už připravená (oddělené role/zařízení), jen jsme to takhle explicitně nepojmenovali — stojí za zvážení nabídnout "kioskový režim" (jen zobrazení výsledků na velké obrazovce v cíli) jako lehkou variantu veřejné live stránky.
- **Byznys model "zdarma pořadateli, poplatek z platby"** (RunSignup) — mimo scope samotné časomíry (F27 zůstává Won't have, viz [02-requirements.md](02-requirements.md)), ale relevantní jako inspirace pro **dlouhodobou udržitelnost Depa jako celku**, pokud by mělo v budoucnu přerůst v komerčně provozovanou multi-tenant platformu (F24) — bez nutnosti účtovat klubům přímý poplatek za časomíru.
- **Automatická pravidla pro detekci chyb s historií akcí** (Copérnico) — validuje náš přístup s řízeným číselníkem `typ_opravy` a append-only auditním logem ([04-data-model.md §4.2](04-data-model.md)), jen jde ještě dál směrem k automatizaci (systém sám navrhne DQ/penalizaci podle pravidla, ne jen zaloguje ruční zásah) — inspirace pro budoucí rozšíření F33 (detekce podezřelých časů).

## 13.5 Souhrnná srovnávací tabulka

| Systém | Kategorie | Registrace | Offline provoz | RFID/HW | Živé výsledky | FTP/embed export | Cena pro pořadatele |
|---|---|---|---|---|---|---|---|
| MYLAPS | Enterprise | Ne (jen časomíra) | Omezeně | Vlastní (X2, TR2) | Speedhive | Ne (uzavřený ekosystém) | Vysoká (HW + předplatné) |
| RACE RESULT | Enterprise | Ano | Omezeně | Vlastní (transparentní ceník) | Ano | Neznámo | Vysoká (jen HW, SW zdarma) |
| ChronoTrack Live | Enterprise | Ano | Omezeně | Vlastní | Ano + SMS | **Embed widget** | Vysoká |
| SportIdent/Copérnico | Enterprise/specializované | SI Entries | Ano (orientační běh z principu) | Vlastní (SI karty) | Ano | Plugin ekosystém | Střední–vysoká |
| RunSignup | Registrační platforma | Ano (jádro produktu) | Ne | Volitelné (i AI foto) | Ano | Neznámo | **Zdarma** (poplatek z platby) |
| PikaTimer | Malý nástroj | Ne | Ano (jednouživatelsky) | Import z RFID | HTML export | **FTP/FTPS/SFTP** | Zdarma (open-source) |
| fsTimer | Malý nástroj | Ano | Ano | Ne | Export | Neznámo | Zdarma (open-source) |
| OpenRaceTiming | Malý nástroj | Neznámo | **Ano (client-only mód)** | Pluggable konektory | Ano | Neznámo | Zdarma (open-source) |
| Webscorer | Malý nástroj (mobilní) | Ano | Ano (appka) | Ne | Ano | Neznámo | Freemium |
| **Depo (návrh)** | Malý nástroj | Ano (import i ruční) | **Ano (multi-device sync)** | Plánováno (Fáze 4) + AI foto k zvážení | Ano (WebSocket) | **FTP/SFTP + embed (plánováno)** | Zdarma / open-source |

## 13.6 Co si z toho odnést pro Depo — prioritizované

| Nápad | Zdroj | Stav v Depu |
|---|---|---|
| Automatický FTP/FTPS/SFTP export v intervalu | PikaTimer | ✅ Navrženo jako F34/F35 (Must have, Fáze 1) — viz [03-architecture.md §3.10](03-architecture.md#310-export-a-publikace-výsledků-na-ftpsftp-f34f37) |
| Traťové rekordy napříč ročníky | PikaTimer | ✅ Navrženo jako F26 |
| "Kdo běží" přehled | PikaTimer ("in-progress") | ✅ Navrženo jako F10 |
| Event-sourcing architektura, offline-first | OpenRaceTiming | ✅ Nezávisle stejný návrh — validace [04-data-model.md §4.2](04-data-model.md) |
| Embed widget místo/vedle FTP | ChronoTrack Live | ✅ Navrženo jako F38, Fáze 3 |
| "NearMe" odlehčené GPS upozornění | RaceJoy | ✅ Navrženo jako F39, Could have Fáze 4+ |
| **AI rozpoznávání čísel z fotek jako alternativa k RFID** | RunSignup, RaceTagger | 🆕 Zvážit jako doplněk/alternativu k F22 (RFID) ve Fázi 4 — nulová hardwarová investice |
| **Video záznam sporných doběhů** | Copérnico | 🆕 Rozšířit doporučení fotofiniše z [12-rfid-a-doporuceni.md §12.8](12-rfid-a-doporuceni.md) o krátké video |
| **Kioskový/plugin režim (jen zobrazení na obrazovce)** | Copérnico | 🆕 Lehká varianta live stránky pro promítání v cíli — nízká náročnost, zvážit Fáze 3 |
| SI-kartové razítkování na stanovišti | SportIdent | 🆕 Jen pokud budeme cílit i na orientační běh |
| Byznys model "zdarma + poplatek z platby" | RunSignup | 🆕 Inspirace pro dlouhodobou udržitelnost projektu, ne pro MVP |
| Přímé srovnání s PrimaRun a Mobilní časomírou | České nástroje stejné kategorie | 🆕 Doporučuju hlubší srovnání až s přístupem k jejich UI/dokumentaci — nejbližší skuteční konkurenti na českém trhu |

## Zdroje

- [MYLAPS](https://mylaps.com/)
- [RACE RESULT — Software](https://www.raceresult.com/en/software/index)
- [Review of Chip Timing Companies for Endurance Races — RaceID](https://raceid.com/organizer/timing/review-of-chip-timing-providers-for-endurance-races/)
- [ChronoTrack Live — Race Management](https://results.chronotrack.com/www/index/race-management)
- [ChronoTrack Live Results — Event Director Support](https://director.chronotrack.com/hc/en-us/sections/202027726-ChronoTrack-Live-Results)
- [SPORTident — Foot Orienteering](https://www.sportident.com/solutions/foot-orienteering.html)
- [Copérnico Timing Software — timingsense](https://timingsense.com/en/timing-software-copernico/)
- [Copérnico — timing software for all](https://timingsense.com/en/blog/timing-software-for-all/)
- [RunSignup](https://runsignup.com/)
- [RunSignup — Pricing](https://info.runsignup.com/pricing/)
- [RunSignup — Mobile Timing App V5: Photos for Auto Bib Tagging](https://info.runsignup.com/webinars_events/mobile-timing-app-v5-photos-for-auto-bib-tagging/)
- [RunSignup Launches New Photo-Based Timing Solution](https://www.runningusa.org/industry-news/runsignup-launches-new-photo-based-timing-solution-for-races/)
- [RunSignup Launches RaceDay Scoring V6](https://www.endurancesportswire.com/runsignup-launches-raceday-scoring-v6/)
- [Automate Marathon Bib Recognition with Computer Vision — Roboflow](https://blog.roboflow.com/automated-marathon-bib-recognition/)
- [RaceTagger — How AI Race Photo Tagging Works](https://racetagger.cloud/blog/NEW-5-AI-Race-Photo-Tagging-How-It-Works)
- [9Pic BibTrack](https://9pic.ai/products/bibtrack/)
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
