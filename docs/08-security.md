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

- **HTTPS/TLS všude** — API, SSE (`/results/live`), veřejná stránka výsledků. Žádná výjimka ani pro lokální síť na stanovišti (self-signed cert akceptovatelný jen v LAN fallback režimu, viz §8.6). ✅ Konkrétní nasazení viz §8.8.
- Data at-rest: šifrování disku na úrovni managed databáze (standard u cloudových poskytovatelů, viz [05-tech-stack.md](05-tech-stack.md)).
- ✅ Citlivá pole se ukládají šifrovaně (AES-256-GCM, `apps/api/src/common/secret-crypto.ts`), nikdy ne plain-text ve sloupci databáze — FTP/SFTP přihlašovací údaje (F34) i osobní údaje přihlášky, nouzový kontakt a zdravotní poznámka (F31). Rozšifrují se jen při vrácení z API autorizovanému volajícímu, v databázi zůstávají opaque.

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
- ✅ Minimalizace: pole `email`/`telefon` nejsou nikdy součástí veřejné `results`/`results/live` odpovědi (jen jméno, klub, kategorie, čas) — ověřeno v `VysledekPolozka` (`packages/shared/src/types.ts`).
- ✅ Právo na výmaz: `DELETE /routes/:id/entries/:entryId` (`GdprService.anonymizovatPrihlasku`) smaže přihlášku celou (jméno, kontakt, zdravotní poznámka), ale `zaznam_udalosti` zůstává — jen se odpojí `prihlaska_id`, aby výsledky a audit log neztratily integritu. Zapisuje se i do `audit_log` (entita `prihlaska`).
- ✅ Retenční politika: naplánovaná úloha (`GdprService.anonymizovatStareUdalosti`, jednou denně) automaticky anonymizuje přihlášky u událostí starších než `GDPR_RETENCE_DNI` (výchozí 730 dní / 2 roky, konfigurovatelné přes `.env`) stejnou cestou jako ruční výmaz.

## 8.8 Nasazení HTTPS/TLS — konkrétní kroky

`apps/api` je čisté HTTP API (NestJS/Express) a `apps/web` je statická PWA shell — ani jedno neterminuje TLS samo, to zajišťuje vrstva před nimi (§3.7). API už počítá s provozem za touto vrstvou: `app.set("trust proxy", 1)` (aby `X-Forwarded-*` hlavičky od proxy byly důvěryhodné) a `helmet()` middleware (`apps/api/src/main.ts`) — nastavuje `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` a další standardní bezpečnostní hlavičky na každou odpověď včetně SSE streamu `/results/live`.

Doporučené cesty k reálnému TLS certifikátu:

1. **Managed platforma** (Render/Railway/Fly.io, viz §3.7) — TLS terminuje platforma automaticky na přiřazené doméně, appka dostává provoz už jako obyčejné HTTP za proxy. Není potřeba nic dalšího konfigurovat, jen zajistit, že `trust proxy` (výše) je zapnuté, aby `req.secure`/`X-Forwarded-Proto` fungovaly správně pro HSTS a redirecty.
2. **Vlastní VPS/Docker** — reverzní proxy (Caddy nebo nginx + certbot) před oběma appkami:
   - **Caddy** je nejjednodušší varianta — automatický Let's Encrypt certifikát bez ruční konfigurace, stačí `Caddyfile` s `reverse_proxy` bloky pro `apps/api` (port 3000) a `apps/web` (statické soubory nebo vlastní port).
   - **nginx + certbot** — klasická varianta, `certbot --nginx` pro vydání/obnovu certifikátu, `proxy_pass` na `http://localhost:3000` pro `/api/`, statické soubory `apps/web/dist` pro zbytek.
   - V obou případech proxy posílá `X-Forwarded-Proto: https` a `X-Forwarded-For`, které `trust proxy` výše respektuje.
3. **Lokální síť na stanovišti bez internetu** (§8.6) — self-signed certifikát je jediná možnost, protože Let's Encrypt vyžaduje veřejně dostupnou doménu; prohlížeč nahlásí varování, které si tým na místě musí vědomě odkliknout (jednorázově, ne při každém požadavku, díky uloženému výjimce v prohlížeči).
