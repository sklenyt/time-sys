import { useMemo, useState } from "react";
import type { ReferenceDto } from "@depo/shared";

// Zjednodušený obrys ČR (lon, lat) — schematická mapa bez externích dlaždic a sledování.
const OBRYS: [number, number][] = [
  [12.09, 50.25], [12.52, 50.4], [13.0, 50.5], [13.5, 50.7], [14.3, 50.9], [14.5, 51.05], [15.0, 51.02], [15.2, 50.9],
  [16.0, 50.65], [16.4, 50.6], [16.9, 50.35], [17.7, 50.3], [18.0, 50.2], [18.5, 49.95], [18.85, 49.5], [18.4, 49.3],
  [17.9, 49.0], [17.5, 48.85], [17.1, 48.8], [16.9, 48.65], [16.4, 48.75], [16.0, 48.75], [15.2, 48.99], [14.7, 48.6],
  [14.45, 48.65], [13.8, 48.77], [13.4, 48.95], [12.9, 49.4], [12.5, 49.7], [12.2, 50.0],
];
const K = 0.645;
const MERITKO = 150;
const OX = 20;
const OY = 14;

function promitnout(lon: number, lat: number): [number, number] {
  return [OX + (lon - 12.0) * K * MERITKO, OY + (51.1 - lat) * MERITKO];
}

const OBRYS_PATH = "M" + OBRYS.map(([lon, lat]) => promitnout(lon, lat).map((c) => c.toFixed(1)).join(",")).join("L") + "Z";

function formatCislo(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Interaktivní mapa referencí: body = akce, velikost podle počtu závodníků, klik ukáže detail. */
export function ReferenceMapa({ reference, odkazNaVysledky }: { reference: ReferenceDto[]; odkazNaVysledky: (id: string) => string }) {
  const roky = useMemo(
    () => Array.from(new Set(reference.map((r) => new Date(r.datum).getFullYear()))).sort((a, b) => b - a),
    [reference]
  );
  const [rok, setRok] = useState<number | "vse">("vse");
  const [vybranoId, setVybranoId] = useState<string | null>(null);

  const filtrovane = reference.filter((r) => rok === "vse" || new Date(r.datum).getFullYear() === rok);
  const vybrana = filtrovane.find((r) => r.id === vybranoId) ?? null;
  const mist = new Set(filtrovane.map((r) => r.misto).filter(Boolean)).size;

  return (
    <div className="landing-reference">
      <div className="landing-reference-cisla">
        <div>
          <b>{filtrovane.length}</b>
          <span>akcí</span>
        </div>
        <div>
          <b>{formatCislo(filtrovane.reduce((soucet, r) => soucet + r.pocetZavodniku, 0))}</b>
          <span>závodníků</span>
        </div>
        <div>
          <b>{mist}</b>
          <span>míst</span>
        </div>
      </div>

      {roky.length > 1 && (
        <div className="landing-reference-filtr" role="group" aria-label="Filtr podle roku">
          {(["vse", ...roky] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={r === rok ? "aktivni" : ""}
              onClick={() => {
                setRok(r);
                setVybranoId(null);
              }}
            >
              {r === "vse" ? "Všechny roky" : r}
            </button>
          ))}
        </div>
      )}

      <div className="landing-reference-grid">
        <div className="landing-reference-mapa">
          <svg viewBox="0 0 680 400" width="100%" role="img" aria-label="Mapa České republiky s místy akcí měřených přes Depo">
            <path d={OBRYS_PATH} className="landing-reference-obrys" />
            {filtrovane
              .filter((r) => r.lat !== null && r.lon !== null)
              .map((r) => {
                const [x, y] = promitnout(r.lon as number, r.lat as number);
                const polomer = 6 + Math.sqrt(r.pocetZavodniku) / 3;
                const vybrano = r.id === vybranoId;
                return (
                  <g
                    key={r.id}
                    className={`landing-reference-bod${vybrano ? " vybrano" : ""}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${r.nazev}, ${r.misto ?? ""}`}
                    onClick={() => setVybranoId(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setVybranoId(r.id);
                      }
                    }}
                  >
                    <circle className="halo" cx={x} cy={y} r={polomer + 6} />
                    <circle className="bod" cx={x} cy={y} r={polomer} />
                    {r.misto && (
                      <text
                        x={x > 540 ? x - polomer - 7 : x + polomer + 7}
                        y={y + 4}
                        textAnchor={x > 540 ? "end" : "start"}
                      >
                        {r.misto}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        </div>

        <div className="landing-reference-panel">
          {vybrana ? (
            <div className="landing-reference-karta">
              <h3>{vybrana.nazev}</h3>
              <div className="meta">
                {vybrana.misto ? `${vybrana.misto} · ` : ""}
                {new Date(vybrana.datum).toLocaleDateString("cs-CZ")}
              </div>
              <div className="cisla">
                <span>
                  <b>{formatCislo(vybrana.pocetZavodniku)}</b> závodníků
                </span>
                <span>
                  <b>{vybrana.pocetTrati}</b> {vybrana.pocetTrati === 1 ? "trať" : vybrana.pocetTrati < 5 ? "tratě" : "tratí"}
                </span>
              </div>
              <a className="btn-pill" href={odkazNaVysledky(vybrana.id)}>
                Výsledky akce
              </a>
            </div>
          ) : (
            <div className="landing-reference-karta prazdna">Klikni na bod na mapě nebo na akci v seznamu.</div>
          )}
          <ul className="landing-reference-seznam">
            {filtrovane.map((r) => (
              <li key={r.id}>
                <button type="button" className={r.id === vybranoId ? "aktivni" : ""} onClick={() => setVybranoId(r.id)}>
                  <span>{r.nazev}</span>
                  <small>
                    {r.misto ? `${r.misto} · ` : ""}
                    {new Date(r.datum).getFullYear()}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
