---
titulek: Mezičasy a kontrolní stanoviště
sekce: Den závodu
poradi: 2
popis: Jak měřit průběžné kontrolní body na trati, ne jen cíl.
klicova: mezicas kontrolni stanoviste bod na trati
---

Kromě cílového doběhu umí Depo zaznamenat i průběžné **mezičasy** na libovolných kontrolních bodech trati — hodí se pro kontrolu, že závodník trať skutečně absolvoval celou, nebo pro průběžné časy u delších tratí.

## Jak otevřít mezičasové stanoviště

Obrazovka pro mezičas je stejná jako [Měření](/napoveda/mereni), jen s parametrem `bod=mezicas` v adrese:

```
/mereni/ID-trasy?bod=mezicas
```

Nahoře se pak místo „Startovní číslo“ zobrazuje „Mezičas — startovní číslo“ a barva zadaného čísla je zelená místo oranžové, ať je na první pohled jasné, že jde o jiný typ zápisu než cílový doběh.

## Rozdíl oproti cílovému zápisu

- Mezičas se **nezapočítává do výsledků a pořadí** — slouží jen jako informace, na rozdíl od cíle (typ DOJEZD).
- Na mezičasovém stanovišti se **neřeší kolize mezi zařízeními** stejně přísně jako v cíli — běžec logicky prochází víc kontrolními body, takže víc záznamů od různých zařízení je tam očekávané, ne podezřelé.
- Poslední zaznamenaný mezičas závodníka se zobrazuje na jeho [osobním výsledku](/napoveda/osobni-vysledek), pokud existuje.

## Kolik stanovišť můžete mít

Libovolně — každé stanoviště je jen jiné otevřené okno/zařízení se stejným odkazem (`?bod=mezicas`), žádné se nemusí nikde zvlášť zakládat. Obsluha na každém stanovišti zapisuje čísla běžců, jak jimi projíždí.
