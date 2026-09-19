# 4. Datový model

Cílová databáze: **PostgreSQL** (zdůvodnění v [05-tech-stack.md](05-tech-stack.md)).

## 4.1 ERD — přehled

```mermaid
erDiagram
    ORGANIZACE ||--o{ UZIVATEL : zamestnava
    ORGANIZACE ||--o{ UDALOST : porada
    UDALOST ||--o{ TRASA : obsahuje
    TRASA ||--o{ KATEGORIE : definuje
    TRASA ||--o{ START_VLNA : ma
    TRASA ||--o{ PRIHLASKA : eviduje
    KATEGORIE ||--o{ PRIHLASKA : zarazuje
    START_VLNA ||--o{ PRIHLASKA : startuje
    PRIHLASKA ||--o| CIP : priradi
    PRIHLASKA ||--o{ ZAZNAM_UDALOSTI : ma
    TRASA ||--o{ ZAZNAM_UDALOSTI : patri
    ZARIZENI ||--o{ ZAZNAM_UDALOSTI : zaznamenalo
    UZIVATEL ||--o{ ZAZNAM_UDALOSTI : zapsal
    UZIVATEL ||--o{ AUDIT_LOG : provedl
    UDALOST ||--o{ UZIVATEL_ROLE : opravnuje
    UZIVATEL ||--o{ UZIVATEL_ROLE : ma
    UDALOST ||--o{ PUBLIKACNI_CIL : exportuje_na

    ORGANIZACE {
        uuid id
        string nazev
        timestamptz vytvoreno_at
    }
    UDALOST {
        uuid id
        uuid organizace_id
        string nazev
        date datum
        string html_hlavicka
        string logo_url
    }
    TRASA {
        uuid id
        uuid udalost_id
        string nazev
        float delka_km
        int pocet_kol
        enum typ_startu
        bool dokoncena
        string export_soubor_nazev
    }
    KATEGORIE {
        uuid id
        uuid trasa_id
        string kod
        string nazev
        enum pohlavi
        int rocnik_od
        int rocnik_do
    }
    START_VLNA {
        uuid id
        uuid trasa_id
        string nazev
        timestamptz cas_startu
        int odklad_sekund
    }
    PRIHLASKA {
        uuid id
        uuid trasa_id "NOT NULL"
        int startovni_cislo
        string prijmeni
        string jmeno
        int rocnik
        enum pohlavi
        string klub
        string email
        string telefon
        uuid kategorie_id "NOT NULL"
        uuid start_vlna_id
        bool registrovan
        string nouzovy_kontakt
        string zdravotni_poznamka
        enum stav_ukonceni
        interval casova_penalizace
        jsonb clenove_druzstva
    }
    CIP {
        uuid id
        uuid prihlaska_id
        string kod_cipu
        enum stav
        bool zalozni
        numeric vratna_zaloha
        timestamptz vydano_at
        timestamptz vraceno_at
    }
    ZARIZENI {
        uuid id
        string nazev
        enum typ
        timestamptz posledni_sync_at
    }
    ZAZNAM_UDALOSTI {
        uuid id
        uuid trasa_id
        uuid prihlaska_id
        int startovni_cislo_raw
        enum typ_udalosti
        timestamptz cas
        uuid zarizeni_id
        uuid uzivatel_id
        enum typ_opravy
        uuid nahrazuje_zaznam_id
        enum stav
        timestamptz vytvoreno_klient_at
        timestamptz prijato_server_at
    }
    UZIVATEL {
        uuid id
        string email
        string jmeno
        string heslo_hash
    }
    UZIVATEL_ROLE {
        uuid id
        uuid uzivatel_id
        uuid udalost_id
        enum role
    }
    AUDIT_LOG {
        uuid id
        uuid uzivatel_id
        string entita
        uuid entita_id
        jsonb puvodni_hodnota
        jsonb nova_hodnota
        timestamptz cas
    }
    PUBLIKACNI_CIL {
        uuid id
        uuid udalost_id
        enum protokol
        string server
        int port
        string cesta
        string uzivatel
        string heslo_sifrovane
        int interval_minut
        bool export_po_kazdem_zaznamu
        text html_sablona
        timestamptz posledni_export_at
        enum posledni_export_stav
    }
```

