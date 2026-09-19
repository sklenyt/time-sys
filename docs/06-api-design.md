# 6. Návrh API

REST pro CRUD operace a synchronizaci, WebSocket pro realtime promítnutí změn. Verze `v1`, base cesta `/api/v1`. Datový model viz [04-data-model.md](04-data-model.md), role viz [08-security.md](08-security.md).

## 6.1 Autentizace

| Endpoint | Metoda | Popis |
|---|---|---|
| `/auth/login` | POST | E-mail + heslo → access + refresh JWT |
| `/auth/refresh` | POST | Refresh token → nový access token |
| `/auth/logout` | POST | Invalidace refresh tokenu |
| `/auth/invite` | POST | Organizátor pozve spolupracovníka e-mailem s přednastavenou rolí |

## 6.2 Správa události a tratí

| Endpoint | Metoda | Popis |
|---|---|---|
| `/events` | GET, POST | Seznam / založení události |
| `/events/{id}` | GET, PATCH, DELETE | Detail / úprava / smazání události |
| `/events/{id}/routes` | GET, POST | Tratě v rámci události |
| `/routes/{id}` | GET, PATCH | Detail/úprava tratě (počet kol, typ startu, délka) |
| `/routes/{id}/categories` | GET, POST, PATCH | Kategorie tratě |
| `/routes/{id}/start-waves` | GET, POST, PATCH | Startovní vlny/intervaly |

## 6.3 Startovní listina a přihlášky

| Endpoint | Metoda | Popis |
|---|---|---|
| `/routes/{id}/entries` | GET | Startovní listina tratě (podpora `?search=jméno/klub` — UC3/F20) |
| `/routes/{id}/entries` | POST | Zápis závodníka na místě (F03) — automatický výpočet kategorie z ročníku/pohlaví |
| `/entries/{id}` | GET, PATCH | Detail / oprava přihlášky (F04) |
| `/routes/{id}/entries/import` | POST | Import CSV/XLSX startovní listiny (F04), tělo: soubor + mapování sloupců |
| `/entries/{id}/status` | PATCH | Nastavení DNS/DNF/DQ (F11) |

## 6.4 Měření — jádro systému

