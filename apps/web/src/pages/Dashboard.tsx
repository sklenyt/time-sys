import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  AnomaliePolozka,
  AnomaliesResponseDto,
  ConflictItemDto,
  Organizace,
  RunningResponseDto,
  Trasa,
  Udalost,
  VysledkyResponseDto,
} from "@depo/shared";
import { TypAnomalie } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { SystemClockWidget } from "../components/SystemClockWidget";

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
      setError(chybaZeServeru(e, "Chyba načítání"));
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
          <h2 style={{ marginTop: 0 }}>Zatím nemáte žádnou organizaci</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Založte organizaci a první akci ve Správě akcí.
          </p>
          <Link to="/sprava" className="btn-pill primary">
            Přejít do Správy akcí
          </Link>
        </section>
      )}

      {organizace.length > 0 && udalosti.length === 0 && (
        <section className="dash-card" style={{ maxWidth: 480, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Zatím žádná akce</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Založte první akci a trať ve Správě akcí, pak se tu zobrazí živý přehled.
          </p>
          <Link to="/sprava" className="btn-pill primary">
            Přejít do Správy akcí
          </Link>
        </section>
      )}

      {event && (
        <>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <SystemClockWidget />
          </div>

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
              <Link to="/sprava" className="btn-pill">
                Správa akcí
              </Link>
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
    </AppShell>
  );
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}
