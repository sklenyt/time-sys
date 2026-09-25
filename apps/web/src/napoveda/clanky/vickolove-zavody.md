---
titulek: Víckolové závody
sekce: Den závodu
poradi: 6
popis: Jak měřit trať, kterou závodníci objíždí víckrát (okruhy).
klicova: kola okruh vickolovy zavod pocet kol
---

Pro tratě typu „okruh, který se jede vícekrát“ (typicky atletický ovál nebo kratší okruh) Depo umí sledovat, kolikáté kolo právě závodník dokončil, aniž byste museli mít samostatné číslo pro každé kolo.

## Nastavení počtu kol

Počet kol se zadává rovnou při zakládání trasy ve [Správě akcí](/napoveda/organizace-akce-a-trate) — vedle pole s názvem trasy je pole **Počet kol**. Necháte-li ho prázdné, trasa se založí jako jednokolová (běžný případ, žádný okruh). Trať s víc koly se v seznamu tratí pozná podle štítku „N× kolo“ u názvu.

V uživatelském rozhraní jde počet kol nastavit jen při založení trasy — u už existující trasy pole pro dodatečnou změnu není.

## Jak funguje zápis

Na obrazovce [Měření](/napoveda/mereni) se zapisuje stejně jako u jednokolové tratě — jen startovní číslo a Enter. Depo si samo počítá, kolikátý průjezd cílem daného čísla to je:

- Dokud počet průjezdů nedosáhne nastaveného počtu kol, závodník se v [Kdo ještě běží](/napoveda/kdo-jeste-bezi) a v seznamu **Poslední zápisy** zobrazuje s poznámkou „kolo X/Y“.
- Jakmile projede cílem naposledy (pocetKol-tý průjezd), tenhle průjezd se počítá jako finální doběh a dostane výsledný čas.

## Co to znamená pro obsluhu v cíli

Obsluha nemusí nijak rozlišovat „normální“ průjezd od finálního — zapisuje pořád stejně, Depo pozná poslední kolo samo podle nastaveného počtu kol trati. Pokud si nejste jistí, kolikáté kolo právě běžec má za sebou, ukáže vám to přehled Kdo ještě běží v reálném čase.
