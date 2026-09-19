import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { RecordResponseDto } from "@depo/shared";
import { api, getDeviceId } from "../lib/api";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "DNF", "0", "⌫"];

export function Measurement() {
  const { routeId } = useParams<{ routeId: string }>();
  const [cislo, setCislo] = useState("");
  const [posledni, setPosledni] = useState<RecordResponseDto[]>([]);
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zapsat = useCallback(async () => {
    if (!routeId || !cislo || odesilam) return;
    setOdesilam(true);
    setChyba(null);
    try {
      const zaznam = await api.post<RecordResponseDto>(`/routes/${routeId}/records`, {
        startovniCislo: Number(cislo),
        zarizeniId: getDeviceId(),
        klientCas: new Date().toISOString(),
        klientEventId: crypto.randomUUID(),
      });
      setPosledni((p) => [zaznam, ...p].slice(0, 8));
      setCislo("");
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Zápis se nepodařilo odeslat — zůstává ve frontě.");
    } finally {
      setOdesilam(false);
    }
  }, [routeId, cislo, odesilam]);

  const stiskniKlavesu = useCallback(
    (k: string) => {
      if (k === "⌫") setCislo((c) => c.slice(0, -1));
      else if (k === "DNF") return; // TODO: samostatný tok pro DNS/DNF/DQ (F11)
      else setCislo((c) => (c.length < 4 ? c + k : c));
    },
    []
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") stiskniKlavesu(e.key);
      else if (e.key === "Backspace") stiskniKlavesu("⌫");
      else if (e.key === "Enter") zapsat();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stiskniKlavesu, zapsat]);

  return (
    <div className="measurement-layout" style={{ background: "var(--ink-900)", color: "#fff" }}>
      <div className="measurement-main">
        <div
          style={{
            background: "var(--navy-800)",
            border: "2px solid var(--navy-600)",
            borderRadius: 20,
            padding: "24px 32px",
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--steel-400)", textTransform: "uppercase" }}>
            Startovní číslo
          </div>
          <div className="mono" style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1, color: cislo ? "var(--tape-500)" : "var(--steel-400)" }}>
            {cislo || "—"}
          </div>
        </div>

        <div className="measurement-keypad">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => stiskniKlavesu(k)}
              className="mono measurement-key"
              style={{
                borderRadius: 14,
                border: "none",
                background: k === "DNF" ? "var(--navy-700)" : "var(--navy-800)",
                color: k === "DNF" ? "var(--steel-400)" : "#fff",
                fontSize: 24,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={zapsat}
          disabled={!cislo || odesilam}
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "18px",
            borderRadius: 14,
            border: "none",
            background: "var(--tape-500)",
            color: "#fff",
            fontSize: 18,
            fontWeight: 800,
            cursor: cislo ? "pointer" : "not-allowed",
            opacity: cislo ? 1 : 0.5,
          }}
        >
          ZAPSAT ↵
        </button>
        {chyba && <p style={{ color: "var(--color-attention)" }}>{chyba}</p>}
      </div>

      <div className="measurement-sidebar">
        <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--steel-400)" }}>
          Poslední zápisy
        </h3>
        {posledni.map((z) => (
          <div
            key={z.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: "1px solid var(--navy-700)",
            }}
          >
            <div
              className="mono"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: z.prihlaskaId ? "var(--navy-700)" : "var(--color-attention)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {z.startovniCisloRaw}
            </div>
            <div style={{ fontSize: 12, color: "var(--steel-400)" }}>
              {z.casCelkem ?? new Date(z.cas).toLocaleTimeString("cs-CZ")}
              {!z.prihlaskaId && <div>nerozpoznáno — k opravě</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
