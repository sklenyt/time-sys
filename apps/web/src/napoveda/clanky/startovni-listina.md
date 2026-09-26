---
titulek: Startovní listina
sekce: Příprava závodu
poradi: 3
popis: Ruční zápis závodníků, přehled listiny, přidělování čísel, platby a export do XLSX.
klicova: startovka prihlasky zavodnici zapsat export xlsx zaplaceno
---

Startovní listinu najdete v levém menu pod položkou **Startovní listina** u konkrétní trati.

## Ruční zápis na místě

V sekci **Zápis na místě** vyplňte:

- **Číslo** — startovní číslo (povinné, musí být na trati unikátní).
- **Příjmení**, **Jméno** — povinné.
- **Ročník**, **Pohlaví** — volitelné, ale díky nim Depo [navrhne kategorii](/napoveda/kategorie) automaticky.
- **Kategorie** — povinná. Pokud ji Depo navrhlo samo, pole se předvyplní a pod formulářem se objeví poznámka; klidně ji přepište, pokud nesedí.

Klikněte na **Přidat do listiny**. Pokud chcete zapsat víc lidí najednou, rychlejší je [Import z CSV](/napoveda/import-csv).

Chcete-li zapsat štafetu nebo družstvo běžící pod jedním startovním číslem, zaškrtněte **Štafeta/družstvo** — víc v [Štafety a družstva](/napoveda/stafety-a-druzstva).

## K přidělení — čekající online registrace

Pokud používáte [online registraci](/napoveda/online-registrace), objeví se nad listinou sekce **K přidělení** se seznamem lidí, kteří se zaregistrovali sami, ale ještě nemají startovní číslo. U každého zadáte číslo a potvrdíte **Přidělit** — teprve tím vznikne skutečná přihláška v listině. Registraci, která nemá vzniknout (duplicita, spam), tlačítkem **Zamítnout** smažete bez založení přihlášky.

## Přehled listiny

Tabulka pod formulářem ukazuje všechny zapsané závodníky — číslo, jméno, kategorii, členy družstva (pokud jde o štafetu), přiřazený RFID čip, zaplaceno a stav.

## Zaplaceno

Sloupec **Zaplaceno** je ruční zaškrtávátko pro evidenci úhrady startovného — appka žádnou platbu sama nezpracovává, jen si tu poznamenáte, kdo už zaplatil. Nastavení platby a QR kódu do potvrzovacího e-mailu najdete v [Online registraci](/napoveda/online-registrace#potvrzovaci-e-mail-a-platba-startovneho).

## Export do XLSX

Tlačítko **Export do XLSX** stáhne celou startovní listinu do Excelu — na rozdíl od veřejného exportu výsledků obsahuje i kontaktní údaje (e-mail, telefon, nouzový kontakt, zdravotní poznámka) a stav platby. Export je dostupný jen po přihlášení, nikdy veřejně.

## DNS / DNF / DQ

U každého závodníka jde v posledním sloupci nastavit stav:

- **DNS** (Did Not Start) — na start se nedostavil.
- **DNF** (Did Not Finish) — odstoupil na trati.
- **DQ** (Disqualified) — diskvalifikován.

Výchozí hodnota je „v pořádku“ (žádný z těchto stavů). Nastavení kteréhokoli z nich vyřadí závodníka z klasifikace ve výsledcích a z počtu „na trati“ v přehledu [Kdo ještě běží](/napoveda/kdo-jeste-bezi).

## Uzavření registrace

Pokud používáte i [online registraci](/napoveda/online-registrace), lze ji ve Správě akcí tlačítkem **Uzavřít registraci** dočasně zastavit (typicky těsně před startem) — ruční zápis přímo ve Startovní listině tím není nijak omezen, funguje vždy.
