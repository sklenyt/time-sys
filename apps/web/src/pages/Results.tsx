import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { VysledekPolozka, VysledkyResponseDto } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { PublicHeader } from "../components/PublicHeader";

const VSE_KATEGORIE = "__vse__";

function RankBadge({ poradi }: { poradi: number | null }) {
  if (poradi === null) return null;
  const trida = poradi <= 3 ? ` podium-${poradi}` : "";
  return <span className={`rank-badge${trida}`}>{poradi}</span>;
}

const stitekStyl: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
};

/**
 * Tři stavy, ne dva — dokud trať neodstartuje, "ŽIVĚ" by lhalo stejně jako
 * u dokončené trati (SSE spojení samo o sobě nic neříká o tom, jestli
 * závod vůbec začal, viz VysledkyResponseDto.trasaOdstartovana).
 */
function StavStitek({ dokoncena, odstartovana, zive }: { dokoncena: boolean; odstartovana: boolean; zive: boolean }) {
  if (dokoncena) {
    return (
      <span className="mono" style={{ ...stitekStyl, background: "var(--text-secondary)", color: "#fff" }}>
        UKONČENO
      </span>
    );
  }
  if (!odstartovana) {
    return (
      <span className="mono" style={{ ...stitekStyl, background: "var(--surface)", color: "var(--text-secondary)" }}>
        PŘED STARTEM
      </span>
    );
  }
  if (!zive) return null;
  return (
    <span className="mono" style={{ ...stitekStyl, background: "var(--color-live-700)", color: "#fff" }}>
      ● ŽIVĚ
    </span>
  );
}

function odpovidaHledani(p: VysledekPolozka, hledani: string): boolean {
  if (!hledani) return true;
  const jehla = hledani.toLowerCase();
  return (
    p.prijmeni.toLowerCase().includes(jehla) ||
    p.jmeno.toLowerCase().includes(jehla) ||
    String(p.startovniCislo).includes(jehla) ||
    (p.klub?.toLowerCase().includes(jehla) ?? false)
  );
}

