---
titulek: Organizace, akce a tratě
sekce: Příprava závodu
poradi: 1
popis: Jak je struktura Depa poskládaná a co všechno jde nastavit ve Správě akcí.
klicova: sprava akci zalozit zavod trasa smazat prejmenovat ukoncit datum probehlo propadla autodetekce
---

## Struktura dat v Depu

- **Organizace** — nejvyšší úroveň, typicky název klubu nebo pořadatele. Slouží hlavně k tomu, aby [reporty](/napoveda/reporty-a-export) (traťové rekordy, historie běžce) fungovaly napříč všemi vašimi závody.
- **Akce** — konkrétní závod v konkrétní den (např. „Jarní běh Mělník 2026“).
- **Trať** — jedna disciplína/trasa v rámci akce (např. „10 km“, „21 km“). Akce může mít víc tratí zároveň.

Všechno se spravuje na jednom místě — ve **Správě akcí** (`/sprava`), do které se dostanete z levého menu. Máte-li víc aktivních akcí, je v levém menu nahoře pole **Akce**, kterým přepínáte, se kterou akcí pracujete. Trať se vybírá přímo na obrazovce záložkami nad obsahem (Startovní listina, Čipy, Kdo ještě běží, Kolize, Audit log) — aktuální trať je zvýrazněná. Ukončené akce v nabídce nejsou.

## Založení akce a tratě

1. Pokud nemáte organizaci, založte ji na začátku stránky — stačí název.
2. V sekci **Nová akce** zadejte název a datum a klikněte na **Založit akci**. Tím se vám automaticky přiřadí role správce (admin) k téhle akci.
3. U akce zadejte název trasy do pole dole a klikněte na **Přidat trasu**.

## Co jde u akce nastavit

U každé aktivní (neukončené) akce máte v horní liště tlačítka **Kiosk (celá akce)**, **Lidé s přístupem** a nabídku **Více** (po kliknutí se rozbalí; zavřete ji klikem mimo nebo klávesou Esc). Konkrétně:

- **Více → Přejmenovat** — změní název akce.
- **Více → Heslo výsledků** — nastaví heslo, které musí návštěvníci zadat, než uvidí výsledky přes veřejný seznam na `vysledky.depotime.cz`. Víc v [Heslo k výsledkům](/napoveda/heslo-vysledku).
- **Kiosk (celá akce)** — odkaz na celoobrazovkový kiosk, který sám rotuje mezi všemi tratěmi akce. Víc v [Kiosk pro promítání v cíli](/napoveda/kiosk).
- **Více → Kopie e-mailů** — adresa, na kterou se posílá kopie (v e-mailu je vidět jako Cc) potvrzení registrace a platby závodníkům téhle akce (hodí se pro organizátora, ať ví, co se odeslalo). Nastavuje se zvlášť pro každou akci, prázdné pole kopii zruší. Nastavená adresa je vidět pod datem akce.
- **Lidé s přístupem** — rozbalí seznam lidí s přístupem k akci a umožní pozvat kolegu s rolí.
- **Více → Ukončit akci** — schová akci z živého Přehledu (Dashboard), ale nic nemaže. Kdykoliv jde položkou **Více → Obnovit akci** vrátit zpět. Ukončená akce se automaticky zavírá i pro startovní listinu a měření — je to určené pro už dokončené závody.
- **Více → Smazat akci** — nevratně smaže akci i se všemi tratěmi, přihláškami a naměřenými časy. Appka se před smazáním ptá na potvrzení.

## Co jde nastavit u tratě

U jednotlivé trati (v seznamu pod akcí) vidíte u názvu stav registrace („registrace otevřená/uzavřená"), případně čas, kdy trať odstartovala. Vedle toho jsou tlačítka **Start**, **Dokončit** a rozbalovací nabídky **Registrace**, **Zobrazení** a **Další**:

- **Start** — spustí start vlny (od tohoto okamžiku běží čas). Pokud trať už odstartovala, appka se před opětovným startem zeptá — nový start by přepsal čas startu a tím i časy všech závodníků.
- **Naplánovat start** (tlačítko pod tratí) — místo ručního tlačítka zadáte čas a Depo trať spustí sám přesně v ten okamžik, i kdybyste zrovna neseděli u počítače. Naplánovaný čas i odpočet vidíte přímo pod tratí, plán jde kdykoliv zrušit tlačítkem **Zrušit plán**.
- **Dokončit / Otevřít znovu** — označí trať jako dokončenou (jen informativní stav, nic neuzamyká).
- **Registrace → Odkaz na formulář** — zobrazí odkaz na veřejný registrační formulář, kde se mohou závodníci přihlásit sami. Víc v [Online registrace závodníků](/napoveda/online-registrace).
- **Registrace → Otevřít/Uzavřít registraci** — dočasně zavře veřejný formulář (např. těsně před startem).
- **Registrace → Potvrzovací e-mail / platba** — text potvrzovacího e-mailu, číslo účtu a startovné.
- **Registrace → Embed registrace** a **Zobrazení → Embed výsledků** — kód `<iframe>` pro vložení registračního formuláře nebo živých výsledků přímo na váš vlastní web. Víc v [Vložení na váš web (embed)](/napoveda/embed-na-web).
- **Zobrazení → Kiosk trati** — odkaz na kiosk jedné konkrétní trati.
- **Další → Změnit počet kol** — upraví počet kol tratě (víc v [Víckolové závody](/napoveda/vickolove-zavody)). Pokud už trať odstartovala, appka před změnou upozorní, že se můžou změnit výsledky.
- **Další → Smazat trať** — nevratně smaže trať se vším, co k ní patří.

## Aktivní vs. ukončená akce

Startovní listina, měření a další pracovní obrazovky jdou otevřít jen pro **aktivní** (neukončenou) akci — je to záměrná pojistka, ať vám omylem nepřijde na obrazovku ukončeného, dávno hotového závodu při procházení přes poslední navštívenou trať. Pokud otevřete odkaz na trať z ukončené akce, appka vás vyzve k výběru jiné aktivní akce.

## Upozornění „Datum proběhlo“

Pokud datum akce už uplynulo a žádná její trať vůbec neodstartovala, appka u akce ve Správě zobrazí oranžové upozornění **⚠ Datum proběhlo** — typicky se zapomnělo kliknout na Ukončit akci, nebo se závod nakonec nekonal. Je to jen upozornění, appka sama od sebe nic neskrývá ani nezamyká — pokud se závod jen zpozdil, klidně ho i tak spusťte tlačítkem **Start**. Totéž se automaticky promítne i do veřejných [Výsledků](/napoveda/verejne-vysledky) a [Kiosku](/napoveda/kiosk) (ukážou „UKONČENO“ místo zavádějícího „PŘED STARTEM“) a do [veřejného adresáře](/napoveda/verejne-vysledky#verejny-adresar-vsech-zavodu) na `vysledky.depotime.cz`.
