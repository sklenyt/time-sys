---
titulek: Štafety a družstva
sekce: Příprava závodu
poradi: 5
popis: Jak zapsat víc lidí pod jedno startovní číslo.
klicova: stafeta druzstvo tym vic lidi jedno cislo
---

Štafeta nebo družstvo běží v Depu pod **jedním startovním číslem** — jeden „kapitán“ je hlavní přihláška (ta, na kterou se zapisuje čas v cíli), ostatní členové jsou k ní přiřazení jako doplňkové jméno.

## Zápis ve Startovní listině

1. Vyplňte hlavní přihlášku (číslo, jméno, příjmení, kategorie) jako obvykle.
2. Zaškrtněte **Štafeta/družstvo (max 4 další členové pod tímto startovním číslem)**.
3. Objeví se pole pro až 4 další členy — u každého jde vyplnit příjmení, jméno, ročník a klub. Prázdné řádky se ignorují, není potřeba vyplňovat všechny čtyři.
4. Tlačítkem **+ Další člen** přidáte další řádek, pokud jich potřebujete víc než jeden.

## Zápis přes CSV

Ve stejném CSV souboru jako běžný zápis ([Import startovní listiny z CSV](/napoveda/import-csv)) přidejte sloupce `clen1_prijmeni`, `clen1_jmeno`, `clen1_rocnik`, `clen1_klub`, a stejně `clen2_*` až `clen4_*`. Šablona CSV ke stažení tyhle sloupce už obsahuje předpřipravené.

## Ve výsledcích a startovní listině

Ve startovní listině se jména členů zobrazí celá ve sloupci Družstvo. Ve výsledcích je u hlavního jména jen malý odznak s počtem dalších členů („+2“) — najetím myší (nebo podržením na dotykovém displeji) se ukáže jejich celý seznam. Čas, pořadí i kategorie se vždy počítají jen pro hlavní startovní číslo — Depo neumí měřit jednotlivé úseky štafety zvlášť, jen celkový čas týmu.
