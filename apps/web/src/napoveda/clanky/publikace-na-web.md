---
titulek: Publikace na váš web (FTP/SFTP)
sekce: Výsledky
poradi: 5
popis: Automatický export výsledků na váš klubový web přes FTP, FTPS nebo SFTP.
klicova: ftp sftp ftps publikace klubovy web export html
---

Pokud chcete mít výsledky i na svém vlastním klubovém webu (ne jen na `depotime.cz`), Depo je umí automaticky nahrávat jako statickou HTML stránku na váš webhosting.

Obrazovku najdete přes **Publikovat výsledky** na Přehledu akce, nebo odkazem `/publikace/ID-akce`.

## Založení publikačního cíle

V sekci **Nový publikační cíl** vyplňte:

- **Protokol** — SFTP (doporučeno, šifrované), FTPS nebo FTP.
- **Server**, **Port**, **Cesta** (např. `/`, nebo podsložka na vašem webhostingu).
- **Uživatel**, **Heslo** — přihlašovací údaje k vašemu FTP/SFTP účtu (dostanete je od svého poskytovatele webhostingu).
- **Interval (min)** — jak často se má export opakovat.

Klikněte na **Přidat cíl**. Přihlašovací údaje se ukládají zašifrované.

## Jak export probíhá

Export se spouští dvěma způsoby zároveň:

- **Po každém novém zápisu** — jakmile přibude nový doběh na některé trati dané akce, export proběhne automaticky.
- **Podle intervalu** — i bez nového zápisu se export zopakuje, jakmile uplyne nastavený počet minut od posledního.

Výsledný soubor je samostatná HTML stránka pro každou trať, kterou stačí na vašem webu otevřít v prohlížeči nebo vložit odkazem. Název souboru appka bez dalšího nastavení odvodí od interního identifikátoru trati (dlouhý řetězec + `.html`) — po prvním exportu se proto podívejte na svůj server, jaký přesný název souboru tam přistál, ať na něj můžete správně odkázat.

## Test a ruční export

- **Otestovat připojení** — ověří, že se appka na server s danými údaji dokáže připojit, bez skutečného nahrání souboru.
- **Exportovat teď** — spustí export okamžitě, bez čekání na interval.

Stav posledního exportu (OK/chyba) a čas se zobrazují přímo u daného cíle.

## Smazání cíle

Tlačítko **Smazat** u publikačního cíle ho nevratně odstraní — appka na daný server pak už výsledky posílat nebude. Soubory, které tam už byly nahrané, tím smazané nejsou.
