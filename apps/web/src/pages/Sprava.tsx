import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import type { AuthUserDto, Organizace, StartVlna, Trasa, Udalost } from "@depo/shared";
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
    await sBusy("Přidávám trasu…", async () => {
      await api.post(`/events/${eventId}/routes`, {
        nazev,
        pocetKol: 1,
        typStartu: TypStartu.HROMADNY,
      });
      setRouteDrafts((d) => ({ ...d, [eventId]: "" }));
      await reload();
    });
  }

  async function startRace(routeId: string) {
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

  async function toggleRegistrace(routeId: string, registraceUzavrena: boolean) {
    await sBusy("Ukládám…", async () => {
      await api.patch(`/routes/${routeId}`, { registraceUzavrena });
      await reload();
    });
  }

  async function deleteEvent(eventId: string, nazev: string) {
    if (!window.confirm(`Opravdu smazat akci "${nazev}"? Tuto akci nelze vrátit zpět.`)) return;
    await sBusy("Mažu akci…", async () => {
      await api.del(`/events/${eventId}`);
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

      {udalosti.map((u) => (
        <article key={u.id} className="dash-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 4px" }}>
            <h3 style={{ margin: 0 }}>{u.nazev}</h3>
            <button onClick={() => renameEvent(u.id, u.nazev)} className="btn-pill">
              Přejmenovat
            </button>
            <button onClick={() => nastavitHesloVysledku(u.id)} className="btn-pill">
              Heslo výsledků
            </button>
            <button onClick={() => deleteEvent(u.id, u.nazev)} className="btn-pill danger">
              Smazat akci
            </button>
          </div>
          <p className="mono" style={{ color: "var(--text-secondary)", margin: "0 0 12px" }}>
            {formatDatum(u.datum)}
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {(trasyByEvent[u.id] ?? []).map((t) => (
              <li key={t.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span>
                    {t.nazev}
                    {t.dokoncena && (
                      <span className="mono" style={{ color: "var(--color-live)", marginLeft: 8, fontSize: 12 }}>
                        dokončeno
                      </span>
                    )}
                  </span>
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
                    <button onClick={() => ukazatEmbedRegistrace(t.id)} className="btn-pill">
                      Embed registrace
                    </button>
                    <button onClick={() => ukazatEmbedKod(t.id)} className="btn-pill">
                      Embed výsledků
                    </button>
                    <button onClick={() => deleteRoute(t.id, t.nazev)} className="btn-pill danger">
                      Smazat
                    </button>
                  </span>
                </div>
                <StartPlanovac routeId={t.id} vlna={vlnaByRoute[t.id]} onChanged={reload} />
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={routeDrafts[u.id] ?? ""}
              onChange={(e) => setRouteDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
              placeholder="Nová trasa, např. 10 km"
              style={inputStyle}
            />
            <button onClick={() => createRoute(u.id)} className="btn-pill primary">
              Přidat trasu
            </button>
          </div>
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

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}
