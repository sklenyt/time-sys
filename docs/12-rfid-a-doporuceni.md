# 12. RFID čipy — detailní návrh a doporučení pro další rozvoj

Tento dokument reaguje na dva explicitní požadavky (RFID čipy do budoucna, povinná trasa/kategorie při registraci — promítnuto do [02-requirements.md](02-requirements.md) jako F03, F22, F29–F33 a do [04-data-model.md §4.8–4.9](04-data-model.md)) a doplňuje je o obecné doporučení, co dalšího by stálo za zvážení.

## 12.1 RFID — proč to není jen "přidat sloupec s kódem čipu"

Stará Časomíra měla `tblCipy` jako prosté párování `startovnicislo ↔ cip` — funkční pro nejjednodušší scénář, ale reálný provoz s čipy řeší řadu provozních situací, které v jednoduché tabulce chybí. Návrh níže je rozšíření, ne substituce — **ruční zápis "číslo + Enter" zůstává vždy dostupný jako plnohodnotná záložní cesta**, i na trati s RFID (viz [03-architecture.md §3.9](03-architecture.md)), protože žádný hardware v terénu není 100% spolehlivý (vybitá baterie čtečky, čip poškozený deštěm, závodník nemá čip vidět/přiložit).

## 12.2 Hardwarové varianty (k rozhodnutí ve Fázi 4)

| Varianta | Princip | Vhodné pro |
|---|---|---|
| **Pasivní UHF čip na botě/hrudi + anténa/mat v cíli** | Anténa napájí čip na dálku (řádově metry), čte bez nutnosti manuálního přiložení — standard velkých závodů (MyLaps, ChampionChip) | Závody s velkým počtem závodníků v cíli najednou, kde ruční zápis nestíhá |
| **Pasivní NFC/RFID čip s ručním přiložením ke čtečce** | Levnější čtečky, závodník/obsluha čip fyzicky přiloží | Menší závody, kontrolní stanoviště na trati s nižší frekvencí průchodů |
| **QR kód na startovním čísle + mobil/tablet jako scanner** | Žádný specializovaný HW, jen kamera tabletu | Nejlevnější varianta, nižší propustnost (nutné zamíření kamery), vhodné jako "chudá verze RFID" pro malé kluby — viz §12.6 |

