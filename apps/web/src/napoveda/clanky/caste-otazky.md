---
titulek: Časté otázky a řešení problémů
sekce: Časté otázky
poradi: 1
popis: Odpovědi na nejčastější dotazy — pomalé první přihlášení, stará verze appky, ztracený odkaz a další.
klicova: faq problem chyba nefunguje pomale nejde
---

## Přihlášení trvá dlouho — je appka rozbitá?

Ne. Server, který appku obsluhuje, se po delší době neaktivity sám uspí, aby zbytečně neběžel (a nestál) bez užitku. První požadavek po pauze ho musí probudit, což trvá pár vteřin — appka vám mezitím ukáže „Přihlašuji…“ s točícím se kolečkem. Další požadavky po probuzení jsou už rychlé.

## Vidím starou verzi appky (chybí nová funkce, kterou jste zrovna přidali)

Appka funguje i offline díky tomu, že si uloží svoji poslední verzi do prohlížeče. Po vydání nové verze se sama na pozadí stáhne a stránka se obnoví. Pokud i po chvíli vidíte pořád starou verzi, zkuste stránku tvrdě obnovit (Cmd+Shift+R na Macu, Ctrl+Shift+R jinde), případně zavřít a znovu otevřít kartu prohlížeče.

## Zapsal jsem číslo, ale nevidím ho v seznamu

Zkontrolujte, jestli jste opravdu klikli na **ZAPSAT** nebo stiskli **Enter** — bez potvrzení se zadané číslo neodešle. Pokud jste offline (žlutý štítek nahoře), zápis se uloží lokálně a v seznamu **Poslední zápisy** se objeví okamžitě, i bez signálu — pokud tam není vůbec nic, zkuste zápis zopakovat.

## Ztratil jsem odkaz na kiosk/registraci/embed pro svou trať

Všechny tyhle odkazy se dají znovu zobrazit ve **Správě akcí** u dané trasy — tlačítka Kiosk, Registrace, Embed výsledků a Embed registrace je zobrazí znovu, žádný odkaz se neztrácí natrvalo.

## Import CSV hlásí chybu u každého řádku

Nejčastější příčina je špatně pojmenovaný sloupec v hlavičce (musí přesně odpovídat šabloně — `cislo`, `prijmeni`, `jmeno` atd., viz [Import startovní listiny z CSV](/napoveda/import-csv)) nebo chybějící kategorie u řádků bez ročníku a pohlaví. Stáhněte si šablonu přímo z appky a řádky do ní jen doplňte, ať se nespletou názvy sloupců.

## Dá se appka nainstalovat jako aplikace na telefon?

Ano, Depo je tzv. progresivní webová appka (PWA) — v prohlížeči na telefonu (Chrome, Safari) nabídne možnost „Přidat na plochu“ nebo „Nainstalovat appku“. Po instalaci se otevírá jako běžná appka, bez adresního řádku prohlížeče, a offline režim funguje stejně.

## Kolik zařízení může měřit najednou?

Neomezeně — libovolný počet zařízení může být přihlášený ke stejnému účtu a zapisovat zároveň, na stejné i na různé trati. Víc v [Víc zařízení najednou a kolize stanovišť](/napoveda/vice-zarizeni-a-kolize).

## Nenašli jste odpověď?

Zkuste vyhledávání nahoře (klávesa **/** ho kdykoliv otevře), nebo se vraťte na [úvod nápovědy](/napoveda).
