---
titulek: DNS, DNF, DQ
sekce: Den závodu
poradi: 5
popis: Jak vyřadit závodníka z klasifikace, když se nedostavil, odstoupil nebo byl diskvalifikován.
klicova: dns dnf dq diskvalifikace neodstartoval nedokoncil penalizace
---

Depo rozlišuje tři důvody, proč závodník nemá výsledný čas:

- **DNS** (Did Not Start) — na start se vůbec nedostavil.
- **DNF** (Did Not Finish) — na trati odstoupil.
- **DQ** (Disqualified) — byl diskvalifikován (např. zkrácení trati, nesportovní chování).

## Jak stav nastavit

Ve [Startovní listině](/napoveda/startovni-listina) dané trati má každý závodník v posledním sloupci rozbalovací nabídku se stavy — vyberte DNS, DNF nebo DQ. Výchozí hodnota je „v pořádku“, což znamená, že žádný z těchto stavů nenastal.

## Co se změnou stane

Nastavení kteréhokoli z těchto stavů:

- vyřadí závodníka z klasifikace ve výsledcích (nedostane pořadí ani čas),
- odečte ho z počtu „na trati“ v přehledu [Kdo ještě běží](/napoveda/kdo-jeste-bezi),
- přesune ho do souhrnného počtu „DNS/DNF/DQ“.

Zápis časů z Měření tím není nijak omezený — pokud byste omylem zapsali čas závodníkovi se stavem DQ, záznam v historii zůstane, jen se do výsledků nezapočítá.

## Časové penalizace

Datový model Depa počítá i s časovou penalizací (přičtení minut k výslednému času), appka ji ale zatím v uživatelském rozhraní nikde nenabízí k nastavení — dnes ji tedy nejde přes appku zadat.
