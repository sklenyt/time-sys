import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { VysledkyResponseDto } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { KioskResultsView, KioskZprava } from "../components/KioskResultsView";

/**
 * Kioskový režim (F42) — celoobrazovková, automaticky se posouvající
 * varianta výsledků jedné tratě pro promítání v cíli. Pro akci s víc
 * kategoriemi/tratěmi najednou viz KioskEvent.tsx (kiosk-akce/:eventId),
 * co mezi nimi samo rotuje.
 */
export function Kiosk() {
  const { routeId } = useParams<{ routeId: string }>();
  const [vysledky, setVysledky] = useState<VysledkyResponseDto | null>(null);

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
      setVysledky((aktualni) => {
        if (!aktualni) {
          api.get<VysledkyResponseDto>(`/routes/${routeId}/results`).then(setVysledky).catch(() => {});
        }
        return aktualni;
      });
    };
    return () => es.close();
  }, [routeId]);

  if (!vysledky) {
    return <KioskZprava>Načítám…</KioskZprava>;
  }

  return <KioskResultsView vysledky={vysledky} podtitulek={vysledky.udalostNazev} />;
}
