import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { OveritPristupResponseDto, VysledkyResponseDto } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { KioskResultsView, KioskZprava } from "../components/KioskResultsView";

const VYCHOZI_INTERVAL_S = 15;

/**
 * Kiosk pro celou akci (F42 rozšíření) — automaticky rotuje mezi všemi
 * tratěmi/kategoriemi jedné akce na jedné obrazovce, aby nebylo potřeba
 * pro každou kategorii ručně otevírat vlastní panel/záložku. Interval
 * rotace jde přenastavit v odkazu přes ?interval=20 (vteřiny).
 *
 * Přístup je stejný jako u veřejného adresáře výsledků (POST
 * /events/:id/pristup) — pokud má akce nastavené heslo, kiosk se na něj
 * zeptá; bez hesla projde rovnou.
 */
export function KioskEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const intervalS = Math.max(5, Number(searchParams.get("interval")) || VYCHOZI_INTERVAL_S);

  const [trasy, setTrasy] = useState<{ id: string; nazev: string }[] | null>(null);
  const [potrebujeHeslo, setPotrebujeHeslo] = useState(false);
  const [heslo, setHeslo] = useState("");
  const [hesloChyba, setHesloChyba] = useState<string | null>(null);
  const [odesilam, setOdesilam] = useState(false);
  const [index, setIndex] = useState(0);
  const [vysledky, setVysledky] = useState<VysledkyResponseDto | null>(null);

  // Tichá první zkouška bez hesla — u akce bez nastaveného hesla projde
  // rovnou (server heslo vůbec neporovnává, pokud žádné nemá nastavené),
  // u zaheslované akce dostaneme 401 a teprve pak zobrazíme dotaz.
  useEffect(() => {
    if (!eventId) return;
    api
      .post<OveritPristupResponseDto>(`/events/${eventId}/pristup`, { heslo: "-" })
      .then((v) => setTrasy(v.trasy))
      .catch(() => setPotrebujeHeslo(true));
  }, [eventId]);

  async function odeslatHeslo(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    setOdesilam(true);
    setHesloChyba(null);
    try {
      const vysledek = await api.post<OveritPristupResponseDto>(`/events/${eventId}/pristup`, { heslo });
      setTrasy(vysledek.trasy);
      setPotrebujeHeslo(false);
    } catch {
      setHesloChyba("Nesprávné heslo.");
    } finally {
      setOdesilam(false);
    }
  }

  // Automatická rotace mezi tratěmi.
  useEffect(() => {
    if (!trasy || trasy.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % trasy.length), intervalS * 1000);
    return () => clearInterval(t);
  }, [trasy, intervalS]);

  // Šipky pro ruční přeskočení — pohodlné při nastavování obrazovky na místě.
  useEffect(() => {
    const pocet = trasy?.length ?? 0;
    if (pocet <= 1) return;
    function naKlavesu(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % pocet);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + pocet) % pocet);
    }
    window.addEventListener("keydown", naKlavesu);
    return () => window.removeEventListener("keydown", naKlavesu);
  }, [trasy]);

  const aktualniTrasaId = trasy?.[index]?.id ?? null;

  useEffect(() => {
    if (!aktualniTrasaId) return;
    setVysledky(null);
    const es = new EventSource(`${API_BASE}/routes/${aktualniTrasaId}/results/live`);
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
          api.get<VysledkyResponseDto>(`/routes/${aktualniTrasaId}/results`).then(setVysledky).catch(() => {});
        }
        return aktualni;
      });
    };
    return () => es.close();
  }, [aktualniTrasaId]);

  if (potrebujeHeslo) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ink-900)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form
          onSubmit={odeslatHeslo}
          style={{
            background: "var(--navy-800)",
            border: "1px solid var(--navy-600)",
            borderRadius: "var(--radius-lg)",
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 320,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>Heslo pro kiosk</h1>
          <input
            type="password"
            autoFocus
            value={heslo}
            onChange={(e) => setHeslo(e.target.value)}
            placeholder="Heslo od pořadatele"
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--navy-600)",
              background: "var(--ink-900)",
              color: "#fff",
              fontSize: 14,
            }}
          />
          <button type="submit" disabled={odesilam} className="btn-pill primary">
            {odesilam ? "…" : "Vstoupit"}
          </button>
          {hesloChyba && (
            <p style={{ color: "var(--color-danger)", fontSize: 13, margin: 0 }}>{hesloChyba}</p>
          )}
        </form>
      </div>
    );
  }

  if (!trasy || trasy.length === 0 || !vysledky) {
    return <KioskZprava>{trasy && trasy.length === 0 ? "Tahle akce zatím nemá žádnou trať." : "Načítám…"}</KioskZprava>;
  }

  return (
    <KioskResultsView
      key={aktualniTrasaId}
      vysledky={vysledky}
      podtitulek={vysledky.udalostNazev}
      rotaceTecky={trasy.length > 1 ? { aktualni: index, celkem: trasy.length } : undefined}
    />
  );
}
