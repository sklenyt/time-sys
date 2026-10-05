---
titulek: Vložení na váš web (embed)
sekce: Výsledky
poradi: 6
popis: Vložení živých výsledků nebo registračního formuláře přímo do stránky vašeho webu jako iframe.
klicova: embed iframe vlozit web vysledky registrace vlastni stranka
---

Kromě samostatného odkazu na výsledky nebo registraci ([Veřejné výsledky](/napoveda/verejne-vysledky), [Online registrace](/napoveda/online-registrace)) jde obojí vložit přímo do stránky vašeho vlastního webu jako `<iframe>` — návštěvník tak nikam neodchází, vidí to rovnou u vás.

## Kde odkazy najít

Ve **Správě akcí** u konkrétní trati:

- **Embed výsledků** — zkopíruje kód pro vložení živých výsledků.
- **Embed registrace** — zkopíruje kód pro vložení registračního formuláře.

Appka kód zobrazí v dialogovém okně, odkud ho zkopírujete (Ctrl+C / Cmd+C) a vložíte do zdrojového kódu své stránky, tam kde chcete, aby se výsledky/formulář objevily.

## Jak kód vypadá

Výsledky:

```html
<iframe src="https://app.depotime.cz/embed/vysledky/ID-trasy" width="360" height="480" style="border:0"></iframe>
```

Registrace (formulář je vyšší, proto výška 640):

```html
<iframe src="https://app.depotime.cz/embed/registrace/ID-trasy" width="360" height="640" style="border:0"></iframe>
```

Appka vám kód vygeneruje s vaším konkrétním `ID-trasy`, nemusíte ho psát ručně. Embed registrace ukazuje formulář jen u tratě s otevřenou registrací, jinak návštěvník uvidí hlášku, že je registrace uzavřená. Odkaz „Depo" v embedu vede na depotime.cz.

Šířku a výšku (`width`, `height`) můžete v kódu libovolně upravit podle místa, které máte na svém webu k dispozici — appka uvnitř sama scrolluje, pokud se obsah nevejde.

## Rozdíl oproti přímému odkazu

Embed verze je zjednodušená — bez horní navigace a hledání, jen samotná tabulka výsledků nebo formulář, ať vizuálně zapadne do vašeho webu. Pro plnou verzi se všemi funkcemi (vyhledávání, filtrování podle kategorie, stažení PDF/XLSX) použijte přímý odkaz z [Veřejných výsledků](/napoveda/verejne-vysledky).
