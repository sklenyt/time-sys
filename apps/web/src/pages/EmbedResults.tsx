import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { VysledkyResponseDto } from "@depo/shared";
import { api, API_BASE } from "../lib/api";

/**
 * Vložitelný widget živých výsledků (F38) — bezhlavá, minimalistická
 * varianta stránky výsledků určená pro <iframe> na webu organizátora
 * (ne appka Depo). Žádná navigace, žádné stahování — jen tabulka, která
 * se sama aktualizuje přes SSE stejně jako plná stránka výsledků.
 */
export function EmbedResults() {
  const { routeId } = useParams<{ routeId: string }>();
  const [vysledky, setVysledky] = useState<VysledkyResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    let dostalData = false;
    const es = new EventSource(`${API_BASE}/routes/${routeId}/results/live`);
    es.onmessage = (e) => {
      dostalData = true;
      try {
        setVysledky(JSON.parse(e.data));
      } catch {
        // poškozený rámec — počkáme na další
      }
    };
    es.onerror = () => {
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
      <div style={{ fontFamily: "var(--font-ui)", padding: 12, fontSize: 13, color: "var(--text-secondary)" }}>
        {error ?? "Načítám…"}
      </div>
    );
  }

  const top = vysledky.klasifikovani.slice(0, 20);

  return (
    <div style={{ fontFamily: "var(--font-ui)", padding: 12, fontSize: 13, color: "var(--navy-800)" }}>
      <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
            <th style={{ padding: "4px 6px" }}>#</th>
            <th style={{ padding: "4px 6px", fontFamily: "var(--font-ui)" }}>Jméno</th>
            <th style={{ padding: "4px 6px", fontFamily: "var(--font-ui)" }}>Kat.</th>
            <th style={{ padding: "4px 6px" }}>Čas</th>
          </tr>
        </thead>
        <tbody>
          {top.map((p) => (
            <tr key={p.prihlaskaId} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "4px 6px" }}>{p.poradiCelkove}</td>
              <td style={{ padding: "4px 6px", fontFamily: "var(--font-ui)" }}>
                {p.prijmeni} {p.jmeno}
              </td>
              <td style={{ padding: "4px 6px", fontFamily: "var(--font-ui)" }}>{p.kategorieKod}</td>
              <td style={{ padding: "4px 6px", fontWeight: 700 }}>{p.casCelkem}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {vysledky.klasifikovani.length > top.length && (
        <p style={{ margin: "8px 6px 0", fontSize: 11, color: "var(--text-secondary)" }}>
          + dalších {vysledky.klasifikovani.length - top.length} v cíli
        </p>
      )}
      <p style={{ margin: "8px 6px 0", fontSize: 10, color: "var(--text-secondary)" }}>
        Živě z <a href={`${API_BASE.replace(/\/api\/v1$/, "")}`}>Depo</a>
      </p>
    </div>
  );
}