| Endpoint | Metoda | Popis |
|---|---|---|
| `/routes/{id}/start` | POST | Zahájení startu vlny — server/klient uloží aktuální čas jako `cas_startu` (UC5) |
| `/routes/{id}/start` | DELETE | Zrušení startu |
| `/routes/{id}/records` | POST | **Jádro F06**: `{ startovni_cislo, zarizeni_id, klient_cas }` → server uloží `zaznam_udalosti` s `typ_udalosti=DOJEZD`, čas = okamžik přijetí/potvrzení na klientovi, ne ruční vstup |
| `/records/{id}/correct` | POST | Oprava čísla se zachováním času (F08) — vytvoří nový `zaznam_udalosti` s `nahrazuje_zaznam_id` a `typ_opravy` |
| `/routes/{id}/running` | GET | "Kdo ještě běží / DNF" — realtime přehled (F10, `kdo_bezi_view`) |
| `/sync/events` | POST | **Klíčový endpoint offline synchronizace** — klient pošle dávku lokálně vzniklých eventů (viz [03-architecture.md §3.5](03-architecture.md#35-synchronizační-strategie-nejkritičtější-technické-rozhodnutí)) |
| `/sync/events` | GET | Klient stáhne eventy od `?since=<cursor>`, které ještě lokálně nemá |

### Příklad — zápis doběhu (`POST /routes/{id}/records`)

```json
// request
{
  "startovni_cislo": 42,
  "zarizeni_id": "f3a1...",
  "klient_cas": "2026-09-18T13:07:22.481Z",
  "klient_event_id": "b6e2..."   // UUID vygenerované na klientovi — idempotence při retry
}

// response 201
{
  "id": "c9d4...",
  "trasa_id": "a1b2...",
  "startovni_cislo_raw": 42,
  "prihlaska_id": "e7f8...",
  "typ_udalosti": "DOJEZD",
  "cas": "2026-09-18T13:07:22.481Z",
  "stav": "OK",
  "cas_kola": "00:42:17.481",
  "cas_celkem": "01:34:02.117"
}
```

`klient_event_id` zajišťuje idempotenci — při opakovaném odeslání (výpadek spojení uprostřed requestu) server rozpozná duplicitu a nevytvoří dvojitý záznam.

## 6.5 Výsledky a export

| Endpoint | Metoda | Popis |
|---|---|---|
| `/routes/{id}/results` | GET | Aktuální pořadí — celkové, po kategoriích, TOP3 (F12, `vysledky_view`) |
| `/routes/{id}/results/export.xlsx` | GET | Export XLSX (F13) |
| `/routes/{id}/results/export.pdf` | GET | Export PDF (F13) |
| `/routes/{id}/results/live` | GET (veřejné, bez auth) | Veřejná živá stránka výsledků (F16), cachovaná/edge |
| `/events/{id}/publish-targets` | GET, POST | Seznam / vytvoření publikačního cíle (FTP/FTPS/SFTP) — F34, F37 |
| `/publish-targets/{id}` | GET, PATCH, DELETE | Detail / úprava (server, cesta, přihlašovací údaje, interval, šablona) / smazání cíle |
| `/publish-targets/{id}/test` | POST | Otestuje připojení a přihlášení bez provedení skutečného exportu — okamžitá zpětná vazba při konfiguraci |
| `/publish-targets/{id}/export-now` | POST | Vynutí okamžitý export a upload mimo nastavený interval |

### Příklad — vytvoření publikačního cíle (`POST /events/{id}/publish-targets`)

```json
// request
{
  "protokol": "SFTP",
  "server": "ftp.example-hosting.cz",
  "port": 22,
  "cesta": "/www/vysledky/",
  "uzivatel": "klub1234",
  "heslo": "•••••••••",            // uloženo šifrovaně, nikdy nevrací v odpovědi
  "interval_minut": 5,
  "export_po_kazdem_zaznamu": true,
  "html_sablona": null              // volitelné, jinak výchozí šablona Depo
}

// response 201
{
  "id": "d4e1...",
  "protokol": "SFTP",
  "server": "ftp.example-hosting.cz",
  "cesta": "/www/vysledky/",
  "interval_minut": 5,
  "export_po_kazdem_zaznamu": true,
  "posledni_export_at": null,
  "posledni_export_stav": null
}
```

Pole `trasa.export_soubor_nazev` (viz [04-data-model.md §4.10](04-data-model.md#410-publikační-cíl--export-výsledků-na-ftpsftp-f34f37)) určuje výstupní název souboru pro každou trať na tomto cíli (např. `kratka.html`, `stredni.html`) — nastavuje se v modulu Nastavení trasy, ne při vytváření samotného publikačního cíle.

## 6.6 Audit

| Endpoint | Metoda | Popis |
|---|---|---|
| `/routes/{id}/audit` | GET | Log oprav a změn s filtrováním podle uživatele/času (F09, `audit_trail_view`) |

## 6.7 WebSocket kanály

| Kanál | Událost | Payload |
|---|---|---|
| `route:{id}:records` | `record.created`, `record.corrected` | Nový/opravený záznam — pro živé promítnutí u organizátora/časoměřičů |
| `route:{id}:running` | `running.updated` | Změna přehledu "kdo běží" |
| `route:{id}:results` | `results.updated` | Přepočtené pořadí — pro veřejnou live stránku |
| `sync:{zarizeni_id}:status` | `sync.progress` | Stav synchronizace zařízení (kolik eventů čeká na odeslání) |

## 6.8 Chybové stavy specifické pro doménu

| HTTP kód | Situace |
|---|---|
| `409 Conflict` + `stav=NEEDS_REVIEW` | Kolize při synchronizaci (např. stejné číslo doběhlo na dvou stanovištích ve stejném kole) — vrací obě konkurenční verze k ručnímu rozhodnutí organizátora |
| `422 Unprocessable Entity` | `startovni_cislo` nenalezeno ve startovní listině — záznam se přesto uloží (`prihlaska_id = null`), endpoint vrací `202 Accepted` s varováním, ne tvrdou chybu (F07 — ulož i neplatné číslo, oprav později) |
