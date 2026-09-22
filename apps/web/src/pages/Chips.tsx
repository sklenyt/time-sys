import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { CipSListem, Prihlaska, Trasa } from "@depo/shared";
import { StavCipu } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";

const CIP_STAV_LABEL: Record<StavCipu, string> = {
  [StavCipu.PRIREZEN]: "přiřazen",
  [StavCipu.ZALOZNI]: "záložní",
  [StavCipu.ZTRACEN]: "ztracen",
  [StavCipu.VRACEN]: "vrácen",
};

const CIP_STAV_BARVA: Record<StavCipu, string> = {
  [StavCipu.PRIREZEN]: "var(--color-live-700)",
  [StavCipu.ZALOZNI]: "var(--color-attention)",
  [StavCipu.ZTRACEN]: "var(--color-danger)",
  [StavCipu.VRACEN]: "var(--text-secondary)",
};

function formatCas(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Evidence čipů trati (F22/F29/F30, docs/07-ui-mockups.md §7.9) — samotné
 * párování čipu k závodníkovi se dělá ve Startovní listině (tam už je
 * seznam všech závodníků), tady je přehled nad životním cyklem napříč
 * celou tratí: kdo má čip venku, kdo ho vrátil, kdo ho ztratil, a export
 * nevrácených pro vyúčtování záloh po závodě.
 */
export function Chips() {
  const { routeId } = useParams<{ routeId: string }>();
  const [trasa, setTrasa] = useState<Trasa | null>(null);
  const [cipy, setCipy] = useState<CipSListem[]>([]);
  const [zavodnici, setZavodnici] = useState<Prihlaska[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [skenKod, setSkenKod] = useState("");
  const [nalezeny, setNalezeny] = useState<CipSListem | null>(null);
  const [nenalezenKod, setNenalezenKod] = useState<string | null>(null);
  const [noveCislo, setNoveCislo] = useState("");
  const [chybaPridani, setChybaPridani] = useState<string | null>(null);
  const [pridavam, setPridavam] = useState(false);
  const skenRef = useRef<HTMLInputElement>(null);

  async function reload() {
    if (!routeId) return;
    setError(null);
    try {
      const [t, c, z] = await Promise.all([
        api.get<Trasa>(`/routes/${routeId}`),
        api.get<CipSListem[]>(`/routes/${routeId}/chips`),
        api.get<Prihlaska[]>(`/routes/${routeId}/entries`),
      ]);
      setTrasa(t);
      setCipy(c);
      setZavodnici(z);
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba načítání"));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  async function upravitStav(cipId: string, stav: StavCipu) {
    if (!routeId) return;
    try {
      await api.patch(`/routes/${routeId}/chips/${cipId}`, { stav });
      await reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Uložení se nezdařilo"));
    }
  }

  async function upravitZalohu(cipId: string, vratnaZaloha: number) {
    if (!routeId) return;
    try {
      await api.patch(`/routes/${routeId}/chips/${cipId}`, { vratnaZaloha });
      await reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Uložení se nezdařilo"));
    }
  }

  /**
   * Stejný princip jako u startovních čísel (F06 "číslo + Enter") — čtečky
   * čipů se běžně chovají jako klávesnice, po přiložení čipu "napíší" jeho
   * sériové číslo a odešlou Enter. Pole tedy nikdy neukládá potichu: vždy
   * nejdřív ukáže nalezený záznam k potvrzení (viz docs/07-ui-mockups.md §7.9).
   */
  function naskenovat(e: React.FormEvent) {
    e.preventDefault();
    const kod = skenKod.trim();
    if (!kod) return;
    const shoda = cipy.find((c) => c.kodCipu.toLowerCase() === kod.toLowerCase());
    setNalezeny(shoda ?? null);
    setNenalezenKod(shoda ? null : kod);
    setNoveCislo("");
    setChybaPridani(null);
    setSkenKod("");
    skenRef.current?.focus();
  }

  async function potvrditVraceni() {
    if (!nalezeny) return;
    await upravitStav(nalezeny.id, StavCipu.VRACEN);
    setNalezeny(null);
  }

  /** Neznámé sériové číslo z čtečky — nový čip se rovnou přiřadí k zadanému startovnímu číslu, beze změny cesty na Startovní listinu. */
  async function pridatNovyCip(e: React.FormEvent) {
    e.preventDefault();
    if (!routeId || !nenalezenKod) return;
    const zavodnik = zavodnici.find((z) => z.startovniCislo === Number(noveCislo));
    if (!zavodnik) {
      setChybaPridani("Startovní číslo nenalezeno na této trati.");
      return;
    }
    setPridavam(true);
    setChybaPridani(null);
    try {
      await api.post(`/routes/${routeId}/entries/${zavodnik.id}/chip`, { kodCipu: nenalezenKod });
      setNenalezenKod(null);
      setNoveCislo("");
      await reload();
      skenRef.current?.focus();
    } catch (e) {
      setChybaPridani(chybaZeServeru(e, "Přiřazení se nezdařilo"));
    } finally {
      setPridavam(false);
    }
  }

  function stahnoutExportNevracenych() {
    const nevracene = cipy.filter((c) => c.stav !== StavCipu.VRACEN);
    const hlavicka = ["cislo", "prijmeni", "jmeno", "seriove_cislo", "stav", "vratna_zaloha"];
    const radky = nevracene.map((c) =>
      [c.startovniCislo, c.prijmeni, c.jmeno, c.kodCipu, CIP_STAV_LABEL[c.stav], c.vratnaZaloha ?? ""].join(",")
    );
    const csv = [hlavicka.join(","), ...radky].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const odkaz = document.createElement("a");
    odkaz.href = url;
    odkaz.download = "nevracene-cipy.csv";
    odkaz.click();
    URL.revokeObjectURL(url);
  }

  const nevracenoPocet = cipy.filter((c) => c.stav !== StavCipu.VRACEN).length;

  if (!trasa) {
    return (
      <AppShell active="cipy" routeId={routeId}>
        {error ?? "Načítám…"}
      </AppShell>
    );
  }

  return (
    <AppShell active="cipy" routeId={routeId} eventId={trasa.udalostId}>
      <div className="dash-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Čipy</h1>
          <div className="meta mono">
            {trasa.nazev} · {cipy.length} {cipy.length === 1 ? "přiřazený čip" : "přiřazených čipů"} ·{" "}
            {nevracenoPocet} nevráceno
          </div>
        </div>
        <div className="dash-header-actions">
          <button onClick={stahnoutExportNevracenych} className="btn-pill" disabled={nevracenoPocet === 0}>
            Export nevrácených (CSV)
          </button>
        </div>
      </div>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <p style={{ color: "var(--text-secondary)", fontSize: 13.5, maxWidth: 640 }}>
        Přiřazení čipu ke konkrétnímu závodníkovi se dělá ve Startovní listině. Tady je přehled nad stavem všech
        vydaných čipů této trati — kdo je pořád venku, kdo ho vrátil nebo ztratil, a kolik se za nevrácené vybralo na
        záloze.
      </p>

      <section className="dash-card" style={{ marginBottom: 24, maxWidth: 420 }}>
        <div className="dash-card-head">
          <h2>Naskenujte čip</h2>
        </div>
        <form onSubmit={naskenovat} style={{ display: "flex", gap: 8 }}>
          <input
            ref={skenRef}
            autoFocus
            value={skenKod}
            onChange={(e) => setSkenKod(e.target.value)}
            placeholder="Sériové číslo (čtečka)"
            autoComplete="off"
            className="mono"
            style={inputStyle}
          />
          <button type="submit" className="btn-pill primary">
            Najít
          </button>
        </form>
        {nalezeny && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
              č. {nalezeny.startovniCislo} — {nalezeny.prijmeni} {nalezeny.jmeno}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "4px 0 10px" }}>
              aktuální stav: {CIP_STAV_LABEL[nalezeny.stav]}
            </div>
            {nalezeny.stav !== StavCipu.VRACEN ? (
              <button onClick={potvrditVraceni} className="btn-pill primary">
                Potvrdit vrácení
              </button>
            ) : (
              <span className="mono" style={{ fontSize: 12.5, color: "var(--color-live-700)" }}>
                Už je vrácený.
              </span>
            )}
          </div>
        )}
        {nenalezenKod && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "var(--color-danger)", fontSize: 13, margin: "0 0 8px" }}>
              Čip „{nenalezenKod}“ zatím není přiřazený nikomu na této trati.
            </p>
            <form onSubmit={pridatNovyCip} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Přiřadit startovnímu číslu:</span>
              <input
                value={noveCislo}
                onChange={(e) => setNoveCislo(e.target.value)}
                placeholder="Číslo"
                className="mono"
                style={{ ...inputStyle, width: 80 }}
              />
              <button type="submit" disabled={pridavam || !noveCislo.trim()} className="btn-pill primary">
                Přiřadit nový čip
              </button>
            </form>
            {chybaPridani && (
              <p style={{ color: "var(--color-danger)", fontSize: 12.5, marginTop: 8 }}>{chybaPridani}</p>
            )}
          </div>
        )}
      </section>

      {cipy.length === 0 ? (
        <div className="dash-card" style={{ maxWidth: 480 }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5 }}>
            Zatím žádný přiřazený čip. Přiřaďte čipy závodníkům ve Startovní listině.
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
                <th>Č.</th>
                <th style={{ fontFamily: "var(--font-ui)" }}>Jméno</th>
                <th>Sériové číslo</th>
                <th style={{ fontFamily: "var(--font-ui)" }}>Stav</th>
                <th style={{ fontFamily: "var(--font-ui)" }}>Záloha (Kč)</th>
                <th style={{ fontFamily: "var(--font-ui)" }}>Vydáno</th>
                <th style={{ fontFamily: "var(--font-ui)" }}>Vráceno</th>
              </tr>
            </thead>
            <tbody>
              {cipy.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td>{c.startovniCislo}</td>
                  <td style={{ fontFamily: "var(--font-ui)" }}>
                    {c.prijmeni} {c.jmeno}
                  </td>
                  <td>{c.kodCipu}</td>
                  <td>
                    <select
                      value={c.stav}
                      onChange={(e) => upravitStav(c.id, e.target.value as StavCipu)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        fontSize: 12.5,
                        fontFamily: "var(--font-mono)",
                        color: CIP_STAV_BARVA[c.stav],
                        fontWeight: 700,
                      }}
                    >
                      {Object.values(StavCipu).map((s) => (
                        <option key={s} value={s}>
                          {CIP_STAV_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      defaultValue={c.vratnaZaloha ?? ""}
                      onBlur={(e) => {
                        const hodnota = e.target.value ? Number(e.target.value) : 0;
                        if (hodnota !== (c.vratnaZaloha ?? 0)) upravitZalohu(c.id, hodnota);
                      }}
                      style={{
                        width: 80,
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        fontSize: 12.5,
                      }}
                    />
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{formatCas(c.vydanoAt)}</td>
                  <td style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{formatCas(c.vracenoAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};
