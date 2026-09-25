---
titulek: Import startovní listiny z CSV
sekce: Příprava závodu
poradi: 4
popis: Jak nahrát celý seznam závodníků najednou ze souboru CSV, včetně šablony a řešení chyb.
klicova: import csv excel tabulka hromadny zapis sablona
---

Import z CSV je rychlejší cesta než ruční zápis, když už máte seznam přihlášených v tabulce (Excel, Google Sheets apod.).

## Stažení šablony

Ve **Startovní listině** dané trati klikněte v sekci **Zápis na místě** na **Stáhnout šablonu CSV**. Stáhne se soubor se správnými názvy sloupců a jedním ukázkovým řádkem — upravte ho a doplňte další řádky.

## Sloupce

| Sloupec | Povinný | Popis |
|---|---|---|
| `cislo` | ano | Startovní číslo (musí být unikátní na dané trati). |
| `prijmeni` | ano | Příjmení. |
| `jmeno` | ano | Jméno. |
| `kategorie` | ne* | Kód kategorie (musí přesně odpovídat existující kategorii). |
| `rocnik` | ne | Ročník narození. |
| `pohlavi` | ne | `M` nebo `Z`. |
| `klub` | ne | Klub/oddíl. |
| `clen1_prijmeni` … `clen4_klub` | ne | Členové štafety/družstva, viz [Štafety a družstva](/napoveda/stafety-a-druzstva). |

\* Sloupec `kategorie` není povinný, pokud vyplníte `rocnik` a `pohlavi` — Depo si kategorii dopočítá stejně jako u ručního zápisu. Bez kategorie i bez ročníku+pohlaví import daného řádku selže.

## Nahrání souboru

Klikněte na **Choose File** vedle popisku sloupců, vyberte svůj CSV soubor — import proběhne automaticky hned po výběru souboru. Po dokončení appka ukáže, kolik řádků se importovalo a případné chyby s číslem řádku.

## Excel a středníky

České Excely při „Uložit jako CSV“ typicky použijí jako oddělovač středník (`;`), ne čárku — desetinná čárka by se jinak pletla s oddělovačem sloupců. Depo umí přečíst obojí (čárku i středník) automaticky, není potřeba nic přenastavovat.

## Časté chyby importu

- **„Chybí nebo neplatné startovní číslo“** — sloupec `cislo` je prázdný nebo obsahuje text místo čísla.
- **„... nešlo ji dopočítat“** (chybí kategorie) — řádek nemá `kategorie` ani `rocnik`+`pohlavi`, ze kterých by šla dopočítat.
- Startovní číslo, které je na trati už obsazené, se přeskočí s chybou u daného řádku — ostatní řádky se importují normálně.

Import je možné spustit opakovaně — už zapsaná čísla se nepřepíšou, jen skončí jako chyba u daného řádku.
