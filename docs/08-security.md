# 8. Bezpečnost, role a řízení přístupu

## 8.1 Cíl

Individuální účty, RBAC, šifrování citlivých dat a auditovatelnost každé změny — bez zvýšení bariéry vstupu pro netechnické organizátory.

## 8.2 Autentizace

- **JWT** (access token krátké životnosti ~15 min + refresh token, viz [05-tech-stack.md](05-tech-stack.md)) — zvoleno místo session cookies kvůli offline klientům, kteří mohou být dlouho bez spojení a musí umět bezpečně obnovit relaci po návratu online.
- Hesla hashovaná **bcrypt/argon2**, nikdy neukládaná ani nelogovaná v čitelné podobě.
- Pozvánky spolupracovníků e-mailem s jednorázovým odkazem pro nastavení hesla — žádné sdílení jednoho společného hesla ústně/SMS.
- Podpora 2FA (TOTP) jako **Could have** pro role `ADMIN`/`ORGANIZATOR` — nekritické pro MVP, ale nízkonákladové doplnění vzhledem k citlivosti dat (osobní údaje závodníků).

## 8.3 RBAC — role a oprávnění

Podrobný model rolí viz [04-data-model.md §4.3](04-data-model.md#43-role-a-přístup). Klíčový bezpečnostní princip: role se váže na **konkrétní událost** (`uzivatel_role.udalost_id`), ne globálně — časoměřič pozvaný na jeden závod nemá automaticky přístup k datům jiné akce jiného organizátora.

| Role | Čtení | Zápis měření | Správa startovní listiny | Správa události/uživatelů |
|---|---|---|---|---|
| `ADMIN` | ✅ vše v organizaci | ✅ | ✅ | ✅ |
| `ORGANIZATOR` | ✅ své události | ✅ | ✅ | ✅ (jen svá událost) |
| `CASOMERIC` | ✅ přiřazená trasa | ✅ | ❌ | ❌ |
| `STANOVISTE` | ✅ přiřazená trasa | ✅ (jen mezičasy, ne opravy) | ❌ | ❌ |
| `VEREJNOST` | ✅ jen `results/live` | ❌ | ❌ | ❌ (bez účtu) |

## 8.4 Šifrování a přenos dat

- **HTTPS/TLS všude** — API, WebSocket (`wss://`), veřejná stránka výsledků. Žádná výjimka ani pro lokální síť na stanovišti (self-signed cert akceptovatelný jen v LAN fallback režimu, viz §8.6).
- Data at-rest: šifrování disku na úrovni managed databáze (standard u cloudových poskytovatelů, viz [05-tech-stack.md](05-tech-stack.md)).
- Citlivá pole (SMTP heslo, FTP přihlašovací údaje) se ukládají šifrovaně (např. přes KMS/vault), nikdy ne plain-text ve sloupci databáze.

## 8.5 Auditovatelnost

- Každá mutace dat (oprava záznamu, změna role, smazání přihlášky) prochází přes `audit_log` / `zaznam_udalosti` s vazbou na konkrétní `uzivatel_id`, ne jen na zařízení.
- Log je **append-only** i na úrovni databázových oprávnění (role aplikace nemá `DELETE`/`UPDATE` na auditní tabulky) — nelze "zamést stopy" ani při kompromitaci API vrstvy.

## 8.6 Offline provoz a lokální síť — specifické riziko

Offline-first architektura ([03-architecture.md](03-architecture.md)) zavádí bezpečnostní kompromis, který je třeba vědomě řídit:

- Zařízení v terénu si mezi sebou synchronizují data přes **lokální WiFi/hotspot** — doporučeno vlastní izolovaná síť pořadatele (ne veřejné WiFi), s WPA2/3 heslem sdíleným jen mezi časoměřickým týmem.
- Lokální IndexedDB na zařízení obsahuje kopii citlivých dat (jména, ročníky) po dobu závodu — doporučeno vynucené smazání lokálních dat po úspěšné finální synchronizaci (nebo automatické vypršení po X dnech), aby ztracený/odcizený tablet neobsahoval trvale data závodníků.
- Autentizační token pro offline provoz musí mít dostatečně dlouhou platnost refresh tokenu (offline provoz může trvat hodiny), ale **ne neomezenou** — kompromis mezi použitelností a rizikem ztraceného zařízení, řešeno možností vzdáleně odvolat konkrétní zařízení (`zarizeni` tabulka, [04-data-model.md](04-data-model.md)) při příštím připojení k internetu.

## 8.7 Ochrana osobních údajů (GDPR)

Startovní listina obsahuje osobní údaje (jméno, ročník narození, e-mail, telefon, klub), s explicitními požadavky:

- Právní základ zpracování: plnění smlouvy (účast v závodě) / oprávněný zájem pořadatele (zveřejnění výsledků).
- Minimalizace: pole `email`/`mobil` nejsou nikdy součástí veřejné `results/live` odpovědi (jen jméno, klub, kategorie, čas).
- Právo na výmaz: proces smazání přihlášky na žádost závodníka i po skončení závodu — historické `zaznam_udalosti` se anonymizují (odpojení `prihlaska_id`), ne mažou celé (kvůli integritě výsledků a auditu).
- Retenční politika: doporučeno definovat dobu uchování osobních dat po závodě (např. 2 roky) s automatickým vymazáním/anonymizací po expiraci — nad rámec MVP, ale nutné před ostrým multi-tenant provozem (F24).
