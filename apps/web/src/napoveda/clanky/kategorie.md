---
titulek: Kategorie a automatický návrh
sekce: Příprava závodu
poradi: 2
popis: Jak založit kategorie a nechat Depo, ať samo navrhne tu správnou podle ročníku a pohlaví.
klicova: kategorie navrh rocnik pohlavi muzi zeny
---

Bez alespoň jedné kategorie nejde zapsat žádného závodníka do startovní listiny — kategorie je totiž povinná součást každé přihlášky (kvůli pořadí v kategorii ve výsledcích).

## Založení kategorie

Ve **Startovní listině** dané trati, v sekci **Kategorie**, vyplňte:

- **Kód** — krátká zkratka zobrazovaná ve výsledcích, např. „MUZ“ nebo „ZenyB“.
- **Název** — čitelný název, např. „Muži“ nebo „Ženy B“.
- **Pohlaví** — M nebo Z.
- **Ročník od / do** (volitelné) — rozmezí ročníků narození, pro které kategorie platí. Necháte-li prázdné, kategorie pokrývá libovolný ročník.

Klikněte na **Přidat kategorii**. Kategorii jde přidat i k trati, která už nějaké kategorie má, tlačítkem **+ Přidat kategorii**.

## Jak funguje automatický návrh

Když při zápisu závodníka (ručně nebo přes import CSV) vyplníte ročník narození a pohlaví, Depo se sám podívá, jestli existuje kategorie, do jejíhož ročníkového rozmezí a pohlaví závodník spadá, a předvyplní ji. Kategorie zůstává editovatelná — návrh je jen doplněk, nikdy se nic neuloží potichu bez potvrzení.

Pokud vypsanému ročníku odpovídá víc kategorií najednou (např. překrývající se rozmezí), Depo vybere jednu z nich, ale která to bude, není zaručené — pro spolehlivý výsledek mějte rozmezí kategorií vždy nepřekrývající se.

## Praktický příklad

| Kód | Název | Pohlaví | Ročník od | Ročník do |
|---|---|---|---|---|
| MUZ | Muži | M | — | — |
| ZENY | Ženy | Z | — | — |
| MUZ40 | Muži 40+ | M | — | 1986 |
| ZENY40 | Ženy 40+ | Z | — | 1986 |

Pozor: v tomhle příkladu se rozmezí kategorií „Muži“ a „Muži 40+“ překrývají (Muži nemá horní hranici), takže návrh je pro starší ročníky nespolehlivý — může padnout na kteroukoli z nich. Pro čisté rozdělení radši omezte i „obyčejnou“ kategorii horní hranicí ročníku (např. Muži: ročník od 1987).
