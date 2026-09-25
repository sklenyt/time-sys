---
titulek: RFID čipy
sekce: Příprava závodu
poradi: 6
popis: Párování čipů se závodníky, evidence vratných záloh a napojení RFID čtečky.
klicova: rfid cip cipova casomira ctecka zaloha vraceni
---

Depo umí kombinovat ruční zápis a čipovou časomíru — obojí se zapisuje do stejné startovní listiny a výsledků.

## Přiřazení čipu závodníkovi

Párování čipu se dělá **ve Startovní listině**, v tabulce u konkrétního závodníka, sloupec **Čip**:

1. Naskenujte nebo napište sériové číslo čipu do pole a klikněte na **Přiřadit**.
2. Čip se zobrazí s výchozím stavem „přiřazen“.
3. Tlačítkem **Odebrat** čip od závodníka zase odpojíte (např. při výměně).

## Přehled čipů — stránka Čipy

Obrazovka **Čipy** (levé menu) ukazuje přehled nad všemi vydanými čipy dané trati — nezávisí na tom, kolik závodníků máte, ale kolik čipů je aktuálně venku.

- **Naskenujte čip** — vyhledávací pole nahoře funguje stejně jako čtečka na Měření: přiložení čipu ho „napíše“ jako text a odešle. Pokud se čip najde, ukáže se karta se startovním číslem, jménem a tlačítkem **Potvrdit vrácení**. Pokud se nenajde, appka nabídne přiřazení k zadanému startovnímu číslu rovnou odtud (bez nutnosti jít do Startovní listiny).
- **Stavy čipu**: přiřazen, záložní, ztracen, vrácen — dají se měnit přímo v tabulce.
- **Záloha (Kč)** — evidence vratné zálohy za čip, editovatelná přímo v tabulce.
- **Export nevrácených (CSV)** — stáhne seznam všech čipů, které ještě nejsou označené jako vrácené, s výší zálohy — hodí se pro vyúčtování po závodě.

## Napojení RFID čtečky (Local Capture Agent)

Přímé napojení RFID decodéru na Depo řeší malá doplňková služba běžící na časoměřičském notebooku vedle decodéru (tzv. Local Capture Agent), která překládá kód čipu na startovní číslo a posílá zápis do Depa stejnou cestou jako ruční zápis. Tahle část je určená pro pokročilejší, hardwarové nasazení konkrétního typu čtečky — bez ní Depo funguje plnohodnotně i na ruční zápis nebo naskenování čipu do pole na obrazovce Čipy.
