import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { RunningResponseDto } from "@depo/shared";
import { api } from "../lib/api";

export function Running() {
  const { routeId } = useParams<{ routeId: string }>();
  const [data, setData] = useState<RunningResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    function load() {
      api
        .get<RunningResponseDto>(`/routes/${routeId}/running`)
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"));
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [routeId]);

  if (!data) return <div style={{ padding: 24 }}>{error ?? "Načítám…"}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 800 }}>Kdo ještě běží</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <div style={{ display: "flex", gap: 16, margin: "16px 0", fontFamily: "var(--font-mono, monospace)" }}>
        <span>Přihlášeno: {data.celkemPrihlasenych}</span>
        <span style={{ color: "var(--color-success, green)" }}>V cíli: {data.dokonceniPocet}</span>
        <span style={{ color: "var(--color-danger)" }}>DNS/DNF/DQ: {data.neukonceniPocet}</span>
        <span>Na trati: {data.bezi.length}</span>
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
    </div>
  );
}
