---
titulek: Veřejné výsledky
sekce: Výsledky
poradi: 1
popis: Živá stránka výsledků pro diváky a závodníky — bez přihlášení, bez instalace.
klicova: vysledky verejne zive divaci hledat filtr export pdf xlsx prepinac tratí adresar probihajici ukoncene
---

Každá trať má vlastní veřejnou stránku výsledků na adrese `depotime.cz/vysledky/ID-trasy` (odkaz najdete ve Správě akcí u dané trasy tlačítkem **Registrace**, případně vám ho dá kolega, který trasu zakládal). Stránka nevyžaduje žádné přihlášení a funguje na telefonu i na počítači.

## Veřejný adresář všech závodů

Na [vysledky.depotime.cz](https://vysledky.depotime.cz) je seznam všech veřejně vypsaných akcí — rozdělený na **Právě probíhající / nadcházející** (nahoře, zeleně) a **Ukončené** (dole, ztlumené). O to, do které skupiny akce patří, se stará tlačítko **Ukončit akci**/**Obnovit akci** ve Správě akcí — ukončené akce z adresáře nezmizí, jen se přesunou dolů, ať se stránka časem nezaplní starými závody.

## Co stránka ukazuje

- Název trasy a akce, štítek podle stavu: **PŘED STARTEM** (trať ještě neodstartovala), **● ŽIVĚ** (odstartovala a běží) nebo **UKONČENO** (organizátor ji ve Správě akcí označil jako dokončenou).
- Počet klasifikovaných, počet kategorií a případně počet neklasifikovaných (DNS/DNF/DQ nebo zatím bez doběhu).
- Tabulku výsledků: celkové pořadí, pořadí v kategorii, startovní číslo, jméno, klub, kategorii a čas.
- Samostatnou tabulku **Neklasifikovaní** dole, pokud nějací jsou.

## Živé aktualizace

Dokud trať běží, stránka se aktualizuje sama v reálném čase, jak přibývají nové doběhy — není potřeba ručně obnovovat. Technicky za tím stojí přímé spojení se serverem (SSE); pokud by z nějakého důvodu vypadlo, appka se sama přepne na běžné načítání dat.

## Přepínání mezi tratěmi akce

Má-li akce víc tratí (např. 5 km a 10 km), nad hledáním se zobrazí tlačítka s názvy všech tratí té akce — kliknutím se přepnete na výsledky jiné trati bez nutnosti vracet se do veřejného seznamu na `vysledky.depotime.cz`. Hledání a filtr kategorie se při přepnutí trati samy vyprázdní.

## Hledání a filtrování

Nahoře je pole pro hledání podle jména, startovního čísla nebo klubu, a pod ním (má-li trať víc než jednu kategorii) tlačítka pro filtrování podle kategorie.

## Stažení výsledků

Vpravo nahoře jsou tlačítka **Stáhnout XLSX** a **Stáhnout PDF** — stáhnou kompletní výsledky v daném formátu, se stejnými sloupci jako na obrazovce. PDF má vlastní tiskovou úpravu se značkou Depo v záhlaví i patičce každé strany (hodí se rovnou k vyvěšení v cíli), XLSX má nad tabulkou dva řádky s názvem trati a akce.

## Otevření z appky

Z aplikace (`app.depotime.cz`) vede položka **Výsledky** v levém menu rovnou na tuhle veřejnou stránku — otevře se v nové záložce na doméně `vysledky.depotime.cz`, ať organizátor neztratí rozdělanou práci v appce.

## Pořadí v kategorii — jak se počítá

Viz [Pořadí a kategorie ve výsledcích](/napoveda/poradi-a-kategorie).
