# 10. Fázovaná roadmapa

Fáze navazují na cíle modernizace ([03-architecture.md §3.1](03-architecture.md)) a jsou seřazené tak, aby po každé fázi existoval **použitelný přírůstek**, ne jen rozpracovaný celek. Odhady jsou orientační pro malý tým (1–2 vývojáři + konzultace s organizátorem).

## Fáze 0 — Upřesnění a validace (hotovo / průběžně)

| Položka | Stav |
|---|---|
| Analýza veřejné dokumentace staré aplikace | ✅ [01-analysis.md](01-analysis.md) |
| Přímá inspekce reálného souboru `.accde` + dat z ostrého závodu | ✅ [11-legacy-schema-reference.md](11-legacy-schema-reference.md) |
| Návrh architektury, datového modelu, API, UI mockupů | ✅ tento dokumentační balík |
| Validace návrhu s organizátorem (uživatelský feedback na mockupy a workflow) | ⏳ další krok — viz §10.5 |

## Fáze 1 — MVP jádro (odhad 4–8 týdnů)

Cíl: nahradit **nejkritičtější denní use case** — samotné měření na jedné trati na jednom zařízení.

- Modul správy trasy (F01, F02) — [07-ui-mockups.md §7.2](07-ui-mockups.md)
- Startovní listina — ruční zápis + CSV import (F03, F04) — [§7.8](07-ui-mockups.md)
- **Modul měření** — číslo + Enter, zachování systémového času (F06, F07) — [§7.3](07-ui-mockups.md), jádro dle [04-data-model.md §4.2](04-data-model.md)
- Oprava záznamu se zachováním času (F08)
- Základní auditní log (F09)
- Výpočet výsledků a export XLSX (F12, F13)
- Backend API pro jedno zařízení/jednu trať bez multi-device synchronizace (zjednodušená verze `/sync/events` — jen lokální perzistence, cloud sync odložen na Fázi 2)

**Akceptační kritérium fáze:** organizátor dokáže odměřit celý menší závod (1 trať, 1 zařízení) v novém systému a získat stejné výsledky jako by dala stará Časomíra, ověřeno na reálných datech z [11-legacy-schema-reference.md](11-legacy-schema-reference.md).

## Fáze 2 — Terén a offline (odhad 4–6 týdnů)

Cíl: dosáhnout parity s dnešní terénní spolehlivostí a přidat síťovou spolupráci.

- PWA shell, Service Worker, instalovatelnost (N01, N05)
- IndexedDB lokální úložiště a plně offline provoz modulu měření
- Synchronizace více zařízení/stanovišť (F15, F17) — event-log sync dle [03-architecture.md §3.5](03-architecture.md)
- Detekce a řešení kolizí (`NEEDS_REVIEW`) v UI (§7.1, §7.6)
- Modul "Kdo běží / DNF" v realtime (F10) — [§7.4](07-ui-mockups.md)

**Akceptační kritérium fáze:** dvě zařízení (cíl + 1 kontrolní stanoviště) zapisují nezávisle offline a po obnovení spojení se data bezkonfliktně sloučí bez ruční intervence (mimo skutečné kolize).

## Fáze 3 — Živé výsledky, role a bezpečnost (odhad 3–5 týdnů)

- Realtime publikace výsledků (WebSocket/SSE), veřejná mobilní stránka (F16) — [§7.5](07-ui-mockups.md)
- RBAC, individuální účty, pozvánky (F18, F19) — [08-security.md](08-security.md)
- Auditní log v UI s filtrováním (§7.6)
- HTTPS/TLS, šifrování citlivých polí, GDPR retenční politika

**Akceptační kritérium fáze:** organizátor pozve spolupracovníky s odlišnými rolemi bez sdílení hesla; diváci sledují výsledky na mobilu bez manuálního uploadu.

## Fáze 4 — RFID/čtečky a rozšíření (odhad průběžně, dle poptávky)

- Podpora RFID čipů / čárových kódů přes Web Serial/Bluetooth API (F22)
- Vlastní online registrační formulář (F23)
- Multi-tenant provoz pro více organizátorů (F24) — Row-Level Security dle [04-data-model.md §4.6](04-data-model.md)
- Pokročilé reporty, historie výkonů, rekordy tratě (F26)
- Zvážení CRDT knihovny pro obecnější konflikty, pokud vlastní event-log sync narazí na limity (viz [05-tech-stack.md §5.3](05-tech-stack.md))

## 10.5 Doporučený bezprostřední další krok

1. Projít tuto dokumentaci s organizátorem (majitelem dat) — potvrdit, že mockupy v [07-ui-mockups.md](07-ui-mockups.md) odpovídají očekávání, a upřesnit priority mezi Fázemi 1–4.
2. Rozhodnout o hostingové platformě a založit prázdný monorepo projekt (frontend + backend) podle [05-tech-stack.md](05-tech-stack.md).
3. Začít Fází 1 s referenčním závodem (Břežanský kostitřas) jako akceptačním testovacím datasetem — data i očekávané výsledky už jsou k dispozici z [11-legacy-schema-reference.md](11-legacy-schema-reference.md).
