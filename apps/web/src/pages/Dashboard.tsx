import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  AnomaliePolozka,
  AnomaliesResponseDto,
  AuthUserDto,
  ConflictItemDto,
  Organizace,
  RunningResponseDto,
  Trasa,
  Udalost,
  VysledkyResponseDto,
} from "@depo/shared";
import { Role, TypAnomalie, TypStartu } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { AppShell } from "../components/AppShell";

interface LiveFeedItem {
  key: string;
  startovniCislo: number;
  casCelkem: string | null;
  trasaNazev: string;
}

interface AttentionItem {
  key: string;
  title: string;
  detail: string;
  actionLabel: string;
  to: string;
}

export function Dashboard() {
  const [organizace, setOrganizace] = useState<Organizace[]>([]);
  const [udalosti, setUdalosti] = useState<Udalost[]>([]);
  const [trasyByEvent, setTrasyByEvent] = useState<Record<string, Trasa[]>>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [orgNazev, setOrgNazev] = useState("");
  const [eventNazev, setEventNazev] = useState("");
  const [eventDatum, setEventDatum] = useState("");
  const [routeDrafts, setRouteDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const [runningByRoute, setRunningByRoute] = useState<Record<string, RunningResponseDto>>({});
  const [resultsByRoute, setResultsByRoute] = useState<Record<string, VysledkyResponseDto>>({});
  const [conflictsByRoute, setConflictsByRoute] = useState<Record<string, ConflictItemDto[]>>({});
  const [anomaliesByRoute, setAnomaliesByRoute] = useState<Record<string, AnomaliePolozka[]>>({});
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);

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
      setSelectedEventId((current) => (current && events.some((u) => u.id === current) ? current : (events[0]?.id ?? null)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba načítání");
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const event = useMemo(
    () => udalosti.find((u) => u.id === selectedEventId) ?? udalosti[0] ?? null,
    [udalosti, selectedEventId]
  );
  const trasy = useMemo(() => (event ? (trasyByEvent[event.id] ?? []) : []), [event, trasyByEvent]);
  const trasaIdsKey = trasy.map((t) => t.id).join(",");

  // Živé počty pro stat tiles a karty tratí — dotažené ze skutečných
  // endpointů (Kdo běží / Výsledky / Kolize / Anomálie), ne odhadem.
  useEffect(() => {
    if (!event || trasy.length === 0) return;
    let zruseno = false;

    async function nacistStav() {
      const zaznamy = await Promise.all(
        trasy.map(async (t) => {
          const [running, results, conflicts, anomalies] = await Promise.all([
            api.get<RunningResponseDto>(`/routes/${t.id}/running`).catch(() => null),
            api.get<VysledkyResponseDto>(`/routes/${t.id}/results`).catch(() => null),
            api.get<ConflictItemDto[]>(`/routes/${t.id}/records/conflicts`).catch(() => [] as ConflictItemDto[]),
            api.get<AnomaliesResponseDto>(`/routes/${t.id}/anomalies`).catch(() => null),
          ]);
          return { routeId: t.id, running, results, conflicts, anomalies };
        })
      );
      if (zruseno) return;
      setRunningByRoute(Object.fromEntries(zaznamy.filter((z) => z.running).map((z) => [z.routeId, z.running!])));
      setResultsByRoute(Object.fromEntries(zaznamy.filter((z) => z.results).map((z) => [z.routeId, z.results!])));
      setConflictsByRoute(Object.fromEntries(zaznamy.map((z) => [z.routeId, z.conflicts])));
      setAnomaliesByRoute(
        Object.fromEntries(zaznamy.filter((z) => z.anomalies).map((z) => [z.routeId, z.anomalies!.polozky]))
      );
    }

    nacistStav();
    const interval = setInterval(nacistStav, 5000);
    return () => {
      zruseno = true;
      clearInterval(interval);
    };
    // trasaIdsKey drží efekt stabilní, dokud se sada tratí skutečně nezmění.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, trasaIdsKey]);

  // "Živé doběhy" — napojené na stejný SSE kanál jako veřejná stránka
  // výsledků (F16); nový záznam se pozná diffem oproti poslednímu snímku
  // pro danou trať, ne odhadem podle času v žebříčku.
  useEffect(() => {
    const aktivni = trasy.filter((t) => !t.dokoncena);
    if (aktivni.length === 0) return;
    setLiveFeed([]);
    const videneByRoute = new Map<string, Set<string>>();
    const zdroje = aktivni.map((t) => {
      const es = new EventSource(`${API_BASE}/routes/${t.id}/results/live`);
      es.onmessage = (e) => {
        try {
          const data: VysledkyResponseDto = JSON.parse(e.data);
          const videne = videneByRoute.get(t.id);
          if (videne) {
            const nove = data.klasifikovani.filter((p) => !videne.has(p.prihlaskaId));
            if (nove.length > 0) {
              setLiveFeed((feed) =>
                [
                  ...nove.map((p) => ({
                    key: `${t.id}-${p.prihlaskaId}`,
                    startovniCislo: p.startovniCislo,
                    casCelkem: p.casCelkem,
                    trasaNazev: t.nazev,
                  })),
                  ...feed,
                ].slice(0, 8)
              );
            }
          }
          videneByRoute.set(t.id, new Set(data.klasifikovani.map((p) => p.prihlaskaId)));
        } catch {
          // poškozený SSE rámec — počkáme na další
        }
      };
      return es;
    });
    return () => zdroje.forEach((es) => es.close());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, trasaIdsKey]);

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
    setSelectedEventId(udalost.id);
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
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start se nezdařil");
    }
  }

  async function renameEvent(eventId: string, aktualniNazev: string) {
    const novyNazev = window.prompt("Nový název akce", aktualniNazev);
    if (!novyNazev || !novyNazev.trim() || novyNazev === aktualniNazev) return;
    try {
      await api.patch(`/events/${eventId}`, { nazev: novyNazev.trim() });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Přejmenování se nezdařilo");
    }
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
    try {
      await api.patch(`/events/${eventId}`, heslo.trim() ? { heslo: heslo.trim() } : { odebratHesloVysledku: true });
      window.alert(heslo.trim() ? "Heslo nastaveno." : "Heslo zrušeno — výsledky jsou teď bez hesla.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nastavení hesla se nezdařilo");
    }
  }

  async function toggleDokoncena(routeId: string, dokoncena: boolean) {
    try {
      await api.patch(`/routes/${routeId}`, { dokoncena });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Změna se nezdařila");
    }
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
    try {
      await api.patch(`/routes/${routeId}`, { registraceUzavrena });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Změna se nezdařila");
    }
  }

  async function deleteEvent(eventId: string, nazev: string) {
    if (!window.confirm(`Opravdu smazat akci "${nazev}"? Tuto akci nelze vrátit zpět.`)) return;
    try {
      await api.del(`/events/${eventId}`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Smazání se nezdařilo");
    }
  }

  async function deleteRoute(routeId: string, nazev: string) {
    if (!window.confirm(`Opravdu smazat trasu "${nazev}"? Tuto akci nelze vrátit zpět.`)) return;
    try {
      await api.del(`/routes/${routeId}`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Smazání se nezdařilo");
    }
  }

  const celkemVCili = trasy.reduce((s, t) => s + (runningByRoute[t.id]?.dokonceniPocet ?? 0), 0);
  const celkemNaTrati = trasy.reduce((s, t) => s + (runningByRoute[t.id]?.bezi.length ?? 0), 0);
  const celkemPrihlasenych = trasy.reduce((s, t) => s + (runningByRoute[t.id]?.celkemPrihlasenych ?? 0), 0);
  const beziciTratí = trasy.filter((t) => !t.dokoncena).length;

  const attentionItems: AttentionItem[] = [];
  trasy.forEach((t) => {
    (conflictsByRoute[t.id] ?? []).forEach((c) => {
      attentionItems.push({
        key: `c-${c.id}`,
        title: `Číslo ${c.startovniCislo ?? "?"} zapsáno vícekrát`,
        detail: `${t.nazev} · kolize stanovišť — obě verze čekají na potvrzení`,
        actionLabel: "Vyřešit",
        to: `/konflikty/${t.id}`,
      });
    });
    (anomaliesByRoute[t.id] ?? []).forEach((a) => {
      attentionItems.push({
        key: `a-${a.prihlaskaId}-${a.cas}`,
        title: `Podezřelý čas — č. ${a.startovniCislo}`,
        detail: `${t.nazev} · ${a.typAnomalie === TypAnomalie.PRILIS_RYCHLY ? "výrazně rychlejší" : "výrazně pomalejší"} než ostatní v kat. ${a.kategorieKod}`,
        actionLabel: "Detail",
        to: `/kdo-bezi/${t.id}`,
      });
    });
  });

  const prvniOtevrenaTrasa = trasy.find((t) => !t.dokoncena) ?? trasy[0];

  return (
    <AppShell active="prehled" routeId={prvniOtevrenaTrasa?.id} eventId={event?.id}>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {organizace.length === 0 && (
        <section className="dash-card" style={{ maxWidth: 480, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Nejdřív založte organizaci</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={orgNazev}
              onChange={(e) => setOrgNazev(e.target.value)}
              placeholder="Název klubu"
              style={inputStyle}
            />
            <button onClick={createOrg} className="btn-pill primary">
              Založit
            </button>
          </div>
        </section>
      )}

      {organizace.length > 0 && udalosti.length === 0 && (
        <section className="dash-card" style={{ maxWidth: 480, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Založte první akci</h2>
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
        </section>
      )}

      {event && (
        <>
          {udalosti.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {udalosti.map((u) => (
                <button
                  key={u.id}
                  className={`btn-pill${u.id === event.id ? " primary" : ""}`}
                  onClick={() => setSelectedEventId(u.id)}
                >
                  {u.nazev}
                </button>
              ))}
            </div>
          )}

          <div className="dash-header">
            <div>
              <h1>{event.nazev}</h1>
              <div className="meta mono">
                {formatDatum(event.datum)} · {trasy.length} {trasy.length === 1 ? "trať" : "tratě"} ·{" "}
                {celkemPrihlasenych} přihlášených
              </div>
            </div>
            <div className="dash-header-actions">
              <Link to={`/publikace/${event.id}`} className="btn-pill">
                Publikovat výsledky
              </Link>
              {prvniOtevrenaTrasa && (
                <Link to={`/mereni/${prvniOtevrenaTrasa.id}`} className="btn-pill accent">
                  Otevřít měření
                </Link>
              )}
            </div>
          </div>

          <div className="stat-tile-row">
            <div className="stat-tile">
              <div className="l">V cíli</div>
              <div className="n live">{celkemVCili}</div>
              <div className="d">z {celkemPrihlasenych} startujících</div>
            </div>
            <div className="stat-tile">
              <div className="l">Na trati</div>
              <div className="n">{celkemNaTrati}</div>
              <div className="d">právě běží</div>
            </div>
            <div className="stat-tile">
              <div className="l">Vyžaduje pozornost</div>
              <div className={`n${attentionItems.length > 0 ? " attention" : ""}`}>{attentionItems.length}</div>
              <div className="d">kolize a anomálie</div>
            </div>
            <div className="stat-tile">
              <div className="l">Tratě</div>
              <div className="n">{trasy.length}</div>
              <div className="d">{beziciTratí} běží</div>
            </div>
          </div>

          <div className="dash-grid">
            <div className="dash-card">
              <div className="dash-card-head">
                <h2>Tratě</h2>
                <span className="meta mono">aktualizace 5 s</span>
              </div>
              {trasy.length === 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>Zatím žádná trať — přidejte ji ve Správě níže.</p>
              )}
              {trasy.map((t) => {
                const run = runningByRoute[t.id];
                const res = resultsByRoute[t.id];
                const total = run?.celkemPrihlasenych ?? 0;
                const finishedPct = total ? ((run!.dokonceniPocet / total) * 100).toFixed(1) : "0";
                const runningPct = total ? ((run!.bezi.length / total) * 100).toFixed(1) : "0";
                const stavTridy = t.dokoncena ? "done" : run && (run.dokonceniPocet > 0 || run.bezi.length > 0) ? "running" : "before";
                const stavLabel = t.dokoncena ? "dokončena" : stavTridy === "running" ? "běží" : "před startem";
                const vitez = res?.klasifikovani.find((p) => p.poradiCelkove === 1);
                return (
                  <div className="route-row" key={t.id}>
                    <div className="route-row-head">
                      <span className="name">
                        <Link to={`/vysledky/${t.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {t.nazev}
                        </Link>
                        <span className={`route-state-pill ${stavTridy}`}>{stavLabel}</span>
                      </span>
                      <span className="meta mono">{total} přihlášených</span>
                    </div>
                    <div className="route-progress-track">
                      <div className="route-progress-fill" style={{ width: `${finishedPct}%` }} />
                      <div className="route-progress-fill attention" style={{ width: `${runningPct}%` }} />
                    </div>
                    <div className="route-row-foot">
                      <span className="mono">
                        v cíli {run?.dokonceniPocet ?? "–"} · na trati {run?.bezi.length ?? "–"} · DNS/DNF/DQ{" "}
                        {run?.neukonceniPocet ?? "–"}
                      </span>
                      {vitez && <span className="win">vítěz {vitez.casCelkem}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              {attentionItems.length > 0 ? (
                <div className="attention-panel">
                  <div className="attention-panel-head">
                    <span>Vyžaduje pozornost</span>
                    <span>{attentionItems.length}</span>
                  </div>
                  {attentionItems.map((item) => (
                    <div className="attention-item" key={item.key}>
                      <div>
                        <div className="t">{item.title}</div>
                        <div className="d">{item.detail}</div>
                      </div>
                      <Link to={item.to} className="btn-pill">
                        {item.actionLabel}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-card">
                  <div className="dash-card-head">
                    <h2>Vyžaduje pozornost</h2>
                  </div>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5 }}>
                    Žádné kolize ani podezřelé časy. Zatím je vše v pořádku.
                  </p>
                </div>
              )}

              <div className="live-feed">
                <div className="live-feed-head">
                  <span>Živé doběhy</span>
                  <span style={{ color: "var(--color-live)" }}>● LIVE</span>
                </div>
                {liveFeed.length === 0 ? (
                  <div className="live-feed-empty">Zatím žádný nový doběh v této relaci.</div>
                ) : (
                  liveFeed.map((item) => (
                    <div className="live-feed-row" key={item.key}>
                      <span className="bib">{item.startovniCislo}</span>
                      <span className="time">{item.casCelkem}</span>
                      <span className="route">{item.trasaNazev}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16 }}>Správa akcí a tratí</h2>

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
                <li
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "8px 0",
                    borderTop: "1px solid var(--line)",
                  }}
                >
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
      </section>
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
