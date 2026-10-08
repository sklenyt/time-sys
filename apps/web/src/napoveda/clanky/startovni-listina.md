---
titulek: Startovní listina
sekce: Příprava závodu
poradi: 3
popis: Ruční zápis závodníků, přehled listiny, přidělování čísel, platby a export do XLSX.
klicova: startovka prihlasky zavodnici zapsat export xlsx zaplaceno
---

Startovní listinu najdete v levém menu pod položkou **Startovní listina**. Otevře se pohled na **celou akci**; nad obsahem jsou záložky **Všechny tratě | 20km | 38km | …** (aktuální záložka je zvýrazněná). Ve všech tratích vidíte u každého řádku štítek tratě, na záložce konkrétní tratě pak jen její závodníky. Stejné záložky jsou nahoře i u Čipů, Kdo ještě běží, Kolizí a Audit logu. Máte-li víc aktivních akcí, přepnete akci polem **Akce** nahoře v levém menu.

Kategorie, import z CSV a export do XLSX se spravují na záložce konkrétní tratě (kategorie i soubory patří vždy jedné trati).

## Ruční zápis

Formulář se otevře tlačítkem **+ Zapsat závodníka** vpravo nad tabulkou (u každé záložky tratě je zpočátku skrytý). V sekci **Zapsat závodníka** jsou povinné údaje označené hvězdičkou (*) — stejné jako ve [veřejné registraci](/napoveda/online-registrace):

- **Trať** — vybíráte jen v pohledu „Všechny tratě"; na záložce tratě je dána záložkou a vidíte ji v nadpisu formuláře.
- **Startovní číslo** — musí být na trati unikátní.
- **Jméno**, **Příjmení**.
- **Ročník narození** a **Pohlaví**.
- **Kategorie** — vybíráte z kategorií zvolené tratě. Pokud ji Depo podle ročníku a pohlaví [navrhlo](/napoveda/kategorie), pole se předvyplní a pod formulářem se objeví poznámka; klidně ji přepište, pokud nesedí.
- **E-mail**.

V rozbalovací části **Další údaje (nepovinné)** je klub, telefon, nouzový kontakt a zdravotní poznámka.

Klikněte na **Přidat do listiny**. Pokud chcete zapsat víc lidí najednou, rychlejší je [Import z CSV](/napoveda/import-csv).

Chcete-li zapsat štafetu nebo družstvo běžící pod jedním startovním číslem, zaškrtněte **Štafeta/družstvo** — víc v [Štafety a družstva](/napoveda/stafety-a-druzstva).

## K přidělení — čekající online registrace

Pokud používáte [online registraci](/napoveda/online-registrace), objeví se nad listinou sekce **K přidělení** (s počtem čekajících) se seznamem lidí, kteří se zaregistrovali sami, ale ještě nemají startovní číslo. U každého vidíte jméno, e-mail, kategorii a čas registrace. Zadejte číslo do pole v řádku a potvrďte **Přidělit** — teprve tím vznikne skutečná přihláška v listině. V nabídce **⋯** u řádku jde opravit e-mail, znovu poslat potvrzení registrace, nebo registraci, která nemá vzniknout (duplicita, spam), **Zamítnout registraci** — smaže se bez založení přihlášky.

## Přehled listiny

Nahoře je souhrn: počet **závodníků**, kolik je **zaplaceno**, kolik registrací **čeká na číslo** a kolik závodníků je **bez e-mailu**. Pod ním je vyhledávání (jméno, startovní číslo nebo e-mail) a rychlé filtry **Všichni / Nezaplaceno / Bez čipu / DNS, DNF, DQ**. Tlačítko **+ Zapsat závodníka** otevře formulář pro ruční zápis (viz výše), **Export XLSX** stáhne listinu (na záložce konkrétní tratě).

