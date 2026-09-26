import { useEffect, useMemo, useState } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import type { VerejnaUdalostDto, OveritPristupResponseDto } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";

interface KartaProps {
  udalost: VerejnaUdalostDto;
  ukoncena?: boolean;
  otevrenaId: string | null;
  heslo: string;
  setHeslo: (h: string) => void;
  odesilam: boolean;
  hesloChyba: string | null;
  vyberTras: { id: string; nazev: string }[] | null;
  otevritUdalost: (u: VerejnaUdalostDto) => void;
  odeslatHeslo: (e: React.FormEvent) => void;
  navigate: NavigateFunction;
}

function UdalostKarta({
  udalost: u,
  ukoncena,
  otevrenaId,
  heslo,
  setHeslo,
  odesilam,
  hesloChyba,
  vyberTras,
  otevritUdalost,
  odeslatHeslo,
  navigate,
}: KartaProps) {
  return (
    <div className="dash-card" style={{ padding: 16, opacity: ukoncena ? 0.7 : 1 }}>
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
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>
            <strong style={{ display: "block", fontSize: 15 }}>{u.nazev}</strong>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              {new Date(u.datum).toLocaleDateString("cs-CZ")}
            </span>
          </span>
          {ukoncena && <span className="directory-stav-pill">ukončeno</span>}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {u.vyzadujeHeslo ? "🔒 heslo" : "otevřené →"}
        </span>
      </button>

      {otevrenaId === u.id && u.vyzadujeHeslo && (
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
  );
}

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

  const probihajici = useMemo(() => udalosti?.filter((u) => !u.ukoncena) ?? [], [udalosti]);
  const ukoncene = useMemo(() => udalosti?.filter((u) => u.ukoncena) ?? [], [udalosti]);

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
    setOtevrenaId(u.id);
    setHeslo("");
    if (!u.vyzadujeHeslo) {
      jitNaTrasy(u.trasy);
    }
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

  const spolecneProps = { otevrenaId, heslo, setHeslo, odesilam, hesloChyba, vyberTras, otevritUdalost, odeslatHeslo, navigate };

  return (
    <div className="landing">
      <header className="landing-nav">
        <a href="https://depotime.cz" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <img src="/depo-mark.svg" alt="" width={68} height={68} />
          Depo výsledky
        </a>
        <a href="https://depotime.cz" className="btn-pill outline-light">
          Web Depo →
        </a>
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

        {udalosti && udalosti.length > 0 && (
          <div className="directory-sloupce">
            <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <h2 className="directory-skupina-nadpis">
                <span className="directory-tecka zive" aria-hidden="true" />
                Právě probíhající / nadcházející
              </h2>
              {probihajici.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>Momentálně žádný.</p>
              ) : (
                probihajici.map((u) => <UdalostKarta key={u.id} udalost={u} {...spolecneProps} />)
              )}
            </div>

            {ukoncene.length > 0 && (
              <details className="directory-ukoncene" style={{ alignSelf: "start" }}>
                <summary className="directory-skupina-nadpis muted">
                  <span className="directory-tecka" aria-hidden="true" />
                  Ukončené ({ukoncene.length})
                </summary>
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  {ukoncene.map((u) => (
                    <UdalostKarta key={u.id} udalost={u} ukoncena {...spolecneProps} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
