---
titulek: Online registrace závodníků
sekce: Příprava závodu
poradi: 7
popis: Veřejný registrační formulář, potvrzovací e-mail s QR platbou a ruční přidělení startovního čísla.
klicova: registrace formular online prihlaska sam potvrzovaci email platba qr
---

Vedle ručního zápisu a importu CSV umí Depo nabídnout i veřejný formulář, kde se závodníci zapíšou sami — bez přihlášení, bez účtu.

## Odkaz na formulář

Ve **Správě akcí** u dané trati otevřete nabídku **Registrace** a zvolte **Odkaz na formulář** — appka ukáže odkaz ve tvaru `depotime.cz/registrace/ID-trasy`. Odkaz můžete sdílet kdekoliv (web, sociální sítě, plakát s QR kódem).

## Co formulář obsahuje

Povinné údaje jsou ve formuláři označené hvězdičkou (*):

- **Jméno a příjmení**.
- **Ročník narození** (čtyřmístný rok) a **pohlaví**.
- **Kategorie** — závodník ji vybírá sám ze seznamu kategorií dané trati (viz [Kategorie](/napoveda/kategorie)).
- **E-mail** — dostane na něj potvrzení registrace.
- **Souhlas se zpracováním osobních údajů** — zaškrtávací políčko s odkazem na [zásady ochrany osobních údajů](/zasady-ochrany-osobnich-udaju). Bez zaškrtnutí nejde registraci odeslat.

Nepovinné údaje:

- Klub.
- Telefon.
- Nouzový kontakt — jméno a telefon osoby pro případ nouze na trati.
- Zdravotní poznámka (alergie, léky apod.).
- E-mail pro oznámení o dojezdu — pole je zatím jen evidované; e-mail o dojezdu se neposílá na něj, ale na hlavní e-mail závodníka (viz níže).

Startovní číslo se nepřiděluje automaticky — odeslaný formulář vytvoří jen **čekající registraci**. Číslo jí musíte ručně přidělit ve [Startovní listině](/napoveda/startovni-listina) v sekci „K přidělení", teprve pak se závodník počítá do listiny, měření i výsledků. Díky tomu máte plnou kontrolu nad číslováním a můžete registraci před přidělením čísla i zamítnout (např. u duplicit nebo spamu).

## Potvrzovací e-mail a platba startovného

Na e-mail uvedený ve formuláři appka ihned pošle potvrzovací e-mail, že registraci přijala. Text i platební údaje si nastavíte ve **Správě akcí** u dané trati položkou **Registrace → Potvrzovací e-mail / platba**:

- **Vlastní text** — libovolná zpráva navíc (pokyny k platbě, odkaz na startovní listinu apod.).
- **Číslo účtu** — český formát `předčíslí-číslo/kódBanky` (např. `19-2000145399/0800`), předčíslí je nepovinné.
- **Startovné v Kč** — částka, která se má vybrat.
- **Náhled e-mailu** — rozbalovací sekce pod poli, která při psaní ukazuje, jak bude e-mail vypadat (předmět i text, s fiktivním jménem). QR platba je v náhledu jen zástupný obrázek, skutečný kód se vygeneruje až při odeslání.

Chcete-li dostávat kopie odeslaných potvrzení, nastavte u akce ve Správě akcí **Více → Kopie e-mailů** — platí pro potvrzení registrace i pro e-mail „Platba přijata".

E-mail obsahuje i **shrnutí údajů**, které závodník ve formuláři uvedl (jméno, ročník, kategorie, klub, kontakty, nouzový kontakt), aby si je mohl zkontrolovat. **Zdravotní poznámka se v e-mailu neuvádí** — je tam jen informace, že byla vyplněna (kvůli ochraně citlivých údajů).

Když vyplníte číslo účtu i částku, appka do e-mailu automaticky přidá **QR platbu** (česká QR Platba, formát SPAYD) — závodník ji naskenuje bankovní aplikací a rovnou zaplatí. Chybně vyplněné číslo účtu registraci nezablokuje, jen se e-mail pošle bez QR kódu. Bez SMTP nastavení appka e-mail jen tiše nepošle — samotná registrace tím není ovlivněná.

## E-mail po dojezdu

Když závodník proběhne cílem (u víckolových tratí po posledním kole), appka mu na e-mail uvedený při registraci pošle z adresy `vysledky@depotime.cz` e-mail „Gratulujeme, jste v cíli!" s jeho časem, startovním číslem a tlačítkem **Zobrazit výsledky akce**, které vede na veřejnou stránku výsledků akce (`vysledky.depotime.cz`), kde si vybere trať. E-mail se pošle jen závodníkům, kteří mají e-mail vyplněný, a jen pokud je nastavený SMTP.

## Ruční kontrola platby

Ve Startovní listině má každý závodník zaškrtávátko **Zaplaceno** — jde o čistě ruční evidenci, appka žádnou platbu sama nezpracovává ani neověřuje, jen vám pomáhá sledovat, kdo už startovné uhradil. U zaplaceného závodníka s vyplněným e-mailem se pod zaškrtávátkem objeví tlačítko **Odeslat potvrzení** — appka mu pošle e-mail „Platba přijata" s jeho **startovním číslem** (a případně částkou startovného). E-mail se neposílá automaticky při zaškrtnutí, odešle ho až vaše kliknutí. Po odeslání u závodníka uvidíte **datum a čas odeslání** a tlačítko se změní na **Odeslat znovu** (před opakovaným odesláním se appka zeptá). Pokud odeslání selže (např. není nastavený SMTP), appka to ohlásí a čas odeslání se nezapíše. U závodníka bez e-mailu je jen poznámka „bez e-mailu".

## Uzavření a otevření registrace

Ve Správě akcí položkou **Registrace → Uzavřít registraci** formulář dočasně zastavíte (typicky těsně před startem) — návštěvníci uvidí informaci, že registrace je uzavřená. Položkou **Registrace → Otevřít registraci** ji znovu zpřístupníte. Ruční zápis a import CSV fungují vždy, uzavření se týká jen tohoto veřejného formuláře.

## Vložení formuláře na váš web

Pokud chcete formulář rovnou na svém webu, ne jen jako odkaz, použijte **Embed registrace** — víc v [Vložení na váš web (embed)](/napoveda/embed-na-web).
