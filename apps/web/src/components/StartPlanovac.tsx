import { useEffect, useState } from "react";
import type { StartVlna } from "@depo/shared";
import { api } from "../lib/api";

function formatOdpocet(msDoStartu: number): string {
  if (msDoStartu <= 0) return "start právě teď…";
  const s = Math.floor(msDoStartu / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
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
  const [cas, setCas] = useState("");
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
      setCas("");
      onChanged();
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Naplánování se nezdařilo");
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
      setChyba(e instanceof Error ? e.message : "Zrušení se nezdařilo");
    } finally {
      setOdesilam(false);
    }
  }

  if (planovanyStart) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <span className="mono" style={{ fontSize: 13, color: "var(--tape-700)", fontWeight: 700 }}>
          Automatický start za {formatOdpocet(planovanyStart.getTime() - ted)}
        </span>
        <button onClick={zrusit} disabled={odesilam} className="btn-pill">
          Zrušit plán
        </button>
        {chyba && <span style={{ color: "var(--color-danger)", fontSize: 12.5 }}>{chyba}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
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
