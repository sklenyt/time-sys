import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AnomaliesResponseDto, RunningResponseDto } from "@depo/shared";
import { TypAnomalie } from "@depo/shared";
import { api } from "../lib/api";
import { AppShell } from "../components/AppShell";

export function Running() {
  const { routeId } = useParams<{ routeId: string }>();
  const [data, setData] = useState<RunningResponseDto | null>(null);
  const [anomalie, setAnomalie] = useState<AnomaliesResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    function load() {
      api
        .get<RunningResponseDto>(`/routes/${routeId}/running`)
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"));
      api
        .get<AnomaliesResponseDto>(`/routes/${routeId}/anomalies`)
        .then(setAnomalie)
        .catch(() => {
          // Anomálie jsou jen doplňkové upozornění — chyba nesmí shodit hlavní přehled "Kdo běží".
        });
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [routeId]);

  if (!data) {
    return (
      <AppShell active="bezi" routeId={routeId}>
        {error ?? "Načítám…"}
      </AppShell>
    );
  }

  return (
    <AppShell active="bezi" routeId={routeId}>
      <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontWeight: 800, fontSize: 22 }}>Kdo ještě běží</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <div className="stat-tile-row">
        <div className="stat-tile">
          <div className="l">Přihlášeno</div>
          <div className="n">{data.celkemPrihlasenych}</div>
        </div>
        <div className="stat-tile">
          <div className="l">V cíli</div>
          <div className="n live">{data.dokonceniPocet}</div>
        </div>
        <div className="stat-tile">
          <div className="l">Na trati</div>
          <div className="n">{data.bezi.length}</div>
        </div>
        <div className="stat-tile">
          <div className="l">DNS/DNF/DQ</div>
          <div className={`n${data.neukonceniPocet > 0 ? " attention" : ""}`}>{data.neukonceniPocet}</div>
        </div>
      </div>

      <div className="table-scroll">
        <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
              <th>Č.</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Jméno</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Kategorie</th>
              <th>Čas na trati</th>
            </tr>
          </thead>
          <tbody>
            {data.bezi.map((b) => (
              <tr key={b.prihlaskaId} style={{ borderBottom: "1px solid var(--line)" }}>
                <td>{b.startovniCislo}</td>
                <td style={{ fontFamily: "var(--font-ui)" }}>
                  {b.prijmeni} {b.jmeno}
                </td>
                <td style={{ fontFamily: "var(--font-ui)" }}>{b.kategorieKod}</td>
                <td>{b.casOdStartu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.bezi.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Nikdo aktuálně neběží.</p>}

      {anomalie && anomalie.polozky.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ color: "var(--color-danger)" }}>Podezřelé časy</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Výrazná odchylka od mediánu ostatních běžců ve stejné kategorii — možná chyba záznamu, zkrácení trati
            nebo nouzová situace na trati.
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {anomalie.polozky.map((a, i) => (
              <li
                key={i}
                style={{
                  padding: "8px 12px",
                  marginBottom: 8,
                  borderRadius: 8,
                  border: "1px solid var(--color-danger)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                #{a.startovniCislo} {a.prijmeni} {a.jmeno} ({a.kategorieKod}) —{" "}
                {a.typAnomalie === TypAnomalie.PRILIS_RYCHLY ? "podezřele rychlý" : "podezřele pomalý"}{" "}
                {a.typUdalosti === "MEZICAS" ? "mezičas" : "cílový čas"}: {a.cas} (medián kategorie:{" "}
                {Math.round(a.medianKategorieMs / 1000 / 60)} min)
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>
    </AppShell>
  );
}
