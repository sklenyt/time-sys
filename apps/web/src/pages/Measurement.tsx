import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TypOpravy, TypUdalosti } from "@depo/shared";
import type { RecordResponseDto } from "@depo/shared";
import { api, getDeviceId } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import {
  doplnCisloLokalne,
  enqueueZaznam,
  listRecent,
  oznacDoplneno,
  startAutoSync,
  type FrontaZaznam,
} from "../lib/offline-queue";
import { SystemClockWidget } from "../components/SystemClockWidget";
import { TemaPrepinac } from "../components/TemaPrepinac";
import { useTema } from "../lib/tema";

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
  const [tema, prepnoutTema] = useTema("depo_mereni_tema");

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

  // Zápis jen s časem (bez čísla) — když se do cíle sjede víc závodníků a
  // není čas psát celé číslo; číslo se doplní dodatečně v seznamu vpravo.
  const zapsatJenCas = useCallback(async () => {
    if (!routeId) return;
    try {
      await enqueueZaznam(routeId, null, typUdalosti);
      setCislo("");
      setChyba(null);
      obnovitPosledni();
    } catch {
      setChyba("Zápis se nepodařilo uložit ani lokálně — zkuste to prosím znovu.");
    }
  }, [routeId, typUdalosti, obnovitPosledni]);

  const doplnitCislo = useCallback(
    async (z: FrontaZaznam, text: string) => {
      if (!routeId) return;
      const cisloNove = Number(text.trim());
      if (!Number.isInteger(cisloNove) || cisloNove < 1) {
        setChyba("Zadejte startovní číslo (celé číslo od 1 výš).");
        return;
      }
      try {
        if (z.stav === "CEKA") {
          await doplnCisloLokalne(z.localKey, routeId, cisloNove);
        } else if (z.serverId) {
          const odpoved = await api.patch<RecordResponseDto>(`/routes/${routeId}/records/${z.serverId}/correct`, {
            noveStartovniCislo: cisloNove,
            typOpravy: TypOpravy.PREPIS_NULY_NA_CISLO,
          });
          await oznacDoplneno(z.localKey, routeId, cisloNove, odpoved.prihlaskaId);
        }
        setChyba(null);
        obnovitPosledni();
      } catch (e) {
        setChyba(chybaZeServeru(e, "Číslo se nepodařilo doplnit (zkontrolujte připojení)."));
      }
    },
    [routeId, obnovitPosledni]
  );

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
      else if (e.key === " " && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        zapsatJenCas();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stiskniKlavesu, zapsat, zapsatJenCas]);

  const pocetBezCisla = posledni.filter((z) => z.puvod === "VLASTNI" && z.startovniCislo === null && !z.prihlaskaId).length;

  return (
    <div className="measurement-layout" data-tema={tema}>
      <div className="measurement-topbar">
        <Link to="/dashboard" className="measurement-back">
          ← Zpět do administrace
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TemaPrepinac tema={tema} onPrepnout={prepnoutTema} />
          <SystemClockWidget />
        </div>
      </div>
      <div className="measurement-main">
        <div
          style={{
            background: "var(--m-panel)",
            border: "2px solid var(--m-panel-border)",
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
              color: "var(--m-muted)",
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
              color: cislo ? (jeMezicas ? "var(--m-live)" : "var(--m-accent)") : "var(--m-muted)",
            }}
          >
            {cislo || "—"}
          </div>
        </div>

        <div className="measurement-keypad" role="group" aria-label="Klávesnice pro zadání startovního čísla">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={(e) => {
                e.currentTarget.blur(); // ať mezerník po kliknutí nespustí znovu stejné tlačítko
                stiskniKlavesu(k);
              }}
              className="mono measurement-key"
              aria-label={k === "⌫" ? "Smazat poslední číslici" : undefined}
              style={{
                borderRadius: 14,
                border: "1px solid var(--m-key-border)",
                background: k === "DNF" ? "var(--m-key-alt)" : "var(--m-key)",
                color: k === "DNF" ? "var(--m-muted)" : "var(--m-fg)",
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
          onClick={(e) => {
            e.currentTarget.blur();
            zapsat();
          }}
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
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            zapsatJenCas();
          }}
          title="Zapíše jen čas bez čísla (klávesa Mezerník) — číslo doplníte později v seznamu vpravo"
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "14px",
            borderRadius: 14,
            border: "2px dashed var(--m-key-border)",
            background: "transparent",
            color: "var(--m-fg)",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ZAPSAT JEN ČAS (bez čísla) ␣
        </button>
        {chyba && (
          <p role="alert" style={{ color: "var(--color-attention)" }}>
            {chyba}
          </p>
        )}
      </div>

      <div className="measurement-sidebar">
        <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--m-muted)" }}>
          Poslední zápisy
        </h3>
        {pocetBezCisla > 0 && (
          <p style={{ fontSize: 12.5, color: "var(--color-attention)", margin: "0 0 8px" }}>
            {pocetBezCisla} {pocetBezCisla === 1 ? "čas čeká" : "časy čekají"} na doplnění čísla
          </p>
        )}
        {posledni.map((z) => (
          <div
            key={z.localKey}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: "1px solid var(--m-line)",
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
              {z.startovniCislo ?? "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--m-muted)" }}>
              {z.casCelkem ?? new Date(z.klientCas).toLocaleTimeString("cs-CZ")}
              {z.startovniCislo === null && z.puvod === "VLASTNI" && !z.prihlaskaId && (
                <DoplnitCislo onDoplnit={(text) => doplnitCislo(z, text)} />
              )}
              {z.startovniCislo === null && z.puvod === "CIZI" && <div>bez čísla — z jiného zařízení</div>}
              {z.typUdalosti === TypUdalosti.MEZICAS && <div>mezičas</div>}
              {z.typUdalosti === TypUdalosti.DOJEZD && z.pocetKol && z.pocetKol > 1 && (
                <div style={{ color: z.aktualniKolo === z.pocetKol ? "var(--m-live)" : "var(--m-accent)" }}>
                  {z.aktualniKolo === z.pocetKol ? "doběh — " : "kolo "}
                  {z.aktualniKolo}/{z.pocetKol}
                </div>
              )}
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

/** Malé pole pro doplnění startovního čísla k času zapsanému bez čísla. */
function DoplnitCislo({ onDoplnit }: { onDoplnit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onDoplnit(text);
        setText("");
      }}
      style={{ display: "flex", gap: 6, marginTop: 4 }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder="č."
        aria-label="Doplnit startovní číslo"
        className="mono"
        style={{ width: 64, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--m-key-border)", background: "var(--m-key)", color: "var(--m-fg)", fontSize: 14 }}
      />
      <button
        type="submit"
        disabled={!text}
        style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "var(--tape-700)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: text ? "pointer" : "not-allowed", opacity: text ? 1 : 0.5 }}
      >
        Doplnit
      </button>
    </form>
  );
}

function stavBarvaPozadi(z: FrontaZaznam): string {
  if (z.stav === "NEEDS_REVIEW") return "var(--color-attention)";
  if (z.stav === "CEKA") return "var(--m-badge-ceka)";
  if (z.puvod === "VLASTNI" && !z.prihlaskaId) return "var(--color-attention)";
  return "var(--m-badge)";
}
