import { useState } from "react";
import type { CourseRecordsResponseDto, RunnerHistoryResponseDto } from "@depo/shared";
import { api, ApiError } from "../lib/api";
import { AppShell } from "../components/AppShell";

/** F26 (Fáze 4) — reporty rekordů tratě a historie výkonů běžce. */
export function Reports() {
  const [nazevTrasy, setNazevTrasy] = useState("");
  const [rekordy, setRekordy] = useState<CourseRecordsResponseDto | null>(null);
  const [prijmeni, setPrijmeni] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [historie, setHistorie] = useState<RunnerHistoryResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hledatRekordy() {
    if (!nazevTrasy.trim()) return;
    setError(null);
    try {
      const data = await api.get<CourseRecordsResponseDto>(
        `/reports/course-records?nazev=${encodeURIComponent(nazevTrasy.trim())}`
      );
      setRekordy(data);
    } catch (e) {
      setRekordy(null);
      setError(e instanceof ApiError ? e.message : "Chyba načítání rekordů");
    }
  }

  async function hledatHistorii() {
    if (!prijmeni.trim() || !jmeno.trim()) return;
    setError(null);
    try {
      const data = await api.get<RunnerHistoryResponseDto>(
        `/reports/runner-history?prijmeni=${encodeURIComponent(prijmeni.trim())}&jmeno=${encodeURIComponent(jmeno.trim())}`
      );
      setHistorie(data);
    } catch (e) {
      setHistorie(null);
      setError(e instanceof ApiError ? e.message : "Chyba načítání historie");
    }
  }

  return (
    <AppShell active="reporty">
      <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontWeight: 800, fontSize: 22 }}>Reporty (F26)</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <section className="dash-card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Rekordy tratě</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          Zadejte přesný název trasy (spojuje se napříč ročníky stejného názvu ve vaší organizaci).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            value={nazevTrasy}
            onChange={(e) => setNazevTrasy(e.target.value)}
            placeholder="Např. 10 km"
            style={inputStyle}
          />
          <button onClick={hledatRekordy} className="btn-pill primary">
            Hledat
          </button>
        </div>

        {rekordy && (
          <div>
            <p className="mono" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Nalezeno {rekordy.pocetRocniku} ročníků.
            </p>
            {rekordy.celkovyRekord ? (
              <p>
                <strong>Celkový rekord:</strong> {rekordy.celkovyRekord.prijmeni} {rekordy.celkovyRekord.jmeno} —{" "}
                {rekordy.celkovyRekord.casCelkem} ({rekordy.celkovyRekord.udalostNazev}, {rekordy.celkovyRekord.udalostDatum})
              </p>
            ) : (
              <p>Zatím žádné klasifikované výsledky.</p>
            )}
            {rekordy.rekordyPodleKategorie.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Kategorie</th>
                    <th style={thStyle}>Jméno</th>
                    <th style={thStyle}>Čas</th>
                    <th style={thStyle}>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {rekordy.rekordyPodleKategorie.map((r) => (
                    <tr key={r.kategorieKod}>
                      <td style={tdStyle}>{r.kategorieKod}</td>
                      <td style={tdStyle}>
                        {r.prijmeni} {r.jmeno}
                      </td>
                      <td style={tdStyle} className="mono">
                        {r.casCelkem}
                      </td>
                      <td style={tdStyle}>
                        {r.udalostNazev} ({r.udalostDatum})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <section className="dash-card">
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Historie výkonů běžce</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <input value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} placeholder="Příjmení" style={inputStyle} />
          <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} placeholder="Jméno" style={inputStyle} />
          <button onClick={hledatHistorii} className="btn-pill primary">
            Hledat
          </button>
        </div>

        {historie && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Akce</th>
                <th style={thStyle}>Trasa</th>
                <th style={thStyle}>Kat.</th>
                <th style={thStyle}>Čas</th>
                <th style={thStyle}>Poř.</th>
              </tr>
            </thead>
            <tbody>
              {historie.zavody.map((z, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {z.udalostNazev} ({z.udalostDatum})
                  </td>
                  <td style={tdStyle}>{z.trasaNazev}</td>
                  <td style={tdStyle}>{z.kategorieKod}</td>
                  <td style={tdStyle} className="mono">
                    {z.casCelkem ?? (z.stavUkonceni ?? "—")}
                  </td>
                  <td style={tdStyle}>
                    {z.poradiCelkove ?? "—"} / {z.poradiKategorie ?? "—"}
                  </td>
                </tr>
              ))}
              {historie.zavody.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    Žádné závody nenalezeny.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid var(--line)",
  padding: "6px 8px",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--line)",
  padding: "6px 8px",
  fontSize: 14,
};