## 4.2 Klíčové designové rozhodnutí: `zaznam_udalosti` jako append-only event log

Toto je centrální tabulka celého systému a zároveň nosič synchronizační strategie z [03-architecture.md §3.5](03-architecture.md#35-synchronizační-strategie-nejkritičtější-technické-rozhodnutí):

- **Nikdy se needituje, jen přidává.** Oprava čísla není `UPDATE` staré hodnoty, ale nový řádek `typ_udalosti = 'OPRAVA'`, `nahrazuje_zaznam_id = <id předchozího>`. Aktuální platná hodnota se odvozuje jako "poslední řádek v řetězci `nahrazuje_zaznam_id`".
- **`startovni_cislo_raw`** se ukládá vždy (i když se nepodaří napárovat na `prihlaska_id`) — nezachycené/neplatné číslo se nikdy nezahazuje, jen bez nutnosti fixního placeholder řádku v `prihlaska`.
- **`stav`** nabývá `OK` / `NEEDS_REVIEW` — druhá hodnota pro kolize při synchronizaci více zařízení (viz architektura).
- **`vytvoreno_klient_at` vs. `prijato_server_at`** — dvojí časové razítko: první je čas na zařízení v okamžiku zápisu (rozhodující pro výpočet výsledků, nativně přesný `timestamptz` v PostgreSQL), druhý je čas přijetí serverem (pro diagnostiku synchronizace, ne pro výpočet výsledků).
- `typ_udalosti`: `START`, `DOJEZD`, `MEZICAS`, `OPRAVA`, `DNS`, `DNF`, `DQ`.
- `typ_opravy`: enum popisující typ korekce — `ORIGINAL`, `PREPIS_POSLEDNIHO_RADKU`, `PREPIS_NULY_NA_CISLO`, `PREPSANE_CISLO`, `ZMENA_V_UPRAVACH`.

Výsledky (`GET /races/{id}/results`, viz [06-api-design.md](06-api-design.md)) se **počítají z `zaznam_udalosti` on-the-fly nebo do materializovaného view**, nikdy se needituje/needukládá zvlášť jako plochá "cache" tabulka pro tisk.

## 4.3 Role a přístup

`uzivatel_role` váže uživatele na konkrétní `udalost` s rolí:

| Role | Oprávnění |
|---|---|
| `ADMIN` | Správa organizace, všech událostí a uživatelů |
| `ORGANIZATOR` | Plná správa jedné události (tratě, kategorie, startovní listina, export) |
| `CASOMERIC` | Zápis do `zaznam_udalosti` (start, doběh, oprava) na přiřazené trati |
| `STANOVISTE` | Jako `CASOMERIC`, ale jen pro mezičasy na konkrétním kontrolním bodě |
| `VEREJNOST` | Jen čtení živých výsledků — bez účtu, přes veřejný odkaz (viz [08-security.md](08-security.md)) |

## 4.4 Klíčové indexy a integritní pravidla

- `prihlaska (trasa_id, startovni_cislo)` — `UNIQUE` jako composite přes trať, ne globálně (jedno startovní číslo může existovat na více tratích jedné akce).
- `zaznam_udalosti (trasa_id, cas)` — index pro rychlé řazení/výpočet pořadí.
- `zaznam_udalosti (prihlaska_id)`, `zaznam_udalosti (startovni_cislo_raw)` — pro dohledání historie konkrétního závodníka/čísla.
- `cip (kod_cipu)` — `UNIQUE`.
- Cizí klíče `ON DELETE RESTRICT` na `trasa`/`udalost` (žádné tiché mazání historických dat závodu), `ON DELETE CASCADE` jen z `udalost → trasa` při explicitním smazání celé (nevyexportované) události v konceptu.

## 4.5 Odvozené (počítané) pohledy

| View | Účel |
|---|---|
| `vysledky_view` | Pořadí celkové, po kategoriích, TOP3, časová penalizace zohledněna |
| `kdo_bezi_view` | Startovní čísla s `START`, ale bez odpovídajícího `DOJEZD` v posledním kole a bez `DNF/DNS/DQ` |
| `audit_trail_view` | Sloučený pohled `zaznam_udalosti` (typ OPRAVA) + `audit_log` pro UI auditu |

## 4.6 Multi-tenancy (Should/Could have)

`organizace` je top-level entita. V PostgreSQL se izolace řeší přes **Row-Level Security (RLS)** s politikou `organizace_id = current_setting('app.current_org')`, nastavovanou middlewarem backendu po ověření JWT. V MVP lze RLS nasadit rovnou (nízké dodatečné náklady), i když je zpočátku jen jedna organizace — zamezí to nutnosti pozdější bolestivé migrace.

## 4.8 Povinná pole při registraci: trasa a kategorie

`prihlaska.trasa_id` a `prihlaska.kategorie_id` jsou **`NOT NULL`** (požadavek F03 v [02-requirements.md](02-requirements.md)):

- Bez `trasa_id` nelze závodníka jednoznačně zařadit do `zaznam_udalosti` ani do výpočtu výsledků — u vícetraťové akce je volba tratě první a nezbytná otázka při registraci.
- Bez `kategorie_id` nelze dopočítat pořadí v kategorii ani TOP3 (F12) — chybějící kategorie je v praxi častý zdroj ručních oprav po závodě.

Aplikační vrstva (ne jen databáze) kategorii **automaticky předvyplní** podle ročníku narození a pohlaví, ale UI vždy vyžaduje viditelné potvrzení hodnoty před uložením (viz mockup [07-ui-mockups.md §7.8](07-ui-mockups.md)) — uživatel nikdy neuloží přihlášku s prázdnou kategorií "omylem", ale zároveň může kategorii vědomě přepsat (např. závodník startující v jiné než "své" kategorii).

## 4.9 RFID čip — životní cyklus

Entita `cip` nese pole potřebná pro reálný provoz s fyzickými čipy jako spotřebním/vratným materiálem:

| Pole | Účel |
|---|---|
| `stav` | `PRIREZEN` / `VRACEN` / `ZTRACEN` / `ZALOZNI` — životní cyklus čipu v rámci jedné akce |
| `zalozni` | Příznak, že jde o náhradní čip vydaný za ztracený/nefunkční originál (bez ztráty historie měření na původním čipu) |
| `vratna_zaloha` | Částka vybrané vratné zálohy (běžná praxe u vícepoužitelných UHF čipů) |
| `vydano_at` / `vraceno_at` | Časové razítko výdeje a vrácení — podklad pro vyúčtování nevrácených záloh po závodě |

Podrobný návrh workflow párování, hardwarové varianty a doporučený "local capture agent" pro napojení RFID decodérů viz **[12-rfid-a-doporuceni.md](12-rfid-a-doporuceni.md)**.

## 4.10 Publikační cíl — export výsledků na FTP/SFTP (F34–F37)

`publikacni_cil` umožňuje organizátorovi publikovat výsledky jako statickou HTML stránku na vlastním FTP/SFTP serveru, nezávisle na živé stránce hostované Depem (F16).

- Váže se na `udalost`, ne na `trasa` — typicky mají všechny tratě jedné akce společný FTP server, jen jiný výstupní soubor. To odpovídá `trasa.export_soubor_nazev`.
- `protokol` podporuje `FTP` (kvůli kompatibilitě s běžným českým webhostingem, který SFTP často nenabízí), `FTPS` i `SFTP`.
- `heslo_sifrovane` — přístupové údaje se v databázi vždy šifrují (viz [08-security.md §8.4](08-security.md)), nikdy neukládají v čistém textu.
- `interval_minut` + `export_po_kazdem_zaznamu` pokrývají oba scénáře publikace: pravidelný interval i okamžitý export po každém zápisu.
- `html_sablona` — volitelná vlastní HTML hlavička/styl, aby exportovaná stránka ladila s existujícím webem klubu.
- `posledni_export_at`/`posledni_export_stav` (`OK`/`CHYBA`) se zobrazují přímo v UI (viz mockup [07-ui-mockups.md §7.10](07-ui-mockups.md)), aby si organizátor nemusel ověřovat úspěch exportu ručně na webu.

Renderování statické HTML stránky se počítá stejně jako `vysledky_view` (§4.5) — jde jen o jiný výstupní formát téhož odvozeného stavu, ne o samostatně udržovaná data. Podrobný návrh exportního mechanismu (plánovač, fronta, opakování při chybě) viz [03-architecture.md §3.10](03-architecture.md#310-export-a-publikace-výsledků-na-ftpsftp-f34f37).