Doporučení pro time-sys: **nezavazovat se v datovém modelu ani API k jedné konkrétní technologii** — `kod_cipu` je obecný string (funguje pro UHF EPC kód, NFC UID i obsah QR kódu stejně), a [Local Capture Agent](03-architecture.md#39-local-capture-agent--napojení-rfid-decodérů-f22-n12) je navržený jako vyměnitelný adaptér přesně proto, aby volba konkrétního výrobce HW nezamrzla v jádru aplikace.

## 12.3 Workflow: párování čipu se závodníkem

Nová obrazovka **Párování čipů** (mockup [07-ui-mockups.md §7.9](07-ui-mockups.md)) pokrývá typický provoz u výdeje startovních čísel (packet pickup):

1. Organizátor/obsluha na výdeji naskenuje/přiloží čip → systém ho spáruje s vybraným startovním číslem (`cip.prihlaska_id`, `cip.stav = PRIREZEN`).
2. Pokud má čip vratnou zálohu (běžné u vícepoužitelných UHF čipů), zapíše se `vratna_zaloha` a `vydano_at` — po závodě modul vrácení hromadně označí vrácené čipy (`stav = VRACEN`, `vraceno_at`) a systém umí vygenerovat seznam nevrácených čipů k dořešení zálohy.
3. Jednorázové/vlastní čipy (závodník si nosí svůj z předešlých akcí, běžné u sérií závodů) se stejným postupem jen spárují bez zálohy.

## 12.4 Provozní edge cases

| Situace | Řešení v modelu |
|---|---|
| Závodník ztratí čip před startem | Vydání nového čipu se `zalozni = true`, starý přepnut na `ZTRACEN` — historie měření zůstává vázaná na `prihlaska_id`, ne na konkrétní `cip`, takže výměna čipu neovlivní výsledky |
| Čtečka na kontrolním bodě selže | Časoměřič přepne na ruční zápis čísla na stejné obrazovce Měření (§3.9) — data padají do stejného `zaznam_udalosti`, žádný zvláštní režim |
| Čip nebyl přečten (závodník proběhl mimo dosah antény) | Stejné chování jako "nerozpoznané číslo 0" u ručního zápisu — vznikne `NEEDS_REVIEW`/chybějící záznam viditelný v modulu "Kdo běží", organizátor dohledá ručně |
| Půjčený/duplicitně použitý čip (dva závodníci se stejným kódem) | `cip.kod_cipu` je `UNIQUE` jen v rámci **aktivního párování** (`stav = PRIREZEN`) k jedné akci — po vrácení lze stejný fyzický čip znovu spárovat s jiným závodníkem na jiné akci |

## 12.5 Návaznost na architekturu a roadmapu

- Datový model: [04-data-model.md §4.9](04-data-model.md#49-rfid-čip--životní-cyklus).
- Architektura příjmu dat z hardwaru: [03-architecture.md §3.9](03-architecture.md#39-local-capture-agent--napojení-rfid-decodérů-f22-n12).
- Požadavky: F22, F29, F30 v [02-requirements.md](02-requirements.md).
- Zařazení do roadmapy: **Fáze 4** (viz [10-roadmap.md](10-roadmap.md)) — vědomě až po ověření základního systému, protože investice do konkrétního HW dává smysl teprve po ostrém provozu s ručním zápisem.

---

# Doporučení a nápady na další vylepšení

Toto je moje vlastní doporučení nad rámec toho, co bylo výslovně zadáno — seřazené podle poměru přínos/náročnost, ne podle formální MoSCoW priority. Neber to jako uzavřený seznam, spíš jako podklad k diskuzi, které z toho dává smysl zařadit do roadmapy a kam.

## 12.6 Bezpečnost a zdraví závodníků — nejvyšší doporučená priorita

Stará Časomíra tohle vůbec neřešila, a je to jedna z mála věcí, kde jde skutečně o zdraví/bezpečnost lidí, ne jen o pohodlí:

- **Nouzový kontakt a zdravotní poznámka** (F31, už v datovém modelu §4.8) — u vytrvalostních závodů v terénu (MTB, trail) je při zranění na trati kritické mít rychlý přístup ke jménu a telefonu blízké osoby a případné zdravotní poznámce (alergie, chronické onemocnění). Doporučuji tohle zařadit **dřív než RFID** — je to jednoduché na implementaci (pár polí navíc ve startovní listině) a řeší reálné riziko.
- **Tlačítko "SOS/nouze" v modulu Kdo běží** — organizátor jedním klikem označí závodníka jako "potřebuje pomoc" (odlišné od DNF), což ho vizuálně odliší od běžného "nedokončil" a spustí případný workflow přivolání pomoci na trati.
- **Detekce podezřele dlouhé mezery mezi mezičasy** (F33) — pokud závodník výrazně překročí očekávaný čas mezi dvěma stanovišti, systém ho může proaktivně vypíchnout v "Kdo běží" jako "možný problém na trati", ne čekat až uplyne celý časový limit.

## 12.7 Komunikace s veřejností a rodinou

- **SMS/e-mail notifikace při doběhu** (F32) — rodina/přátelé dostanou automatickou zprávu, jakmile závodník proběhne cílem, s časem. Populární a vysoce viditelná funkce u větších závodů, relativně jednoduchá nad existující `zaznam_udalosti` (trigger na `typ_udalosti = DOJEZD`), náklad je jen cena SMS brány.
- **QR kód na startovním čísle** vedoucí přímo na osobní výsledkovou stránku závodníka (mezičasy, pozice v kategorii) — dá se naskenovat mobilem přímo na místě, nemusí se nic hledat v dlouhém seznamu na živé stránce výsledků.

## 12.8 Integrita výsledků

- Detekce podezřele **rychlého** mezičasu (možné zkrácení trati / chyba záznamu) jako doplněk k F33 — statistický odhad na základě rozptylu časů ostatních závodníků ve stejné kategorii/vlně, ne pevný práh.
- Volitelný **fotofiniš/log fotografií z cíle** vázaný časovým razítkem na `zaznam_udalosti` — u sporných doběhů (kdo byl první) dnes stará Časomíra nenabízí nic, jednoduchá kamera s časovým razítkem by spor vyřešila bez diskuze.

## 12.9 Provozní vylepšení pro organizátora

- **Dashboard po závodě** — souhrnná statistika (průměrný čas podle kategorie, počet DNF, vytíženost jednotlivých hodin cíle) pro zpětné vyhodnocení akce a plánování dalšího ročníku — přirozené rozšíření `vysledky_view`.
- **Tisk startovních čísel s QR kódem** přímo ze systému (šablona PDF) — dnes typicky externí krok mimo Časomíru, dalo by se sjednotit s importem startovní listiny (F04).
- **Historie závodníka napříč ročníky** (F26 už to naznačuje) — pokud stejný klub/organizátor pořádá závod opakovaně, propojení podle jména+ročníku narození (ne jen startovního čísla, které se mezi ročníky mění) umožní ukazovat osobní rekordy a progres — motivační prvek pro závodníky.

## 12.10 Přístupnost a dosah

- Veřejná stránka výsledků ([07-ui-mockups.md §7.5](07-ui-mockups.md)) by měla projít základní kontrolou přístupnosti (kontrast, čitelnost pro slabozraké) — sledují ji i starší návštěvníci/rodiče na mobilu často v horších světelných podmínkách (venku, na slunci).
- Vícejazyčnost veřejné stránky (CS/EN jako minimum) — pole `stat` ve staré `tblStartovnilistina` naznačuje, že se občas objevují zahraniční účastníci.

## 12.11 K čemu bych byl naopak opatrný

- **Platby za startovné v jádru systému** (F27, vědomě Won't have) — bych ponechal mimo scope i dlouhodobě. Platební brány přinášejí regulatorní zátěž (PCI DSS) a existují specializované registrační platformy, se kterými dává větší smysl integrovat se (import/export), než je nahrazovat.
- **Plné GPS živé sledování polohy závodníků s mapou trati** — lákavá funkce, ale výrazně vyšší náročnost (nutnost mobilní aplikace u každého závodníka, spotřeba baterie, pokrytí signálem v terénu) a mimo profil "malý komunitní závod", pro který je celý systém navržený. Dávalo by smysl jen pokud by se projekt cíleně posunul směrem k větším/prestižnějším závodům. *(Odlehčená varianta — "NearMe" upozornění bez plné mapy — je po srovnání s konkurencí přehodnocena jako rozumné Could have, viz [13-konkurencni-analyza.md §13.5](13-konkurencni-analyza.md).)*

## 12.12 Doporučené pořadí, kam ideje zařadit

| Nápad | Doporučená fáze | Proč tam |
|---|---|---|
| Nouzový kontakt / zdravotní poznámka (F31) | **Fáze 1 (MVP)** | Nízká náročnost, reálné bezpečnostní riziko, mělo by být hned od začátku |
| SOS příznak v "Kdo běží" | Fáze 2 | Přirozeně navazuje na modul, který stejně vzniká v Fázi 2 |
| SMS/e-mail při doběhu (F32) | Fáze 3 | Váže se na realtime vrstvu, která vzniká v Fázi 3 |
| QR kód → osobní výsledky | Fáze 3 | Levné rozšíření živé stránky výsledků |
| Detekce podezřelých časů (F33) | Fáze 3–4 | Chce už reálná provozní data k odladění prahů |
| RFID čipy (F22, F29, F30) | Fáze 4 | Vysoká náročnost na HW integraci, dává smysl až po ověření základu |
| Dashboard/statistiky, historie závodníka (F26) | Fáze 4 | "Nice to have" bez vlivu na core provoz závodu |
