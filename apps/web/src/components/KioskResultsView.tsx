import { useEffect, useRef, useState } from "react";
import type { VysledkyResponseDto } from "@depo/shared";

interface KioskResultsViewProps {
  vysledky: VysledkyResponseDto;
  /** Doplňkový popisek pod nadpisem — u kiosku pro celou akci název akce + pozice v rotaci. */
  podtitulek?: string;
  /** Tečky ukazující pozici v rotaci mezi tratěmi (jen kiosk celé akce, viz KioskEvent.tsx). */
  rotaceTecky?: { aktualni: number; celkem: number };
}

/**
 * Sdílené tělo kioskové obrazovky (F42) — použito jak pro jednu trať
 * (Kiosk.tsx), tak pro automatickou rotaci mezi tratěmi celé akce
 * (KioskEvent.tsx). Bez ovládání, jen velké čitelné řádky, živé
 * aktualizace přes SSE dodává volající stránka.
 */
export function KioskResultsView({ vysledky, podtitulek, rotaceTecky }: KioskResultsViewProps) {
  const [hodiny, setHodiny] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tik = setInterval(() => setHodiny(new Date()), 1000);
    return () => clearInterval(tik);
  }, []);

  // Pomalý nekonečný scroll — pauza nahoře/dole, aby šlo čtení dohnat.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let smer: 1 | -1 = 1;
    let pauza = 0;
    const krok = () => {
      if (!el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      if (pauza > 0) {
        pauza -= 1;
      } else {
        el.scrollTop += smer;
        if (el.scrollTop >= maxScroll) {
          smer = -1;
          pauza = 60;
        } else if (el.scrollTop <= 0) {
          smer = 1;
          pauza = 60;
        }
      }
    };
    const interval = setInterval(krok, 40);
    return () => clearInterval(interval);
  }, [vysledky]);

  return (
    <div style={{ height: "100vh", background: "var(--ink-900)", color: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="kiosk-header">
        <div>
          <h1 className="kiosk-title">{vysledky.trasaNazev}</h1>
          {podtitulek && (
            <div className="mono" style={{ color: "var(--steel-400)", fontSize: 15, marginTop: 2 }}>
              {podtitulek}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {rotaceTecky && (
            <span style={{ display: "flex", gap: 6 }} aria-hidden="true">
              {Array.from({ length: rotaceTecky.celkem }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: i === rotaceTecky.aktualni ? "var(--tape-500)" : "var(--navy-600)",
                  }}
                />
              ))}
            </span>
          )}
          <span
            className="mono"
            style={{ background: "var(--color-live-700)", padding: "6px 16px", borderRadius: 8, fontSize: 18, fontWeight: 700 }}
          >
            ● ŽIVĚ
          </span>
          <span className="mono kiosk-clock">{hodiny.toLocaleTimeString("cs-CZ")}</span>
        </div>
      </div>

      <div ref={scrollRef} className="kiosk-table-wrap">
        <table className="mono kiosk-table">
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--navy-600)", position: "sticky", top: 0, background: "var(--ink-900)" }}>
              <th>Poř.</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Jméno</th>
              <th className="kiosk-col-kategorie" style={{ fontFamily: "var(--font-ui)" }}>
                Kategorie
              </th>
              <th>Čas</th>
            </tr>
          </thead>
          <tbody>
            {vysledky.klasifikovani.map((p) => (
              <tr key={p.prihlaskaId} style={{ borderBottom: "1px solid var(--navy-700)" }}>
                <td style={{ color: p.poradiCelkove && p.poradiCelkove <= 3 ? "var(--tape-500)" : "#fff" }}>{p.poradiCelkove}</td>
                <td style={{ fontFamily: "var(--font-ui)" }}>
                  {p.prijmeni} {p.jmeno}
                </td>
                <td className="kiosk-col-kategorie" style={{ fontFamily: "var(--font-ui)", color: "var(--steel-400)" }}>
                  {p.kategorieKod}
                </td>
                <td style={{ fontWeight: 700 }}>{p.casCelkem}</td>
              </tr>
            ))}
            {vysledky.klasifikovani.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--steel-400)", fontFamily: "var(--font-ui)", padding: "16px 0" }}>
                  Zatím žádný doběh.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
