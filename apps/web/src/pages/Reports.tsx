import { useState } from "react";
import type { CourseRecordsResponseDto, RunnerHistoryResponseDto } from "@depo/shared";
import { api, ApiError } from "../lib/api";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

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
      <div style={{ maxWidth: 1500 }}>
        <HlavickaStranky titulek="Reporty" popis="Rekordy tratí a historie výkonů závodníků napříč ročníky" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ margin: "0 0 4px" }}>Rekordy tratě</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 12px" }}>
            Zadejte přesný název trasy (spojuje se napříč ročníky stejného názvu ve vaší organizaci).
          </p>
          <div className="sl-nastroje">
            <input
              type="search"
              value={nazevTrasy}
              onChange={(e) => setNazevTrasy(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hledatRekordy()}
              placeholder="Např. 10 km"
              className="sl-hledani"
            />
            <button onClick={hledatRekordy} className="btn-pill primary">
              Hledat
            </button>
          </div>

          {rekordy && (
            <>
              <Souhrn
                polozky={[
                  { hodnota: rekordy.pocetRocniku, popisek: "Ročníků" },
                  {
                    hodnota: rekordy.celkovyRekord ? rekordy.celkovyRekord.casCelkem : "—",
                    popisek: rekordy.celkovyRekord
                      ? `Celkový rekord: ${rekordy.celkovyRekord.prijmeni} ${rekordy.celkovyRekord.jmeno} (${rekordy.celkovyRekord.udalostNazev}, ${rekordy.celkovyRekord.udalostDatum})`
                      : "Zatím žádné klasifikované výsledky",
                  },
                ]}
              />
              {rekordy.rekordyPodleKategorie.length > 0 && (
                <TabulkaKarta>
                  <thead>
                    <tr>
                      <th>Kategorie</th>
                      <th>Závodník</th>
                      <th>Čas</th>
                      <th>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekordy.rekordyPodleKategorie.map((r) => (
                      <tr key={r.kategorieKod} className="sl-radek">
                        <td className="mono">{r.kategorieKod}</td>
                        <td style={{ fontWeight: 700 }}>
                          {r.prijmeni} {r.jmeno}
                        </td>
                        <td className="mono" style={{ fontWeight: 700 }}>
                          {r.casCelkem}
                        </td>
                        <td className="sl-podtitul">
                          {r.udalostNazev} ({r.udalostDatum})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TabulkaKarta>
              )}
            </>
          )}
        </section>

        <section>
          <h2 style={{ margin: "0 0 12px" }}>Historie výkonů běžce</h2>
          <div className="sl-nastroje">
            <input value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} placeholder="Příjmení" className="sl-hledani" style={{ minWidth: 160 }} />
            <input
              value={jmeno}
              onChange={(e) => setJmeno(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hledatHistorii()}
              placeholder="Jméno"
              className="sl-hledani"
              style={{ minWidth: 160 }}
            />
            <button onClick={hledatHistorii} className="btn-pill primary">
              Hledat
            </button>
          </div>

          {historie && (
            <TabulkaKarta>
              <thead>
                <tr>
                  <th>Akce</th>
                  <th>Trať</th>
                  <th>Kat.</th>
                  <th>Čas</th>
                  <th>Pořadí</th>
                </tr>
              </thead>
              <tbody>
                {historie.zavody.map((z, i) => (
                  <tr key={i} className="sl-radek">
                    <td style={{ fontWeight: 700 }}>
                      {z.udalostNazev} <span className="sl-podtitul">({z.udalostDatum})</span>
                    </td>
                    <td>{z.trasaNazev}</td>
                    <td className="mono">{z.kategorieKod}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      {z.casCelkem ?? z.stavUkonceni ?? "—"}
                    </td>
                    <td>
                      {z.poradiCelkove ?? "—"} <span className="sl-podtitul">celkově</span> / {z.poradiKategorie ?? "—"}{" "}
                      <span className="sl-podtitul">v kat.</span>
                    </td>
                  </tr>
                ))}
                {historie.zavody.length === 0 && <PrazdnyRadek sloupcu={5} text="Žádné závody nenalezeny." />}
              </tbody>
            </TabulkaKarta>
          )}
        </section>
      </div>
    </AppShell>
  );
}
