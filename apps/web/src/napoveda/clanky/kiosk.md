---
titulek: Kiosk pro promítání v cíli
sekce: Výsledky
poradi: 4
popis: Celoobrazovkové zobrazení výsledků pro televizi nebo monitor v cíli, se světlým i tmavým režimem.
klicova: kiosk televize monitor promitani obrazovka v cili
---

Kiosk je celoobrazovkové zobrazení výsledků bez jakéhokoliv ovládání — určené pro televizi nebo monitor viditelný pro diváky a závodníky přímo v cíli.

## Dva druhy kiosku

- **Kiosk jedné trati** — `depotime.cz/kiosk/ID-trasy`. Ukazuje výsledky jen jedné konkrétní trati/kategorie. Odkaz je ve Správě akcí u dané trasy, tlačítko **Kiosk**.
- **Kiosk celé akce** — `depotime.cz/kiosk-akce/ID-akce`. Sám automaticky rotuje mezi všemi tratěmi akce, ať nemusíte přepínat ručně. Odkaz je ve Správě akcí u akce, tlačítko **Kiosk (celá akce)**.

U kiosku celé akce jde interval rotace upravit přes `?interval=20` v adrese (počet vteřin na jedné trati, výchozí je 15). Rotaci jde i ručně přeskočit šipkami vlevo/vpravo na klávesnici.

## Co obrazovka ukazuje

Živě se aktualizující tabulka výsledků: pořadí, kategorie, pořadí v kategorii, jméno a čas — plus hodiny a štítek „● ŽIVĚ“. Tabulka se sama pomalu posouvá nahoru a dolů, pokud se výsledky nevejdou na jednu obrazovku najednou, s pauzou nahoře a dole, ať se dá čtení dohnat.

## Heslo u kiosku celé akce

Pokud má akce nastavené [heslo k výsledkům](/napoveda/heslo-vysledku), kiosk celé akce se na něj zeptá, než ukáže data. Kiosk jedné konkrétní trati (`/kiosk/ID-trasy`) heslo nevyžaduje — je určený pro přímý odkaz, který dostane jen obsluha, ne pro veřejné vyhledávání.

## Světlý a tmavý režim

Vpravo nahoře je přepínač ☀/☾ — hodí se přepnout na světlý režim třeba při silném slunci na monitoru venku. Volba se pamatuje pro tohle konkrétní zařízení/obrazovku.
