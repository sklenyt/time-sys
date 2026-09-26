---
titulek: Online registrace závodníků
sekce: Příprava závodu
poradi: 7
popis: Veřejný registrační formulář, potvrzovací e-mail s QR platbou a ruční přidělení startovního čísla.
klicova: registrace formular online prihlaska sam potvrzovaci email platba qr
---

Vedle ručního zápisu a importu CSV umí Depo nabídnout i veřejný formulář, kde se závodníci zapíšou sami — bez přihlášení, bez účtu.

## Odkaz na formulář

Ve **Správě akcí** u dané trati klikněte na **Registrace** — appka ukáže odkaz ve tvaru `depotime.cz/registrace/ID-trasy`. Odkaz můžete sdílet kdekoliv (web, sociální sítě, plakát s QR kódem).

## Co formulář obsahuje

- Jméno, příjmení, ročník narození, pohlaví (volitelné, ale díky nim se [kategorie navrhne automaticky](/napoveda/kategorie)).
- Kategorie — povinná, pokud ji Depo nedokáže dopočítat z ročníku a pohlaví, musí ji závodník vybrat sám.
- Klub — volitelné.
- E-mail, telefon — volitelné kontaktní údaje.
- Nouzový kontakt — jméno a telefon osoby pro případ nouze na trati.
- Zdravotní poznámka — volitelné (alergie, léky apod.).
- E-mail pro oznámení o doběhu — pokud ho závodník vyplní, přijde na něj automatický e-mail ve chvíli, kdy proběhne cílem (hodí se pro rodinu/blízké, kteří čekají doma).

Startovní číslo se nepřiděluje automaticky — odeslaný formulář vytvoří jen **čekající registraci**. Číslo jí musíte ručně přidělit ve [Startovní listině](/napoveda/startovni-listina) v sekci „K přidělení", teprve pak se závodník počítá do listiny, měření i výsledků. Díky tomu máte plnou kontrolu nad číslováním a můžete registraci před přidělením čísla i zamítnout (např. u duplicit nebo spamu).

## Potvrzovací e-mail a platba startovného

Pokud závodník ve formuláři vyplní e-mail, appka mu ihned pošle potvrzovací e-mail, že registraci přijala. Text i platební údaje si nastavíte ve **Správě akcí** u dané trati tlačítkem **Potvrzovací e-mail / platba**:

- **Vlastní text** — libovolná zpráva navíc (pokyny k platbě, odkaz na startovní listinu apod.).
- **Číslo účtu** — český formát `předčíslí-číslo/kódBanky` (např. `19-2000145399/0800`), předčíslí je nepovinné.
- **Startovné v Kč** — částka, která se má vybrat.

Když vyplníte číslo účtu i částku, appka do e-mailu automaticky přidá **QR platbu** (česká QR Platba, formát SPAYD) — závodník ji naskenuje bankovní aplikací a rovnou zaplatí. Chybně vyplněné číslo účtu registraci nezablokuje, jen se e-mail pošle bez QR kódu. Bez SMTP nastavení appka e-mail jen tiše nepošle — samotná registrace tím není ovlivněná.

## Ruční kontrola platby

Ve Startovní listině má každý závodník zaškrtávátko **Zaplaceno** — jde o čistě ruční evidenci, appka žádnou platbu sama nezpracovává ani neověřuje, jen vám pomáhá sledovat, kdo už startovné uhradil.

## Uzavření a otevření registrace

Ve Správě akcí tlačítkem **Uzavřít registraci** formulář dočasně zastavíte (typicky těsně před startem) — návštěvníci uvidí informaci, že registrace je uzavřená. Tlačítkem **Otevřít registraci** ji znovu zpřístupníte. Ruční zápis a import CSV fungují vždy, uzavření se týká jen tohoto veřejného formuláře.

## Vložení formuláře na váš web

Pokud chcete formulář rovnou na svém webu, ne jen jako odkaz, použijte **Embed registrace** — víc v [Vložení na váš web (embed)](/napoveda/embed-na-web).
