# 9. Migrační plán ze stávající Časomíry

## 9.1 Výchozí stav

Na rozdíl od původního odhadu ([01-analysis.md §1.1](01-analysis.md)) už máme k dispozici **reálné schéma i reálná data z proběhlého závodu**, vytěžená z `Casomira_1_33_2022.accde` (viz [11-legacy-schema-reference.md](11-legacy-schema-reference.md)). Migrační plán proto není jen teoretický postup "až dostaneme data", ale je z části **ověřený**: mapování tabulek v [11-legacy-schema-reference.md §11.4](11-legacy-schema-reference.md#114-mapování-starý--nový-model-přehled) vychází ze skutečných sloupců, ne z odhadu.

## 9.2 Co migrace řeší

1. **Jednorázová migrace historických dat** — pokud organizátor chce v novém systému mít i výsledky starých závodů (archiv, statistiky napříč ročníky).
2. **Souběžný provoz** — po dobu prvních ostrých závodů běží nová aplikace vedle staré Časomíry jako záloha, dokud si organizátor nevybuduje důvěru v nový systém.
3. **Jednorázový import startovní listiny** aktuálního závodu — praktická nutnost pro každý ostrý provoz, ne jen "migrace", ale běžná provozní funkce (F04).

## 9.3 Postup migrace historických dat

1. **Export ze zdroje** — pro každý starý soubor `.accde`/`.accdb` spustit `mdbtools` (`mdb-schema`, `mdb-export`) stejně jako při této analýze — funguje bez nutnosti Accessu, pokud soubor nemá aktivní databázové heslo na úrovni Jet enginu. Pokud heslo aktivní je, potřeba spustit export z prostředí se skutečným MS Access (Database Documenter / ruční export tabulek do CSV).
2. **Transformační skript** (Python/Node) mapující legacy sloupce na nový model podle tabulky v [11-legacy-schema-reference.md §11.4](11-legacy-schema-reference.md):
   - `tblZavod` → `trasa` (+ ruční vytvoření nadřazené `udalost`, protože stará data tuto úroveň neměla explicitně — seskupení podle společného `tblConfig`/názvu akce/data).
   - `tblStartovniListina` → `prihlaska` (placeholder řádek "číslo 0" se **nemigruje** jako přihláška, protože v novém modelu je "neznámé číslo" stav v `zaznam_udalosti`, ne řádek v `prihlaska`).
   - `tblZaznamy` + `idzmeny` → `zaznam_udalosti` s `typ_opravy`; řetězec oprav (opravy odkazující na předchozí řádek) je nutné rekonstruovat z pořadí `id`/`datumcas`, protože stará tabulka neměla explicitní `nahrazuje_zaznam_id`.
   - `tblLogy` (volný text) — **není** 1:1 migrovatelný strojově kvůli formátu volného textu (viz ukázky v [11-legacy-schema-reference.md §11.2](11-legacy-schema-reference.md)); doporučeno migrovat jen strukturovaně extrahovatelné položky (Start/Start-zrušeno přes regex) a zbytek archivovat jako plain-text přílohu k závodu pro dohledatelnost, ne parsovat do `zaznam_udalosti`.
   - `tblVysledky`/`tblVysledkyTMP` — **nemigrovat** vůbec, jsou to odvozená data; po migraci `zaznam_udalosti` se výsledky v novém systému přepočítají nad `vysledky_view` ([04-data-model.md §4.5](04-data-model.md)).
3. **Validace na vzorku** — pro každý migrovaný závod porovnat přepočtené pořadí/časy nového systému s exportovanou `tblVysledky` starého systému. Rozdíl signalizuje buď chybu v transformaci, nebo (očekávaně) opravu chyby, kterou stará plochá tabulka "zamrzla" (např. zaokrouhlení, TIE-break na ms).
4. **Import do PostgreSQL** přes transakční batch insert s `ON CONFLICT` ochranou proti duplicitě při opakovaném běhu skriptu.

## 9.4 Postup pro souběžný provoz (první ostré závody)

1. Import aktuální startovní listiny do nového systému stejným importním modulem, který bude sloužit organizátorům běžně (F04 — CSV/XLSX import, ne jednorázový skript).
2. Časomíra běží **paralelně** — jedna osoba obsluhuje starou Časomíru jako dosavadní jistotu, druhá nový systém na testovacím zařízení vedle.
3. Po závodě porovnat výsledky obou systémů (stejná validace jako v §9.3, bod 3).
4. Rozhodnutí o plném přechodu až po 1–2 závodech s shodou výsledků a bez provozních incidentů — odpovídá Fázi 2/3 v [10-roadmap.md](10-roadmap.md).

## 9.5 Rizika a jejich zmírnění

| Riziko | Zmírnění |
|---|---|
| Skryté detaily VBA logiky (formuláře jsou zkompilované, nedostupné) ovlivňují hraniční případy výpočtu (např. přesné pravidlo pro tie-break, zaokrouhlení penalizace) | Validace na reálných datech (§9.3 bod 3) odhalí rozdíly; u nejasných pravidel konzultace s organizátorem/autorem staré aplikace |
| Ruční rekonstrukce řetězce oprav v `tblZaznamy` bez explicitního odkazu na "opravovaný" řádek může být nejednoznačná u více rychlých oprav za sebou | Pro historická data (ne živý provoz) postačuje heuristika podle pořadí a `startovnicislo`; u nejednoznačných případů ponechat `nahrazuje_zaznam_id = null` a označit `NEEDS_REVIEW` k ruční kontrole |
| Organizátor nedůvěřuje novému systému po jediném špatném závodě | Vynutit souběžný provoz (§9.4) jako proces, ne doporučení — starý systém zůstává dostupný jako pojistka po definovanou dobu |
| GDPR — migrovaná osobní data ze starých závodů | Aplikovat retenční politiku z [08-security.md §8.7](08-security.md) i na migrovaná historická data, ne jen nově vznikající |
