import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import type { AuthUserDto, Organizace, StartVlna, Trasa, Udalost, UzivatelRoleDto } from "@depo/shared";
import { Role, TypStartu } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { BusyOverlay } from "../components/BusyOverlay";
import { StartPlanovac } from "../components/StartPlanovac";

/**
 * Administrace organizací, akcí a tratí — dřív žila přímo na Přehledu akce,
 * ale tam patří jen živý stav (F25 layout pro obsluhu na stanovišti), ne
 * formuláře na zakládání/mazání. Přehled akce teď na tohle jen odkazuje.
 */
export function Sprava() {
  const location = useLocation();
  const [hint, setHint] = useState<string | null>((location.state as { hint?: string } | null)?.hint ?? null);
  const [organizace, setOrganizace] = useState<Organizace[]>([]);
  const [udalosti, setUdalosti] = useState<Udalost[]>([]);
  const [trasyByEvent, setTrasyByEvent] = useState<Record<string, Trasa[]>>({});
  const [vlnaByRoute, setVlnaByRoute] = useState<Record<string, StartVlna | undefined>>({});
  const [orgNazev, setOrgNazev] = useState("");
  const [eventNazev, setEventNazev] = useState("");
  const [eventDatum, setEventDatum] = useState("");
  const [routeDrafts, setRouteDrafts] = useState<Record<string, string>>({});
  const [routeKolDrafts, setRouteKolDrafts] = useState<Record<string, string>>({});
  const [otevrenaPlatba, setOtevrenaPlatba] = useState<Record<string, boolean>>({});
  const [platbaDrafts, setPlatbaDrafts] = useState<
    Record<string, { potvrzovaciEmailText: string; platbaUcet: string; platbaCastka: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rolesByEvent, setRolesByEvent] = useState<Record<string, UzivatelRoleDto[]>>({});
  const [otevreneRole, setOtevreneRole] = useState<Record<string, boolean>>({});
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
  const [inviteRole, setInviteRole] = useState<Record<string, Role>>({});

  async function reload() {
    setError(null);
    try {
      const orgs = await api.get<Organizace[]>("/organizations");
      setOrganizace(orgs);
      const events = await api.get<Udalost[]>("/events");
      setUdalosti(events);
      const trasyEntries = await Promise.all(
        events.map(async (u) => [u.id, await api.get<Trasa[]>(`/events/${u.id}/routes`)] as const)
      );
      setTrasyByEvent(Object.fromEntries(trasyEntries));

      const vsechnyTrasy = trasyEntries.flatMap(([, trasy]) => trasy);
      const vlnaEntries = await Promise.all(
        vsechnyTrasy.map(async (t) => [t.id, (await api.get<StartVlna[]>(`/routes/${t.id}/start-waves`))[0]] as const)
      );
      setVlnaByRoute(Object.fromEntries(vlnaEntries));
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba načítání"));
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function sBusy(label: string, akce: () => Promise<void>) {
    setBusy(label);
    try {
      await akce();
    } catch (e) {
      setError(chybaZeServeru(e, "Akce se nezdařila"));
    } finally {
      setBusy(null);
    }
  }

  async function createOrg() {
    if (!orgNazev.trim()) return;
    await sBusy("Zakládám organizaci…", async () => {
      await api.post("/organizations", { nazev: orgNazev.trim() });
      setOrgNazev("");
      await reload();
    });
  }

  async function createEvent() {
    if (!eventNazev.trim() || !eventDatum || organizace.length === 0) return;
    await sBusy("Zakládám akci…", async () => {
      const udalost = await api.post<Udalost>("/events", {
        organizaceId: organizace[0].id,
        nazev: eventNazev,
        datum: eventDatum,
      });
      setEventNazev("");
      setEventDatum("");
      try {
        const me = await api.get<AuthUserDto>("/auth/me");
        await api.post(`/events/${udalost.id}/roles`, { uzivatelId: me.id, role: Role.ADMIN });
      } catch {
        // Role se přiřadí ručně přes Uživatelé a role, pokud událost už má admina.
      }
      await reload();
    });
  }

  async function createRoute(eventId: string) {
    const nazev = routeDrafts[eventId];
    if (!nazev?.trim()) return;
    const pocetKol = Math.max(1, Number(routeKolDrafts[eventId]) || 1);
    await sBusy("Přidávám trasu…", async () => {
      await api.post(`/events/${eventId}/routes`, {
        nazev,
        pocetKol,
        typStartu: TypStartu.HROMADNY,
      });
      setRouteDrafts((d) => ({ ...d, [eventId]: "" }));
      setRouteKolDrafts((d) => ({ ...d, [eventId]: "" }));
      await reload();
    });
  }

  async function startRace(routeId: string) {
    if (
      vlnaByRoute[routeId]?.casStartu &&
      !window.confirm(
        "Tahle trať už odstartovala. Nový start přepíše čas startu na teď a změní tím časy všech závodníků. Opravdu znovu odstartovat?"
      )
    ) {
      return;
    }
    await sBusy("Spouštím start…", async () => {
      await api.post(`/routes/${routeId}/start`, {});
      await reload();
    });
  }

  async function renameEvent(eventId: string, aktualniNazev: string) {
    const novyNazev = window.prompt("Nový název akce", aktualniNazev);
    if (!novyNazev || !novyNazev.trim() || novyNazev === aktualniNazev) return;
    await sBusy("Přejmenovávám…", async () => {
      await api.patch(`/events/${eventId}`, { nazev: novyNazev.trim() });
      await reload();
    });
  }

  /**
   * Akce je na vysledky.depotime.cz veřejně vypsaná vždy (organizátor chce
   * návštěvnost) — tohle nastaví jen heslo, které pak musí sdílet se
   * závodníky, ať se ke jménům a časům nedostane kdokoliv.
   */
  async function nastavitHesloVysledku(eventId: string) {
    const heslo = window.prompt(
      "Heslo pro přístup k výsledkům na vysledky.depotime.cz (min. 4 znaky, sdílejte ho se závodníky). Nechte prázdné pro zrušení hesla."
    );
    if (heslo === null) return;
    if (heslo.trim() && heslo.trim().length < 4) {
      setError("Heslo musí mít aspoň 4 znaky");
      return;
    }
    await sBusy("Ukládám heslo…", async () => {
      await api.patch(`/events/${eventId}`, heslo.trim() ? { heslo: heslo.trim() } : { odebratHesloVysledku: true });
      window.alert(heslo.trim() ? "Heslo nastaveno." : "Heslo zrušeno — výsledky jsou teď bez hesla.");
    });
  }

  async function toggleDokoncena(routeId: string, dokoncena: boolean) {
    await sBusy("Ukládám…", async () => {
      await api.patch(`/routes/${routeId}`, { dokoncena });
      await reload();
    });
  }

  function ukazatEmbedKod(routeId: string) {
    const kod = `<iframe src="${window.location.origin}/embed/vysledky/${routeId}" width="360" height="480" style="border:0"></iframe>`;
    window.prompt("Zkopírujte kód pro vložení živých výsledků na web:", kod);
  }

  function ukazatRegistracniOdkaz(routeId: string) {
    window.prompt("Odkaz na veřejný registrační formulář:", `${window.location.origin}/registrace/${routeId}`);
  }

  function ukazatEmbedRegistrace(routeId: string) {
    const kod = `<iframe src="${window.location.origin}/embed/registrace/${routeId}" width="360" height="640" style="border:0"></iframe>`;
    window.prompt("Zkopírujte kód pro vložení registrace na váš web:", kod);
  }

  /** Celoobrazovkový kiosk pro promítání v cíli (F42) — jedna trať/kategorie. */
  function ukazatKioskOdkaz(routeId: string) {
    window.prompt("Odkaz na kiosk s výsledky téhle trati (pro TV/monitor v cíli):", `${window.location.origin}/kiosk/${routeId}`);
  }

  /** Kiosk pro celou akci — sám rotuje mezi všemi tratěmi/kategoriemi, viz KioskEvent.tsx. */
  function ukazatKioskAkce(eventId: string) {
    window.prompt(
      "Odkaz na kiosk pro celou akci (sám střídá kategorie, interval jde upravit přes ?interval=20):",
      `${window.location.origin}/kiosk-akce/${eventId}`
    );
  }

  async function toggleRegistrace(routeId: string, registraceUzavrena: boolean) {
    await sBusy("Ukládám…", async () => {
      await api.patch(`/routes/${routeId}`, { registraceUzavrena });
      await reload();
    });
  }

  /**
   * Ukončená akce zmizí z Dashboardu (viz Dashboard.tsx) a tady se zešedí
   * — data i tratě zůstávají beze změny, jen se schovají akce nad nimi
   * (start, registrace, přidání trasy), ať se hotové závody nekupí mezi
   * živými. Obnovení je vždy dostupné, žádné mazání.
   */
  async function toggleUkoncena(eventId: string, ukoncena: boolean) {
    await sBusy(ukoncena ? "Ukončuji akci…" : "Obnovuji akci…", async () => {
      await api.patch(`/events/${eventId}`, { ukoncena });
      await reload();
    });
  }

  /**
   * Upozornění (ne automatické ukončení!) na akci, jejíž datum už proběhlo
   * a žádná trať vůbec neodstartovala — typicky se zapomnělo kliknout na
   * Ukončit akci, nebo se závod nekonal. Organizátorovi to jen zvýrazníme,
   * ať se sám rozhodne (ukončit, nebo pozdě odstartovat) — appka mu sama
   * od sebe žádné tlačítko nezakazuje, viz stejná autodetekce na veřejném
   * adresáři (events.service.ts najitVerejneUdalosti, 2026-09-26).
   */
  function jePropadla(u: Udalost): boolean {
    if (u.ukoncena) return false;
    const dnesniPulnoc = new Date();
    dnesniPulnoc.setHours(0, 0, 0, 0);
    if (new Date(u.datum).getTime() >= dnesniPulnoc.getTime()) return false;
    return !(trasyByEvent[u.id] ?? []).some((t) => vlnaByRoute[t.id]?.casStartu);
  }

  async function deleteEvent(eventId: string, nazev: string) {
    if (!window.confirm(`Opravdu smazat akci "${nazev}"? Tuto akci nelze vrátit zpět.`)) return;
    await sBusy("Mažu akci…", async () => {
      await api.del(`/events/${eventId}`);
      await reload();
    });
  }

  function togglePlatba(trasa: Trasa) {
    const otevrit = !otevrenaPlatba[trasa.id];
    setOtevrenaPlatba((o) => ({ ...o, [trasa.id]: otevrit }));
    if (otevrit && !platbaDrafts[trasa.id]) {
      setPlatbaDrafts((d) => ({
        ...d,
        [trasa.id]: {
          potvrzovaciEmailText: trasa.potvrzovaciEmailText ?? "",
          platbaUcet: trasa.platbaUcet ?? "",
          platbaCastka: trasa.platbaCastka ? String(trasa.platbaCastka) : "",
        },
      }));
    }
  }

  /** Uložení textu potvrzovacího e-mailu a údajů pro QR platbu startovného (chat 2026-09-26). */
  async function ulozitPlatbu(routeId: string) {
    const draft = platbaDrafts[routeId];
    if (!draft) return;
    await sBusy("Ukládám…", async () => {
      await api.patch(`/routes/${routeId}`, {
        potvrzovaciEmailText: draft.potvrzovaciEmailText.trim(),
        platbaUcet: draft.platbaUcet.trim(),
        platbaCastka: draft.platbaCastka.trim() ? Number(draft.platbaCastka) : undefined,
      });
      await reload();
    });
  }

  async function deleteRoute(routeId: string, nazev: string) {
    if (!window.confirm(`Opravdu smazat trasu "${nazev}"? Tuto akci nelze vrátit zpět.`)) return;
    await sBusy("Mažu trasu…", async () => {
      await api.del(`/routes/${routeId}`);
      await reload();
    });
  }

  async function nacistRole(eventId: string) {
    try {
      const role = await api.get<UzivatelRoleDto[]>(`/events/${eventId}/roles`);
      setRolesByEvent((r) => ({ ...r, [eventId]: role }));
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba načítání rolí"));
    }
  }

  function toggleRole(eventId: string) {
    const otevrit = !otevreneRole[eventId];
    setOtevreneRole((o) => ({ ...o, [eventId]: otevrit }));
    if (otevrit && !rolesByEvent[eventId]) {
      nacistRole(eventId);
    }
  }

  /** Pozvání dalšího člověka k akci podle e-mailu — musí už mít v Depu účet (chat 2026-09-26). */
  async function pozvatKAkci(eventId: string) {
    const email = (inviteEmail[eventId] ?? "").trim();
    const role = inviteRole[eventId] ?? Role.ORGANIZATOR;
    if (!email) return;
    await sBusy("Zvu…", async () => {
      await api.post(`/events/${eventId}/roles/pozvat`, { email, role });
      setInviteEmail((e) => ({ ...e, [eventId]: "" }));
      await nacistRole(eventId);
    });
  }

  async function odebratRoli(eventId: string, roleId: string, email: string) {
    if (!window.confirm(`Opravdu odebrat přístup uživateli "${email}" k této akci?`)) return;
    await sBusy("Odebírám…", async () => {
      await api.del(`/events/${eventId}/roles/${roleId}`);
      await nacistRole(eventId);
    });
  }

  return (
    <AppShell active="sprava">
      <BusyOverlay active={busy !== null} label={busy ?? undefined} />
      <div className="dash-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Správa akcí a tratí</h1>
          <div className="meta mono">Organizace, akce, tratě — start, registrace, embed kódy, mazání</div>
        </div>
      </div>

      {hint && (
        <div className="hint-banner">
          <span>{hint}</span>
          <button type="button" onClick={() => setHint(null)} aria-label="Zavřít">
            ×
          </button>
        </div>
      )}

      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {organizace.length === 0 && (
        <section className="dash-card" style={{ maxWidth: 480, marginBottom: 24 }}>
          <div className="dash-card-head">
            <h2>Nejdřív založte organizaci</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={orgNazev}
              onChange={(e) => setOrgNazev(e.target.value)}
              placeholder="Název organizace"
              style={inputStyle}
            />
            <button onClick={createOrg} className="btn-pill primary">
              Založit
            </button>
          </div>
        </section>
      )}

      {organizace.length > 0 && (
        <div className="dash-card" style={{ marginBottom: 16, maxWidth: 640 }}>
          <div className="dash-card-head">
            <h2>Nová akce</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={eventNazev}
              onChange={(e) => setEventNazev(e.target.value)}
              placeholder="Např. Jarní běh Mělník 2026"
              style={inputStyle}
            />
            <input type="date" value={eventDatum} onChange={(e) => setEventDatum(e.target.value)} style={inputStyle} />
            <button onClick={createEvent} className="btn-pill primary">
              Založit akci
            </button>
          </div>
        </div>
      )}

      {[...udalosti]
        .sort((a, b) => Number(a.ukoncena) - Number(b.ukoncena))
        .map((u) => (
        <article
          key={u.id}
          className="dash-card"
          style={{ marginBottom: 16, opacity: u.ukoncena ? 0.6 : 1, background: u.ukoncena ? "var(--surface)" : undefined }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              margin: "0 0 4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{u.nazev}</h3>
              {u.ukoncena && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 999,
                    background: "var(--text-secondary)",
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  Ukončeno
                </span>
              )}
              {jePropadla(u) && (
                <span
                  className="mono"
                  title="Datum akce už proběhlo a žádná trať neodstartovala — zapomnělo se kliknout na Ukončit akci?"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 999,
                    background: "#fff7ec",
                    border: "1px solid #f1dcb0",
                    color: "var(--color-attention)",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  ⚠ Datum proběhlo
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {!u.ukoncena && (
                <button onClick={() => renameEvent(u.id, u.nazev)} className="btn-pill">
                  Přejmenovat
                </button>
              )}
              {!u.ukoncena && (
                <button onClick={() => nastavitHesloVysledku(u.id)} className="btn-pill">
                  Heslo výsledků
                </button>
              )}
              {!u.ukoncena && (
                <button onClick={() => ukazatKioskAkce(u.id)} className="btn-pill">
                  Kiosk (celá akce)
                </button>
              )}
              <button onClick={() => toggleRole(u.id)} className="btn-pill">
                {otevreneRole[u.id] ? "Skrýt lidi s přístupem" : "Lidé s přístupem"}
              </button>
              <button onClick={() => toggleUkoncena(u.id, !u.ukoncena)} className="btn-pill">
                {u.ukoncena ? "Obnovit akci" : "Ukončit akci"}
              </button>
              <button onClick={() => deleteEvent(u.id, u.nazev)} className="btn-pill danger">
                Smazat akci
              </button>
            </div>
          </div>
          <p className="mono" style={{ color: "var(--text-secondary)", margin: "0 0 12px" }}>
            {formatDatum(u.datum)}
          </p>

          {otevreneRole[u.id] && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: 12,
                margin: "0 0 12px",
              }}
            >
              <h4 style={{ margin: "0 0 8px" }}>Lidé s přístupem k akci</h4>
              {!rolesByEvent[u.id] && <p className="mono" style={{ fontSize: 12.5 }}>Načítám…</p>}
              {rolesByEvent[u.id]?.length === 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>Zatím jen vy.</p>
              )}
              {rolesByEvent[u.id] && rolesByEvent[u.id].length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px" }}>
                  {rolesByEvent[u.id].map((r) => (
                    <li
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "4px 0",
                        fontSize: 13,
                      }}
                    >
                      <span>
                        {r.uzivatel.jmeno} ({r.uzivatel.email}) —{" "}
                        <span className="mono" style={{ fontWeight: 700 }}>
                          {ROLE_LABEL[r.role]}
                        </span>
                      </span>
                      <button
                        onClick={() => odebratRoli(u.id, r.id, r.uzivatel.email)}
                        className="btn-pill danger"
                        style={{ padding: "2px 8px", fontSize: 11 }}
                      >
                        Odebrat
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="email"
                  placeholder="E-mail kolegy (musí už mít účet v Depu)"
                  value={inviteEmail[u.id] ?? ""}
                  onChange={(e) => setInviteEmail((v) => ({ ...v, [u.id]: e.target.value }))}
                  style={{ ...inputStyle, flex: 1, minWidth: 220 }}
                />
                <select
                  value={inviteRole[u.id] ?? Role.ORGANIZATOR}
                  onChange={(e) => setInviteRole((v) => ({ ...v, [u.id]: e.target.value as Role }))}
                  style={inputStyle}
                >
                  <option value={Role.ADMIN}>{ROLE_LABEL[Role.ADMIN]}</option>
                  <option value={Role.ORGANIZATOR}>{ROLE_LABEL[Role.ORGANIZATOR]}</option>
                  <option value={Role.CASOMERIC}>{ROLE_LABEL[Role.CASOMERIC]}</option>
                  <option value={Role.STANOVISTE}>{ROLE_LABEL[Role.STANOVISTE]}</option>
                </select>
                <button onClick={() => pozvatKAkci(u.id)} className="btn-pill primary">
                  Pozvat
                </button>
              </div>
            </div>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {(trasyByEvent[u.id] ?? []).map((t) => (
              <li key={t.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span>
                    {t.nazev}
                    {t.pocetKol > 1 && (
                      <span className="mono" style={{ color: "var(--text-secondary)", marginLeft: 8, fontSize: 12 }}>
                        {t.pocetKol}× kolo
                      </span>
                    )}
                    {t.dokoncena && (
                      <span className="mono" style={{ color: "var(--color-live)", marginLeft: 8, fontSize: 12 }}>
                        dokončeno
                      </span>
                    )}
                  </span>
                  {!u.ukoncena && (
                    <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={() => startRace(t.id)} className="btn-pill">
                        Start
                      </button>
                      <button onClick={() => toggleDokoncena(t.id, !t.dokoncena)} className="btn-pill">
                        {t.dokoncena ? "Otevřít znovu" : "Dokončit"}
                      </button>
                      <button onClick={() => ukazatRegistracniOdkaz(t.id)} className="btn-pill">
                        Registrace
                      </button>
                      <button onClick={() => toggleRegistrace(t.id, !t.registraceUzavrena)} className="btn-pill">
                        {t.registraceUzavrena ? "Otevřít registraci" : "Uzavřít registraci"}
                      </button>
                      <button onClick={() => togglePlatba(t)} className="btn-pill">
                        {otevrenaPlatba[t.id] ? "Skrýt platbu" : "Potvrzovací e-mail / platba"}
                      </button>
                      <button onClick={() => ukazatEmbedRegistrace(t.id)} className="btn-pill">
                        Embed registrace
                      </button>
                      <button onClick={() => ukazatEmbedKod(t.id)} className="btn-pill">
                        Embed výsledků
                      </button>
                      <button onClick={() => ukazatKioskOdkaz(t.id)} className="btn-pill">
                        Kiosk
                      </button>
                      <button onClick={() => deleteRoute(t.id, t.nazev)} className="btn-pill danger">
                        Smazat
                      </button>
                    </span>
                  )}
                </div>
                {!u.ukoncena && <StartPlanovac routeId={t.id} vlna={vlnaByRoute[t.id]} onChanged={reload} />}
                {!u.ukoncena && otevrenaPlatba[t.id] && platbaDrafts[t.id] && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 8,
                    }}
                  >
                    <p style={{ color: "var(--text-secondary)", fontSize: 12.5, margin: "0 0 8px" }}>
                      Text se přidá do potvrzovacího e-mailu po registraci. Vyplňte-li číslo účtu i částku, appka do
                      e-mailu přidá i QR platbu (česká QR Platba, formát „předčíslí-číslo/kódBanky").
                    </p>
                    <textarea
                      placeholder="Vlastní text do potvrzovacího e-mailu (volitelné)"
                      value={platbaDrafts[t.id].potvrzovaciEmailText}
                      onChange={(e) =>
                        setPlatbaDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], potvrzovaciEmailText: e.target.value } }))
                      }
                      rows={2}
                      style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit", marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input
                        placeholder="Číslo účtu, např. 19-2000145399/0800"
                        value={platbaDrafts[t.id].platbaUcet}
                        onChange={(e) => setPlatbaDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], platbaUcet: e.target.value } }))}
                        style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                      />
                      <input
                        placeholder="Startovné v Kč"
                        inputMode="numeric"
                        value={platbaDrafts[t.id].platbaCastka}
                        onChange={(e) => setPlatbaDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], platbaCastka: e.target.value } }))}
                        style={{ ...inputStyle, width: 130 }}
                      />
                      <button onClick={() => ulozitPlatbu(t.id)} className="btn-pill primary">
                        Uložit
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {!u.ukoncena && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={routeDrafts[u.id] ?? ""}
                onChange={(e) => setRouteDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                placeholder="Nová trasa, např. 10 km"
                style={inputStyle}
              />
              <input
                value={routeKolDrafts[u.id] ?? ""}
                onChange={(e) => setRouteKolDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                placeholder="Počet kol"
                inputMode="numeric"
                title="Kolikrát závodník objede okruh, než doběhne — nechte prázdné pro trať bez kol (1)"
                style={{ ...inputStyle, width: 100 }}
              />
              <button onClick={() => createRoute(u.id)} className="btn-pill primary">
                Přidat trasu
              </button>
            </div>
          )}
        </article>
      ))}
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};

const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: "Správce",
  [Role.ORGANIZATOR]: "Organizátor",
  [Role.CASOMERIC]: "Časoměřič",
  [Role.STANOVISTE]: "Stanoviště",
  [Role.VEREJNOST]: "Veřejnost",
};

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}