export function Results() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [vysledky, setVysledky] = useState<VysledkyResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zive, setZive] = useState(false);
  const [hledani, setHledani] = useState("");
  const [kategorie, setKategorie] = useState(VSE_KATEGORIE);
  // Počítadlo aktualizací pro skrytou aria-live oblast níž — čtečka
  // obrazovky tak dostane krátké oznámení "výsledky aktualizovány" místo
  // toho, aby se jí při každé SSE zprávě přečetla znovu celá tabulka.
  const [pocetAktualizaci, setPocetAktualizaci] = useState(0);

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
        setPocetAktualizaci((n) => n + 1);
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

  useEffect(() => {
    setKategorie(VSE_KATEGORIE);
    setHledani("");
  }, [routeId]);

  const kategorieSeznam = useMemo(() => {
    if (!vysledky) return [];
    const mapa = new Map<string, string>();
    for (const p of [...vysledky.klasifikovani, ...vysledky.neklasifikovani]) {
      mapa.set(p.kategorieKod, p.kategorieNazev);
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [vysledky]);

  const klasifikovaniFiltr = useMemo(() => {
    if (!vysledky) return [];
    return vysledky.klasifikovani.filter(
      (p) => (kategorie === VSE_KATEGORIE || p.kategorieKod === kategorie) && odpovidaHledani(p, hledani)
    );
  }, [vysledky, kategorie, hledani]);

  const neklasifikovaniFiltr = useMemo(() => {
    if (!vysledky) return [];
    return vysledky.neklasifikovani.filter(
      (p) => (kategorie === VSE_KATEGORIE || p.kategorieKod === kategorie) && odpovidaHledani(p, hledani)
    );
  }, [vysledky, kategorie, hledani]);

  if (!vysledky) {
    return (
      <div style={{ minHeight: "100%", background: "var(--surface)", padding: "24px 16px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <PublicHeader />
          {error ?? "Načítám…"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--surface)", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <PublicHeader />
        {zive && pocetAktualizaci > 0 && (
          // Text musí obsahovat pocetAktualizaci, jinak React při stejném
          // obsahu DOM text-node vůbec nezmění a živé oznámení pro čtečku
          // obrazovky se nikdy nespustí (aria-live reaguje na změnu obsahu,
          // ne na samotný re-render).
          <span className="sr-only" role="status" aria-live="polite">
            Výsledky aktualizovány (změna č. {pocetAktualizaci})
          </span>
        )}

        <div className="dash-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>{vysledky.trasaNazev}</h1>
                <StavStitek dokoncena={vysledky.trasaDokoncena} odstartovana={vysledky.trasaOdstartovana} zive={zive} />
              </div>
              <div className="meta mono" style={{ marginTop: 2 }}>
                {vysledky.udalostNazev}
              </div>
            </div>
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={`${API_BASE}/routes/${routeId}/results/export.xlsx`} className="btn-pill">
                Stáhnout XLSX
              </a>
              <a href={`${API_BASE}/routes/${routeId}/results/export.pdf`} className="btn-pill">
                Stáhnout PDF
              </a>
            </span>
          </div>

          <div className="stat-tile-row" style={{ margin: "18px 0 0" }}>
            <div className="stat-tile">
              <div className="l">Klasifikováno</div>
              <div className="n">{vysledky.klasifikovani.length}</div>
            </div>
            <div className="stat-tile">
              <div className="l">Kategorie</div>
              <div className="n">{kategorieSeznam.length}</div>
            </div>
            {vysledky.neklasifikovani.length > 0 && (
              <div className="stat-tile">
                <div className="l">Neklasifikováno</div>
                <div className="n attention">{vysledky.neklasifikovani.length}</div>
              </div>
            )}
          </div>
        </div>

        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <div className="results-toolbar">
          <input
            value={hledani}
            onChange={(e) => setHledani(e.target.value)}
            placeholder="Hledat podle jména, čísla nebo klubu…"
            className="results-search"
            type="search"
          />
        </div>
        {vysledky.trasy && vysledky.trasy.length > 1 && (
          <div className="results-category-pills" style={{ marginBottom: 12 }}>
            {vysledky.trasy.map((t) => (
              <button
                key={t.id}
                className={`chip-filter${t.id === routeId ? " active" : ""}`}
                onClick={() => t.id !== routeId && navigate(`/vysledky/${t.id}`)}
              >
                {t.nazev}
              </button>
            ))}
          </div>
        )}
        {kategorieSeznam.length > 1 && (
          <div className="results-category-pills" style={{ marginBottom: 16 }}>
            <button
              className={`chip-filter${kategorie === VSE_KATEGORIE ? " active" : ""}`}
              onClick={() => setKategorie(VSE_KATEGORIE)}
            >
              Vše
            </button>
            {kategorieSeznam.map(([kod, nazev]) => (
              <button
                key={kod}
                className={`chip-filter${kategorie === kod ? " active" : ""}`}
                onClick={() => setKategorie(kod)}
                title={nazev}
              >
                {kod}
              </button>
            ))}
          </div>
        )}

        <div className="dash-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll">
            <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
                  <th style={{ padding: "12px 16px" }}>Celk.</th>
                  <th style={{ padding: "12px 8px" }}>Kat.</th>
                  <th style={{ fontFamily: "var(--font-ui)", padding: "12px 8px" }}>Č.</th>
                  <th style={{ fontFamily: "var(--font-ui)", padding: "12px 8px" }}>Jméno</th>
                  <th style={{ fontFamily: "var(--font-ui)", padding: "12px 8px" }}>Klub</th>
                  <th style={{ fontFamily: "var(--font-ui)", padding: "12px 8px" }}>Kategorie</th>
                  <th style={{ padding: "12px 16px" }}>Čas</th>
                </tr>
              </thead>
              <tbody>
                {klasifikovaniFiltr.map((p) => (
                  <tr key={p.prihlaskaId} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 16px" }}>
                      <RankBadge poradi={p.poradiCelkove} />
                    </td>
                    <td style={{ padding: "10px 8px", color: "var(--text-secondary)" }}>{p.poradiKategorie}</td>
                    <td style={{ padding: "10px 8px" }}>{p.startovniCislo}</td>
                    <td style={{ fontFamily: "var(--font-ui)", padding: "10px 8px" }}>
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
                    <td style={{ fontFamily: "var(--font-ui)", padding: "10px 8px", color: "var(--text-secondary)", fontSize: 12.5 }}>
                      {p.klub ?? "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-ui)", padding: "10px 8px" }}>{p.kategorieKod}</td>
                    <td style={{ fontWeight: 700, padding: "10px 16px" }}>{p.casCelkem}</td>
                  </tr>
                ))}
                {klasifikovaniFiltr.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "20px 16px", color: "var(--text-secondary)", fontFamily: "var(--font-ui)" }}>
                      Nic neodpovídá hledání.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {neklasifikovaniFiltr.length > 0 && (
          <div className="dash-card" style={{ padding: 0, overflow: "hidden", marginTop: 16 }}>
            <div className="dash-card-head" style={{ padding: "16px 16px 0" }}>
              <h2>Neklasifikovaní</h2>
            </div>
            <div className="table-scroll">
              <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {neklasifikovaniFiltr.map((p) => (
                    <tr key={p.prihlaskaId} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 16px" }}>{p.startovniCislo}</td>
                      <td style={{ fontFamily: "var(--font-ui)", padding: "10px 8px" }}>
                        {p.prijmeni} {p.jmeno}
                      </td>
                      <td style={{ fontFamily: "var(--font-ui)", padding: "10px 8px" }}>{p.kategorieKod}</td>
                      <td style={{ color: "var(--text-secondary)", padding: "10px 16px" }}>
                        {p.stavUkonceni ??
                          (p.pocetKol > 1 && p.aktualniKolo ? `kolo ${p.aktualniKolo}/${p.pocetKol}` : "v cíli zatím ne")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
