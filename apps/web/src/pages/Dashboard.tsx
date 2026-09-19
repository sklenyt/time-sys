import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AuthUserDto, Organizace, Trasa, Udalost } from "@depo/shared";
import { Role, TypStartu } from "@depo/shared";
import { api } from "../lib/api";

export function Dashboard() {
  const [organizace, setOrganizace] = useState<Organizace[]>([]);
  const [udalosti, setUdalosti] = useState<Udalost[]>([]);
  const [trasyByEvent, setTrasyByEvent] = useState<Record<string, Trasa[]>>({});
  const [orgNazev, setOrgNazev] = useState("");
  const [eventNazev, setEventNazev] = useState("");
  const [eventDatum, setEventDatum] = useState("");
  const [routeDrafts, setRouteDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba načítání");
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function createOrg() {
    if (!orgNazev.trim()) return;
    await api.post("/organizations", { nazev: orgNazev });
    setOrgNazev("");
    reload();
  }

  async function createEvent() {
    if (!eventNazev.trim() || !eventDatum || organizace.length === 0) return;
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
    reload();
  }

  async function createRoute(eventId: string) {
    const nazev = routeDrafts[eventId];
    if (!nazev?.trim()) return;
    await api.post(`/events/${eventId}/routes`, {
      nazev,
      pocetKol: 1,
      typStartu: TypStartu.HROMADNY,
    });
    setRouteDrafts((d) => ({ ...d, [eventId]: "" }));
    reload();
  }

  async function startRace(routeId: string) {
    try {
      await api.post(`/routes/${routeId}/start`, {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start se nezdařil");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 800 }}>Přehled akcí</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {organizace.length === 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2>Nejdřív založte organizaci</h2>
          <input
            value={orgNazev}
            onChange={(e) => setOrgNazev(e.target.value)}
            placeholder="Název klubu"
            style={inputStyle}
          />
          <button onClick={createOrg} style={buttonStyle}>
            Založit
          </button>
        </section>
      )}

      {organizace.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2>Nová akce</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={eventNazev}
              onChange={(e) => setEventNazev(e.target.value)}
              placeholder="Např. Jarní běh Mělník 2026"
              style={inputStyle}
            />
            <input
              type="date"
              value={eventDatum}
              onChange={(e) => setEventDatum(e.target.value)}
              style={inputStyle}
            />
            <button onClick={createEvent} style={buttonStyle}>
              Založit akci
            </button>
          </div>
        </section>
      )}

      {udalosti.map((u) => (
        <article
          key={u.id}
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            marginBottom: 16,
            background: "var(--paper)",
          }}
        >
          <h3 style={{ margin: "0 0 4px" }}>{u.nazev}</h3>
          <p className="mono" style={{ color: "var(--text-secondary)", margin: "0 0 12px" }}>
            {u.datum.slice(0, 10)}
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {(trasyByEvent[u.id] ?? []).map((t) => (
              <li
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span>{t.nazev}</span>
                <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => startRace(t.id)} style={{ ...buttonStyle, padding: "4px 10px", fontSize: 12 }}>
                    Start
                  </button>
                  <Link to={`/startovni-listina/${t.id}`}>Startovní listina</Link>
                  <Link to={`/mereni/${t.id}`}>Měření</Link>
                  <Link to={`/vysledky/${t.id}`}>Výsledky</Link>
                </span>
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
            <button onClick={() => createRoute(u.id)} style={buttonStyle}>
              Přidat trasu
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  background: "var(--navy-800)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontWeight: 600,
  cursor: "pointer",
};
