import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { VysledkyResponseDto } from "@depo/shared";
import { api } from "../lib/api";

export function Results() {
  const { routeId } = useParams<{ routeId: string }>();
  const [vysledky, setVysledky] = useState<VysledkyResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    api
      .get<VysledkyResponseDto>(`/routes/${routeId}/results`)
      .then(setVysledky)
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"));
  }, [routeId]);

  if (!vysledky) return <div style={{ padding: 24 }}>{error ?? "Načítám…"}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 800 }}>Výsledky</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

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
                {p.prijmeni} {p.jmeno}
              </td>
              <td style={{ fontFamily: "var(--font-ui)" }}>{p.kategorieKod}</td>
              <td style={{ fontWeight: 700 }}>{p.casCelkem}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {vysledky.neklasifikovani.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Neklasifikovaní</h2>
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
        </>
      )}
    </div>
  );
}
