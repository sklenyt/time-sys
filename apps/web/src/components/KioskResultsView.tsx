import { useEffect, useRef, useState } from "react";
import type { VysledkyResponseDto } from "@depo/shared";
import { nactiTema, useTema } from "../lib/tema";
import { TemaPrepinac } from "./TemaPrepinac";

const TEMA_KEY = "depo_kiosk_tema";

/** Celoobrazovková hláška (načítání apod.) ve stejném režimu jako kiosk — jinak by rotace tratí ve světlém režimu problikávala tmavou. */
export function KioskZprava({ children }: { children: React.ReactNode }) {
  return (
    <div className="kiosk" data-tema={nactiTema(TEMA_KEY)} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
      {children}
    </div>
  );
}

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
 * (KioskEvent.tsx). Jediné ovládání je přepínač světlý/tmavý režim,
 * živé aktualizace přes SSE dodává volající stránka.
 */
export function KioskResultsView({ vysledky, podtitulek, rotaceTecky }: KioskResultsViewProps) {
  const [hodiny, setHodiny] = useState(new Date());
  const [tema, prepnoutTema] = useTema(TEMA_KEY);
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
    <div className="kiosk" data-tema={tema} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="kiosk-header">
        <div>
          <h1 className="kiosk-title">{vysledky.trasaNazev}</h1>
          {podtitulek && (
            <div className="mono kiosk-muted" style={{ fontSize: 15, marginTop: 2 }}>
              {podtitulek}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {rotaceTecky && (
            <span style={{ display: "flex", gap: 6 }} aria-hidden="true">
              {Array.from({ length: rotaceTecky.celkem }).map((_, i) => (
                <span key={i} className={`kiosk-tecka${i === rotaceTecky.aktualni ? " aktivni" : ""}`} />
              ))}
            </span>
          )}
          <span
            className="mono"
            style={{ background: "var(--color-live-700)", color: "#fff", padding: "6px 16px", borderRadius: 8, fontSize: 18, fontWeight: 700 }}
          >
            ● ŽIVĚ
          </span>
          <span className="mono kiosk-clock">{hodiny.toLocaleTimeString("cs-CZ")}</span>
          <TemaPrepinac tema={tema} onPrepnout={prepnoutTema} />
        </div>
      </div>

      <div ref={scrollRef} className="kiosk-table-wrap">
        <table className="mono kiosk-table">
          <thead>
            <tr>
              <th className="kiosk-col-poradi">Poř.</th>
              <th className="kiosk-col-kategorie" style={{ fontFamily: "var(--font-ui)" }}>
                Kategorie
              </th>
              <th className="kiosk-col-porkat">Poř. kat.</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Jméno</th>
              <th>Čas</th>
            </tr>
          </thead>
          <tbody>
            {vysledky.klasifikovani.map((p) => (
              <tr key={p.prihlaskaId}>
                <td className={`kiosk-col-poradi${p.poradiCelkove && p.poradiCelkove <= 3 ? " kiosk-podium" : ""}`}>{p.poradiCelkove}</td>
                <td className="kiosk-col-kategorie kiosk-muted" style={{ fontFamily: "var(--font-ui)" }}>
                  {p.kategorieKod}
                </td>
                <td className="kiosk-col-porkat">{p.poradiKategorie}</td>
                <td style={{ fontFamily: "var(--font-ui)" }}>
                  {p.prijmeni} {p.jmeno}
                </td>
                <td style={{ fontWeight: 700 }}>{p.casCelkem}</td>
              </tr>
            ))}
            {vysledky.klasifikovani.length === 0 && (
              <tr>
                <td colSpan={5} className="kiosk-muted" style={{ fontFamily: "var(--font-ui)", padding: "16px 0" }}>
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