Tabulka má jeden řádek na závodníka: startovní číslo, jméno s e-mailem pod ním (v pohledu „Všechny tratě" i štítek tratě), kategorii, RFID čip (**Přiřadit**, pokud ještě nemá), stav platby a stav **v pořádku / DNS / DNF / DQ**. U družstva je pod jménem seznam členů. Ostatní akce jsou v nabídce **⋯** na konci řádku.

## Smazání závodníka

V nabídce **⋯** u řádku zvolte **Smazat závodníka**. Appka se zeptá na potvrzení a pak smaže jeho přihlášku včetně osobních údajů a **uvolní startovní číslo**, takže ho můžete hned přidělit někomu jinému. Naměřené časy (průjezdy cílem) se nesmažou, zůstanou v logu měření jako nepřiřazené; ve výsledcích závodník zmizí. Čekající registraci (ještě bez čísla) smažete tlačítkem **Zamítnout** v sekci K přidělení. Akci nejde vrátit.

## Změna čísla, tratě a kategorie

V nabídce **⋯** u řádku zvolte **Upravit číslo, trať a kategorii**. Pod jménem se otevře malý editor, kde můžete změnit:

- **startovní číslo** — musí být volné na cílové trati, jinak appka změnu odmítne,
- **trať** (jen na jinou trať téže akce) — kategorie se předvyplní podle kódu na cílové trati (jinak první), případně ji změňte,
- **kategorii** — musí patřit k trati, na které závodník bude.

Přesun na jinou trať jde jen u závodníka, který ještě **nemá žádné naměřené záznamy**, jinak by naměřené časy patřily jiné trati, než na které je přihláška. Všechny změny se zapisují do [auditního logu](/napoveda/audit-log).

## E-mail závodníka: oprava a opětovné odeslání

E-mail závodníka je vidět pod jeho jménem (a v sekci **K přidělení**). Napsal-li ho špatně, otevřete nabídku **⋯** u řádku a zvolte **Upravit e-mail**, opravte ho a uložte. Volbou **Poslat potvrzení registrace znovu** pak odešlete potvrzení registrace (stejné jako po registraci, včetně QR platby a kopie, pokud ji u akce máte nastavenou) na opravenou adresu — před odesláním se appka zeptá a po odeslání ohlásí výsledek. Pokud odeslání selže (např. není nastavený SMTP), appka to ohlásí.

## Zaplaceno

Sloupec **Platba** ukazuje štítek **zaplaceno / nezaplaceno**, na který kliknutím přepnete stav — jde o ruční evidenci úhrady startovného, appka žádnou platbu sama nezpracovává, jen si tu poznamenáte, kdo už zaplatil. U zaplaceného závodníka s vyplněným e-mailem se pod štítkem objeví odkaz **odeslat** (resp. **odeslat znovu**) potvrzení — appka mu pošle e-mail „Platba přijata" s jeho **startovním číslem** (a případně částkou startovného). E-mail se neposílá automaticky při zaškrtnutí, odešle ho až vaše kliknutí. Po odeslání u závodníka uvidíte **datum a čas odeslání** a tlačítko se změní na **Odeslat znovu** (před opakovaným odesláním se appka zeptá). Pokud odeslání selže (např. není nastavený SMTP), appka to ohlásí a čas odeslání se nezapíše. U závodníka bez e-mailu je jen poznámka „bez e-mailu". Nastavení platby a QR kódu do potvrzovacího e-mailu najdete v [Online registraci](/napoveda/online-registrace#potvrzovaci-e-mail-a-platba-startovneho).

## Export do XLSX

Tlačítko **Export do XLSX** stáhne celou startovní listinu do Excelu — na rozdíl od veřejného exportu výsledků obsahuje i kontaktní údaje (e-mail, telefon, nouzový kontakt, zdravotní poznámka) a stav platby. Export je dostupný jen po přihlášení, nikdy veřejně.

## DNS / DNF / DQ

U každého závodníka jde v posledním sloupci nastavit stav:

- **DNS** (Did Not Start) — na start se nedostavil.
- **DNF** (Did Not Finish) — odstoupil na trati.
- **DQ** (Disqualified) — diskvalifikován.

Výchozí hodnota je „v pořádku“ (žádný z těchto stavů). Nastavení kteréhokoli z nich vyřadí závodníka z klasifikace ve výsledcích a z počtu „na trati“ v přehledu [Kdo ještě běží](/napoveda/kdo-jeste-bezi).

## Uzavření registrace

Pokud používáte i [online registraci](/napoveda/online-registrace), lze ji ve Správě akcí položkou **Registrace → Uzavřít registraci** dočasně zastavit (typicky těsně před startem) — ruční zápis přímo ve Startovní listině tím není nijak omezen, funguje vždy.
