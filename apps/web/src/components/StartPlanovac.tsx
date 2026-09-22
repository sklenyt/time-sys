import { useEffect, useState } from "react";
import type { StartVlna } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";

function formatOdpocet(msDoStartu: number): string {
  if (msDoStartu <= 0) return "start právě teď…";
  const s = Math.floor(msDoStartu / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/**
 * Výchozí hodnota pole (teď + 15 min) — na některých prohlížečích (Safari)
 * prázdný <input type="datetime-local"> zobrazuje dnešní datum jako
 * nezávazný šedý náhled, který ale NENÍ skutečná hodnota (input.value je
 * pořád ""), takže tlačítko zůstane disabled a klik nic neudělá. Reálná
 * přednastavená hodnota tomu předejde.
 */
function vychoziCas(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface StartPlanovacProps {
  routeId: string;
  vlna: StartVlna | undefined;
  onChanged: () => void;
}

/**
 * Naplánování automatického startu (F05 rozšíření) — organizátor zadá čas,
 * server (StartAutostartService) trať spustí sám přesně v ten okamžik, i
 * bez otevřeného prohlížeče. Ruční tlačítko Start ve Správě zůstává jako
 * záloha a plán zruší (viz start-vlny.service.ts).
 */
export function StartPlanovac({ routeId, vlna, onChanged }: StartPlanovacProps) {
  const [cas, setCas] = useState(vychoziCas);
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [ted, setTed] = useState(() => Date.now());

  const planovanyStartIso = vlna?.planovanyStart ?? null;
  const planovanyStart = planovanyStartIso ? new Date(planovanyStartIso) : null;

  useEffect(() => {
    if (!planovanyStartIso) return;
    const id = setInterval(() => setTed(Date.now()), 1000);
    return () => clearInterval(id);
  }, [planovanyStartIso]);

  if (vlna?.casStartu) return null;

  async function naplanovat() {
    if (!cas) return;
    setOdesilam(true);
    setChyba(null);
    try {
      await api.post(`/routes/${routeId}/start-plan`, {
        startVlnaId: vlna?.id,
        planovanyStart: new Date(cas).toISOString(),
      });
      setCas(vychoziCas());
      onChanged();
    } catch (e) {
      setChyba(chybaZeServeru(e, "Naplánování se nezdařilo"));
    } finally {
      setOdesilam(false);
    }
  }

  async function zrusit() {
    setOdesilam(true);
    setChyba(null);
    try {
      await api.del(`/routes/${routeId}/start-plan`);
      onChanged();
    } catch (e) {
      setChyba(chybaZeServeru(e, "Zrušení se nezdařilo"));
    } finally {
      setOdesilam(false);
    }
  }

  const boxStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "8px 12px",
  };

  if (planovanyStart) {
    return (
      <div style={boxStyle}>
        <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-secondary)" }}>
          Automatický start
        </span>
        <span className="mono" style={{ fontSize: 13, color: "var(--tape-700)", fontWeight: 700 }}>
          za {formatOdpocet(planovanyStart.getTime() - ted)}
        </span>
        <button onClick={zrusit} disabled={odesilam} className="btn-pill">
          Zrušit plán
        </button>
        {chyba && <span style={{ color: "var(--color-danger)", fontSize: 12.5 }}>{chyba}</span>}
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-secondary)" }}>
        Automatický start
      </span>
      <input
        type="datetime-local"
        value={cas}
        onChange={(e) => setCas(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}
      />
      <button onClick={naplanovat} disabled={odesilam || !cas} className="btn-pill">
        Naplánovat start
      </button>
      {chyba && <span style={{ color: "var(--color-danger)", fontSize: 12.5 }}>{chyba}</span>}
    </div>
  );
}
