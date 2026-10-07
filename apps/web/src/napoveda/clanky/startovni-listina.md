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

V sekci **Zapsat závodníka** jsou povinné údaje označené hvězdičkou (*) — stejné jako ve [veřejné registraci](/napoveda/online-registrace):

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

Pokud používáte [online registraci](/napoveda/online-registrace), objeví se nad listinou sekce **K přidělení** se seznamem lidí, kteří se zaregistrovali sami, ale ještě nemají startovní číslo. U každého zadáte číslo a potvrdíte **Přidělit** — teprve tím vznikne skutečná přihláška v listině. Registraci, která nemá vzniknout (duplicita, spam), tlačítkem **Zamítnout** smažete bez založení přihlášky.

## Přehled listiny

Tabulka pod formulářem ukazuje všechny zapsané závodníky (v pohledu „Všechny tratě" i s tratí) — číslo, jméno, kategorii, členy družstva (pokud jde o štafetu), přiřazený RFID čip, zaplaceno a stav.

## Zaplaceno

Sloupec **Zaplaceno** je ruční zaškrtávátko pro evidenci úhrady startovného — appka žádnou platbu sama nezpracovává, jen si tu poznamenáte, kdo už zaplatil. U zaplaceného závodníka s vyplněným e-mailem se pod zaškrtávátkem objeví tlačítko **Odeslat potvrzení** — appka mu pošle e-mail „Platba přijata" s jeho **startovním číslem** (a případně částkou startovného). E-mail se neposílá automaticky při zaškrtnutí, odešle ho až vaše kliknutí. Po odeslání u závodníka uvidíte **datum a čas odeslání** a tlačítko se změní na **Odeslat znovu** (před opakovaným odesláním se appka zeptá). Pokud odeslání selže (např. není nastavený SMTP), appka to ohlásí a čas odeslání se nezapíše. U závodníka bez e-mailu je jen poznámka „bez e-mailu". Nastavení platby a QR kódu do potvrzovacího e-mailu najdete v [Online registraci](/napoveda/online-registrace#potvrzovaci-e-mail-a-platba-startovneho).

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
