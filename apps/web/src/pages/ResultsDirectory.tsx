import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { VerejnaUdalostDto, OveritPristupResponseDto } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";

/**
 * Domovská stránka vysledky.depotime.cz — veřejný adresář všech závodů.
 * Organizátor chce návštěvnost, takže tu je akce vidět vždy (jméno + datum),
 * ale jména a časy závodníků zůstávají za heslem, které si organizátor
 * zvolí a sdílí se závodníky (viz Dashboard "Heslo výsledků").
 */
export function ResultsDirectory() {
  const navigate = useNavigate();
  const [udalosti, setUdalosti] = useState<VerejnaUdalostDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otevrenaId, setOtevrenaId] = useState<string | null>(null);
  const [heslo, setHeslo] = useState("");
  const [odesilam, setOdesilam] = useState(false);
  const [hesloChyba, setHesloChyba] = useState<string | null>(null);
  const [vyberTras, setVyberTras] = useState<{ id: string; nazev: string }[] | null>(null);

  useEffect(() => {
    api
      .get<VerejnaUdalostDto[]>("/events/verejne")
      .then(setUdalosti)
      .catch((e) => setError(chybaZeServeru(e, "Chyba načítání")));
  }, []);

  function jitNaTrasy(trasy: { id: string; nazev: string }[]) {
    if (trasy.length === 0) {
      setHesloChyba("Tahle akce zatím nemá žádnou trasu s výsledky.");
      return;
    }
    if (trasy.length === 1) {
      navigate(`/vysledky/${trasy[0].id}`);
      return;
    }
    // Víc tratí v jedné akci — zůstat na místě a nabídnout výběr.
    setVyberTras(trasy);
  }

  function otevritUdalost(u: VerejnaUdalostDto) {
    setHesloChyba(null);
    setVyberTras(null);
    if (!u.vyzadujeHeslo) {
      jitNaTrasy(u.trasy);
      return;
    }
    setOtevrenaId(u.id);
    setHeslo("");
  }

  async function odeslatHeslo(e: React.FormEvent) {
    e.preventDefault();
    if (!otevrenaId) return;
    setOdesilam(true);
    setHesloChyba(null);
    try {
      const vysledek = await api.post<OveritPristupResponseDto>(`/events/${otevrenaId}/pristup`, { heslo });
      jitNaTrasy(vysledek.trasy);
    } catch {
      setHesloChyba("Nesprávné heslo — zkuste to znovu nebo se zeptejte pořadatele.");
    } finally {
      setOdesilam(false);
    }
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="brand">
          <img src="/depo-mark.svg" alt="" width={52} height={52} />
          Depo výsledky
        </div>
      </header>

      <section className="landing-hero" style={{ paddingBottom: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="landing-eyebrow">Výsledky závodů</div>
          <h1 style={{ fontSize: "clamp(26px, 3.6vw, 38px)" }}>Vyberte si závod</h1>
          <p className="lede">
            Přehled akcí měřených přes Depo. U některých je potřeba heslo od pořadatele — chrání jména a časy
            závodníků před kýmkoliv, kdo odkaz nezná.
          </p>
        </div>
      </section>

      <section className="landing-section">
        {!udalosti && !error && <p style={{ color: "var(--text-secondary)" }}>Načítám…</p>}
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        {udalosti && udalosti.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>Zatím tu není žádný veřejně vypsaný závod.</p>
        )}

        <div style={{ display: "grid", gap: 12, maxWidth: 640, margin: "0 auto" }}>
          {udalosti?.map((u) => (
            <div key={u.id} className="dash-card" style={{ padding: 16 }}>
              <button
                onClick={() => otevritUdalost(u)}
                style={{
                  all: "unset",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <span>
                  <strong style={{ display: "block", fontSize: 15 }}>{u.nazev}</strong>
                  <span className="mono" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {new Date(u.datum).toLocaleDateString("cs-CZ")}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {u.vyzadujeHeslo ? "🔒 heslo" : "otevřené →"}
                </span>
              </button>

              {otevrenaId === u.id && (
                <form onSubmit={odeslatHeslo} style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    type="password"
                    autoFocus
                    value={heslo}
                    onChange={(e) => setHeslo(e.target.value)}
                    placeholder="Heslo od pořadatele"
                    style={{ flex: 1, padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14 }}
                  />
                  <button type="submit" disabled={odesilam} className="btn-pill primary">
                    {odesilam ? "…" : "Vstoupit"}
                  </button>
                </form>
              )}
              {otevrenaId === u.id && hesloChyba && (
                <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: "8px 0 0" }}>{hesloChyba}</p>
              )}
              {otevrenaId === u.id && vyberTras && (
                <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                  {vyberTras.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => navigate(`/vysledky/${t.id}`)} className="btn-pill" style={{ width: "100%" }}>
                        {t.nazev}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
