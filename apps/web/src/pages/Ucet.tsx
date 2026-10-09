import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthUserDto } from "@depo/shared";
import { api, clearTokens } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky } from "../components/StrankaPrvky";

/** Můj účet: přehled organizací, přepnutí aktivní a smazání vlastního účtu (právo na výmaz). */
export function Ucet() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rozbalitSmazani, setRozbalitSmazani] = useState(false);
  const [heslo, setHeslo] = useState("");
  const [potvrzeni, setPotvrzeni] = useState("");
  const [mazu, setMazu] = useState(false);

  useEffect(() => {
    api
      .get<AuthUserDto>("/auth/me")
      .then(setUser)
      .catch((e) => setError(chybaZeServeru(e, "Účet se nepodařilo načíst")));
  }, []);

  async function prepnout(organizaceId: string) {
    setError(null);
    try {
      await api.post("/auth/me/organizace", { organizaceId });
      window.location.assign("/dashboard");
    } catch (e) {
      setError(chybaZeServeru(e, "Organizaci se nepodařilo přepnout"));
    }
  }

  async function smazatUcet(e: React.FormEvent) {
    e.preventDefault();
    setMazu(true);
    setError(null);
    try {
      await api.post("/users/me/smazat", { heslo });
      clearTokens();
      window.location.assign("/login?ucet=smazan");
    } catch (err) {
      setError(chybaZeServeru(err, "Účet se nepodařilo smazat"));
      setMazu(false);
    }
  }

  const potvrzeniOk = !!user && potvrzeni.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <AppShell active="ucet">
      <div style={{ maxWidth: 820 }}>
        <HlavickaStranky titulek="Můj účet" popis="Přihlášení, organizace a smazání účtu" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <section className="dash-card" style={{ marginBottom: 20 }}>
          <div className="dash-card-head">
            <h2>Přihlášen jako</h2>
          </div>
          {user ? (
            <div style={{ fontSize: 14 }}>
              <div style={{ fontWeight: 700 }}>{user.jmeno}</div>
              <div style={{ color: "var(--text-secondary)" }}>{user.email}</div>
              {user.superAdmin && <div style={{ marginTop: 6, fontSize: 12.5 }}>Super admin</div>}
            </div>
          ) : (
            <div>Načítám…</div>
          )}
        </section>

        <section className="dash-card" style={{ marginBottom: 20 }}>
          <div className="dash-card-head">
            <h2>Moje organizace</h2>
          </div>
          {user && (user.organizace ?? []).length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>Zatím nejste členem žádné organizace.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(user?.organizace ?? []).map((o) => {
              const aktivni = o.id === user?.organizaceId;
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontWeight: 700, flex: 1 }}>{o.nazev}</span>
                  {aktivni ? (
                    <span className="stitek stitek-neutralni">aktivní</span>
                  ) : (
                    <button className="btn-pill" onClick={() => prepnout(o.id)}>
                      Přepnout
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {user && (user.organizace ?? []).length > 1 && (
            <p style={{ color: "var(--text-secondary)", fontSize: 12.5, margin: "10px 0 0" }}>
              Vidíte akce té organizace, která je aktivní. Přepnout ji jde i v levém horním rohu menu.
            </p>
          )}
        </section>

        <section className="dash-card" style={{ borderColor: "var(--color-danger)" }}>
          <div className="dash-card-head">
            <h2 style={{ color: "var(--color-danger)" }}>Smazat účet</h2>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 10px" }}>
            Smazání účtu nejde vrátit. Zmizí vaše přihlášení, členství v organizacích a role na akcích. Akce, výsledky a
            časy závodníků zůstanou, jen u nich nebude vaše jméno jako autora zápisu.
          </p>
          {!rozbalitSmazani ? (
            <button className="btn-pill" onClick={() => setRozbalitSmazani(true)} style={{ color: "var(--color-danger)" }}>
              Chci smazat svůj účet
            </button>
          ) : (
            <form onSubmit={smazatUcet} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
              <label style={{ fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
                Heslo
                <input type="password" value={heslo} onChange={(e) => setHeslo(e.target.value)} autoComplete="current-password" style={inputStyle} required />
              </label>
              <label style={{ fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
                Pro potvrzení napište svůj e-mail ({user?.email})
                <input value={potvrzeni} onChange={(e) => setPotvrzeni(e.target.value)} autoComplete="off" style={inputStyle} required />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="btn-pill" disabled={mazu || !heslo || !potvrzeniOk} style={{ color: "var(--color-danger)" }}>
                  {mazu ? "Mažu…" : "Smazat účet navždy"}
                </button>
                <button type="button" className="btn-pill" onClick={() => navigate("/dashboard")} disabled={mazu}>
                  Zrušit
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
  fontWeight: 400,
};
