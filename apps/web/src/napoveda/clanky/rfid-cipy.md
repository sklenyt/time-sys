---
titulek: RFID čipy
sekce: Příprava závodu
poradi: 6
popis: Sklad čipů organizace, přiřazení závodníkům, evidence záloh a napojení RFID čtečky.
klicova: rfid cip cipova casomira ctecka zaloha vraceni sklad jednorazovy opakovany presun
---

Depo umí kombinovat ruční zápis a čipovou časomíru — obojí se zapisuje do stejné startovní listiny a výsledků.

## Sklad čipů organizace

Čipy se evidují **ve skladu organizace**. Fyzický čip tak existuje napříč závody: koupíte ho jednou, půjčíte na víc akcí a vždycky víte, kde je. Sklad najdete v levém menu **Čipy** v záložce **Sklad organizace**.

Každý čip má:
- **Kód čipu** (sériové číslo, které čtečka „napíše“ jako text),
- **Typ**: **opakovaný** (po závodě se vrací do skladu) nebo **jednorázový** (zůstává závodníkovi, nepočítá se mezi nevrácené),
- **Stav**: skladem, vydán, ztracen nebo vyřazen,
- volitelný **štítek** (např. číslo natištěné na těle čipu).

### Jak čipy do skladu dostat

V záložce **Sklad organizace** je pole **Přidat čipy do skladu**. Naskenujte čip za čipem (čtečka po každém sama odešle Enter, takže každý kód skončí na novém řádku), nebo vložte seznam kódů oddělených řádky, čárkami či mezerami. Vyberte typ (opakovaný/jednorázový) a klikněte na **Přidat do skladu**. Kódy, které už ve skladu jsou, se přeskočí.

Čip, který ještě ve skladu není, se přidá i sám při prvním přiřazení závodníkovi, takže zápis na prezenci nezdržuje.

### Práce se skladem

- **Filtry**: Všechny, Skladem, Vydané, Ztracené a vyřazené, plus hledání podle kódu, štítku nebo jména.
- **Typ a stav** se mění přímo v tabulce. Čip, který je právě vydaný, se ručně přepnout nedá, nejdřív ho vraťte nebo odeberte závodníkovi.
- **Smazat** jde jen čip, který ještě nikdy nebyl vydaný. Čip s historií označte jako vyřazený.
- **Vydáno komu** u vydaných čipů ukazuje číslo, jméno závodníka, akci a trať.

### Přesun do skladu jiné organizace

Super admin může označit čipy se stavem **skladem** (zaškrtávátko vlevo) a pomocí **Přesunout vybrané do…** je přesunout do skladu jiné organizace, například když stejnou sadu čipů použije na akci jiného klubu. Přesouvají se jen volné čipy, které cílová organizace ještě nemá. Ostatní uživatelé tuhle volbu nevidí.

## Přiřazení čipu závodníkovi

Přiřazení se dělá **ve Startovní listině** v tabulce u konkrétního závodníka, sloupec **Čip**:

1. Klikněte na **Přiřadit**. Naskenujte nebo napište sériové číslo čipu. Pole nabízí volné čipy ze skladu.
2. Pokud kód ve skladu není, objeví se výběr typu (opakovaný/jednorázový) a čip se při přiřazení přidá do skladu.
3. Čip se zobrazí s výchozím stavem „přiřazen“. Ve skladu přejde do stavu „vydán“.
4. Tlačítkem **Odebrat** čip od závodníka odpojíte, čip se vrátí do skladu jako volný.

Depo nepřiřadí čip, který je právě vydaný jinému závodníkovi, ani čip označený ve skladu jako ztracený nebo vyřazený.

## Přehled čipů — stránka Čipy

Obrazovka **Čipy** má dvě záložky. **Vydané na této trati** ukazuje čipy, které jsou na dané trati právě vydané, **Sklad organizace** všechny čipy organizace.

- **Najít čip** — pole nahoře funguje stejně jako čtečka na Měření: přiložení čipu ho „napíše“ jako text a odešle. Appka řekne, kde čip je:
  - **vydaný na této trati**: ukáže se startovní číslo, jméno a tlačítko **Potvrdit vrácení** (u jednorázového čipu jen informace, že zůstává závodníkovi),
  - **vydaný jinde**: ukáže kdo, na které akci a trati, aby se vrátil tam,
  - **skladem**: nabídne přiřazení k zadanému startovnímu číslu rovnou odtud,
  - **ztracený nebo vyřazený**: nabídne **Vrátit mezi dostupné**,
  - **neznámý**: nabídne **Přidat do skladu a přiřadit** nebo jen **Jen přidat do skladu**, včetně výběru typu.
- **Stavy vydaného čipu**: přiřazen, záložní, ztracen, vrácen. Dají se měnit přímo v tabulce a promítají se do skladu: vrácený čip je zase skladem, ztracený je ve skladu ztracený.
- **Záloha (Kč)** — evidence vratné zálohy za čip, editovatelná přímo v tabulce.
- **K vrácení** — kolik opakovaných čipů je ještě venku. Jednorázové čipy se sem nepočítají.
- **Export nevrácených (CSV)** — stáhne seznam opakovaných čipů, které ještě nejsou vrácené, s výší zálohy. Hodí se pro vyúčtování po závodě.

## Napojení RFID čtečky (Local Capture Agent)

Přímé napojení RFID decodéru na Depo řeší malá doplňková služba běžící na časoměřičském notebooku vedle decodéru (tzv. Local Capture Agent), která překládá kód čipu na startovní číslo a posílá zápis do Depa stejnou cestou jako ruční zápis. Tahle část je určená pro pokročilejší, hardwarové nasazení konkrétního typu čtečky — bez ní Depo funguje plnohodnotně i na ruční zápis nebo naskenování čipu do pole na obrazovce Čipy.
