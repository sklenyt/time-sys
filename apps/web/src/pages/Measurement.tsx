import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TypUdalosti } from "@depo/shared";
import { getDeviceId } from "../lib/api";
import { enqueueZaznam, listRecent, startAutoSync, type FrontaZaznam } from "../lib/offline-queue";
import { SystemClockWidget } from "../components/SystemClockWidget";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "DNF", "0", "⌫"];

export function Measurement() {
  const { routeId } = useParams<{ routeId: string }>();
  const [searchParams] = useSearchParams();
  // ?bod=mezicas přepne obrazovku do režimu kontrolního stanoviště (F17) —
  // stejné UI "číslo + Enter", jen se zapisuje typUdalosti=MEZICAS místo
  // DOJEZD a nepočítá se do výsledků.
  const jeMezicas = searchParams.get("bod") === "mezicas";
  const typUdalosti = jeMezicas ? TypUdalosti.MEZICAS : TypUdalosti.DOJEZD;
  const [cislo, setCislo] = useState("");
  const [posledni, setPosledni] = useState<FrontaZaznam[]>([]);
  const [chyba, setChyba] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const obnovitPosledni = useCallback(() => {
    if (!routeId) return;
    listRecent(routeId).then(setPosledni);
  }, [routeId]);

  // Zápis se ukládá lokálně do IndexedDB okamžitě a nikdy nečeká na síť
  // (F15, 03-architecture.md §3.5) — odeslání na server běží na pozadí
  // přes startAutoSync a opakuje se, dokud se nepodaří.
  const zapsat = useCallback(async () => {
    if (!routeId || !cislo) return;
    try {
      await enqueueZaznam(routeId, Number(cislo), typUdalosti);
      setCislo("");
      setChyba(null);
      obnovitPosledni();
    } catch {
      setChyba("Zápis se nepodařilo uložit ani lokálně — zkuste to prosím znovu.");
    }
  }, [routeId, cislo, typUdalosti, obnovitPosledni]);

  useEffect(() => {
    if (!routeId) return;
    obnovitPosledni();
    const zastavitSync = startAutoSync(routeId, getDeviceId(), obnovitPosledni);
    const naOnline = () => setOnline(true);
    const naOffline = () => setOnline(false);
    window.addEventListener("online", naOnline);
    window.addEventListener("offline", naOffline);
    return () => {
      zastavitSync();
      window.removeEventListener("online", naOnline);
      window.removeEventListener("offline", naOffline);
    };
  }, [routeId, obnovitPosledni]);

  const stiskniKlavesu = useCallback(
    (k: string) => {
      if (k === "⌫") setCislo((c) => c.slice(0, -1));
      else if (k === "DNF") {
        // F11 (UC12) je organizátorská akce nad startovní listinou, ne
        // časoměřičský zápis — tahle klávesa proto jen navádí, kam jít,
        // místo aby tiše nedělala nic.
        setChyba("DNS/DNF/DQ se nastavuje ve Startovní listině, ne tady na Měření.");
        setTimeout(() => setChyba(null), 4000);
      } else setCislo((c) => (c.length < 4 ? c + k : c));
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
      <div className="measurement-topbar">
        <Link to="/dashboard" className="measurement-back">
          ← Zpět do administrace
        </Link>
        <SystemClockWidget />
      </div>
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
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              letterSpacing: 2,
              color: "var(--steel-400)",
              textTransform: "uppercase",
            }}
          >
            {jeMezicas ? "Mezičas — startovní číslo" : "Startovní číslo"}
            {!online && (
              <span
                className="mono"
                style={{
                  background: "var(--color-attention)",
                  color: "var(--ink-900)",
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 10,
                  letterSpacing: 0,
                  textTransform: "none",
                }}
              >
                offline — ukládá se lokálně
              </span>
            )}
          </div>
          <div
            className="mono"
            role="status"
            aria-live="polite"
            aria-label={cislo ? `Zadané startovní číslo ${cislo}` : "Zatím nezadáno žádné startovní číslo"}
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              color: cislo ? (jeMezicas ? "var(--color-live)" : "var(--tape-500)") : "var(--steel-400)",
            }}
          >
            {cislo || "—"}
          </div>
        </div>

        <div className="measurement-keypad" role="group" aria-label="Klávesnice pro zadání startovního čísla">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => stiskniKlavesu(k)}
              className="mono measurement-key"
              aria-label={k === "⌫" ? "Smazat poslední číslici" : undefined}
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
          disabled={!cislo}
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "18px",
            borderRadius: 14,
            border: "none",
            background: jeMezicas ? "var(--color-live-700)" : "var(--tape-700)",
            color: "#fff",
            fontSize: 18,
            fontWeight: 800,
            cursor: cislo ? "pointer" : "not-allowed",
            opacity: cislo ? 1 : 0.5,
          }}
        >
          ZAPSAT ↵
        </button>
        {chyba && (
          <p role="alert" style={{ color: "var(--color-attention)" }}>
            {chyba}
          </p>
        )}
      </div>

      <div className="measurement-sidebar">
        <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--steel-400)" }}>
          Poslední zápisy
        </h3>
        {posledni.map((z) => (
          <div
            key={z.localKey}
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
                background: stavBarvaPozadi(z),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {z.startovniCislo}
            </div>
            <div style={{ fontSize: 12, color: "var(--steel-400)" }}>
              {z.casCelkem ?? new Date(z.klientCas).toLocaleTimeString("cs-CZ")}
              {z.typUdalosti === TypUdalosti.MEZICAS && <div>mezičas</div>}
              {z.stav === "CEKA" && <div>čeká na odeslání…</div>}
              {z.stav === "NEEDS_REVIEW" && <div style={{ color: "var(--color-attention)" }}>ke kontrole — kolize stanovišť</div>}
              {z.puvod === "CIZI" && <div>z jiného zařízení</div>}
              {z.stav === "OK" && z.puvod === "VLASTNI" && !z.prihlaskaId && <div>nerozpoznáno — k opravě</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function stavBarvaPozadi(z: FrontaZaznam): string {
  if (z.stav === "NEEDS_REVIEW") return "var(--color-attention)";
  if (z.stav === "CEKA") return "var(--navy-600)";
  if (z.puvod === "VLASTNI" && !z.prihlaskaId) return "var(--color-attention)";
  return "var(--navy-700)";
}
