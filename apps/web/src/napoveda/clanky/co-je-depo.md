---
titulek: Co je Depo a jak funguje
sekce: Začínáme
poradi: 1
popis: Přehled toho, co Depo dělá a jak jednotlivé části appky do sebe zapadají.
klicova: uvod prehled co to je k cemu je to dobre
---

Depo je časomíra pro sportovní závody (běh, cyklistika, triatlon, orientační běh, běžky, inline brusle — cokoliv se startovními čísly), která běží celá v prohlížeči. Nepotřebujete žádnou instalaci ani speciální hardware — stačí telefon nebo tablet.

## Co Depo pokrývá

- **Startovní listinu** — ruční zápis na místě nebo import z CSV, automatický návrh kategorie podle ročníku a pohlaví.
- **Měření v cíli** — zadání startovního čísla a Enter, funguje i bez připojení k internetu.
- **RFID čipy** — pokud používáte čipovou časomíru, Depo umí párovat čipy se závodníky a přijímat zápisy z čtečky.
- **Živé výsledky** — veřejná stránka s výsledky, která se aktualizuje v reálném čase, bez nutnosti se kamkoliv přihlašovat.
- **Kiosk** — celoobrazovkové zobrazení výsledků pro televizi nebo monitor v cíli.
- **Publikaci na váš web** — automatický export výsledků na klubový web přes FTP/SFTP, nebo vložení jako `<iframe>`.
- **Reporty** — traťové rekordy a historie výkonů konkrétního běžce napříč všemi vašimi závody.

## Jak je appka rozdělená

Depo běží na třech doménách se stejným obsahem, jen s jinou výchozí obrazovkou:

- **[depotime.cz](https://depotime.cz)** — veřejný marketingový web s popisem appky.
- **[app.depotime.cz](https://app.depotime.cz)** — samotná aplikace pro organizátory: přihlášení, správa akcí, měření, výsledky.
- **[vysledky.depotime.cz](https://vysledky.depotime.cz)** — veřejný seznam všech závodů, které mají organizátoři vypsané jako veřejné.

Pro každodenní práci s Depem si zapamatujte hlavně `app.depotime.cz` — tam se přihlašujete a odtud spravujete své akce.

## Offline-first — proč je to důležité

Měření je navržené tak, aby fungovalo i bez signálu. Každý zápis se nejdřív uloží lokálně v prohlížeči (do IndexedDB) a teprve pak se na pozadí odešle na server — pokud signál zrovna vypadne, zápis se prostě odešle později, jakmile se připojení obnoví. Nic se neztratí a obsluha na stanovišti nemusí čekat na potvrzení ze serveru. Víc v [Měření — zápis čísla a offline režim](/napoveda/mereni).

## Kam dál

- [Registrace a přihlášení](/napoveda/registrace-a-prihlaseni) — jak si založit účet.
- [První závod krok za krokem](/napoveda/prvni-zavod) — od nuly k prvním výsledkům za pár minut.
