import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { VysledkyResponseDto } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { PublicHeader } from "../components/PublicHeader";

export function Results() {
  const { routeId } = useParams<{ routeId: string }>();
  const [vysledky, setVysledky] = useState<VysledkyResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zive, setZive] = useState(false);

  // Živé výsledky přes Server-Sent Events (F16, 03-architecture.md §3.6) —
  // realtime vrstva je doplněk, ne závislost: pokud SSE selže dřív, než
  // přijde první zpráva, spadneme zpět na obyčejný GET.
  useEffect(() => {
    if (!routeId) return;
    setError(null);
    let dostalData = false;
    const es = new EventSource(`${API_BASE}/routes/${routeId}/results/live`);
    es.onmessage = (e) => {
      dostalData = true;
      setZive(true);
      setError(null);
      try {
        setVysledky(JSON.parse(e.data));
      } catch {
        // poškozený rámec — počkáme na další
      }
    };
    es.onerror = () => {
      setZive(false);
      if (!dostalData) {
        api
          .get<VysledkyResponseDto>(`/routes/${routeId}/results`)
          .then(setVysledky)
          .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání"));
      }
    };
    return () => es.close();
  }, [routeId]);

  if (!vysledky) {
    return (
      <div style={{ minHeight: "100%", background: "var(--surface)", padding: "24px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <PublicHeader />
          {error ?? "Načítám…"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--surface)", padding: "24px 16px" }}>
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <PublicHeader />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>
          Výsledky
          {zive && (
            <span
              className="mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--color-live)",
                color: "#fff",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              ● ŽIVĚ
            </span>
          )}
        </h1>
        <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href={`${API_BASE}/routes/${routeId}/results/export.xlsx`} className="mono">
            Stáhnout XLSX
          </a>
          <a href={`${API_BASE}/routes/${routeId}/results/export.pdf`} className="mono">
            Stáhnout PDF
          </a>
        </span>
      </div>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <div className="table-scroll">
        <table className="mono" style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
              <th>Celk.</th>
              <th>Kat.</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Č.</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Jméno</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Kategorie</th>
              <th>Čas</th>
            </tr>
          </thead>
          <tbody>
            {vysledky.klasifikovani.map((p) => (
              <tr
                key={p.prihlaskaId}
                style={{
                  borderBottom: "1px solid var(--line)",
                  background: p.poradiKategorie && p.poradiKategorie <= 3 ? "var(--surface)" : "transparent",
                }}
              >
                <td>{p.poradiCelkove}</td>
                <td>{p.poradiKategorie}</td>
                <td>{p.startovniCislo}</td>
                <td style={{ fontFamily: "var(--font-ui)" }}>
                  <Link to={`/vysledky/${routeId}/bezec/${p.prihlaskaId}`}>
                    {p.prijmeni} {p.jmeno}
                  </Link>
                  {p.clenoveDruzstva && p.clenoveDruzstva.length > 0 && (
                    <span
                      style={{ fontSize: 11, color: "var(--text-secondary)" }}
                      title={p.clenoveDruzstva.map((c) => `${c.prijmeni} ${c.jmeno}`).join(", ")}
                    >
                      {" "}
                      +{p.clenoveDruzstva.length}
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: "var(--font-ui)" }}>{p.kategorieKod}</td>
                <td style={{ fontWeight: 700 }}>{p.casCelkem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vysledky.neklasifikovani.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Neklasifikovaní</h2>
          <div className="table-scroll">
            <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {vysledky.neklasifikovani.map((p) => (
                  <tr key={p.prihlaskaId} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td>{p.startovniCislo}</td>
                    <td style={{ fontFamily: "var(--font-ui)" }}>
                      {p.prijmeni} {p.jmeno}
                    </td>
                    <td style={{ fontFamily: "var(--font-ui)" }}>{p.kategorieKod}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{p.stavUkonceni ?? "v cíli zatím ne"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
