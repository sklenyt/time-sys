import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { VysledkyResponseDto } from "@depo/shared";
import { api, API_BASE } from "../lib/api";

/**
 * Kioskový režim (F42) — celoobrazovková, automaticky se posouvající
 * varianta výsledků pro promítání v cíli. Žádné ovládání, žádné
 * stahování; jen velké čitelné řádky a živé aktualizace přes SSE.
 */
export function Kiosk() {
  const { routeId } = useParams<{ routeId: string }>();
  const [vysledky, setVysledky] = useState<VysledkyResponseDto | null>(null);
  const [hodiny, setHodiny] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!routeId) return;
    const es = new EventSource(`${API_BASE}/routes/${routeId}/results/live`);
    es.onmessage = (e) => {
      try {
        setVysledky(JSON.parse(e.data));
      } catch {
        // poškozený rámec — počkáme na další
      }
    };
    es.onerror = () => {
      if (!vysledky) {
        api.get<VysledkyResponseDto>(`/routes/${routeId}/results`).then(setVysledky).catch(() => {});
      }
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

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

  if (!vysledky) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ink-900)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
        Načítám…
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", background: "var(--ink-900)", color: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="kiosk-header">
        <h1 className="kiosk-title">Výsledky</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
