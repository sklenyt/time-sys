import { useEffect, useState } from "react";
import type { AuthUserDto, MojeOrganizaceDto } from "@depo/shared";
import { api, clearTokens } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

/** Můj účet: přehled organizací, přepnutí aktivní a smazání vlastního účtu (právo na výmaz). */
export function Ucet() {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [organizace, setOrganizace] = useState<MojeOrganizaceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rozbalitSmazani, setRozbalitSmazani] = useState(false);
  const [heslo, setHeslo] = useState("");
  const [potvrzeni, setPotvrzeni] = useState("");
  const [mazu, setMazu] = useState(false);

  useEffect(() => {
    Promise.all([api.get<AuthUserDto>("/auth/me"), api.get<MojeOrganizaceDto[]>("/organizations")])
      .then(([u, o]) => {
        setUser(u);
        setOrganizace(o);
      })
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
  const aktivni = organizace?.find((o) => o.aktivni);

  return (
    <AppShell active="ucet">
      <div style={{ maxWidth: 1500 }}>
        <HlavickaStranky titulek="Můj účet" popis="Přihlášení, organizace a smazání účtu" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <Souhrn
          polozky={[
            { hodnota: user?.jmeno ?? "…", popisek: user?.email ?? "Přihlášen jako" },
            { hodnota: organizace?.length ?? "…", popisek: "Organizací" },
            { hodnota: aktivni?.nazev ?? "—", popisek: "Aktivní organizace" },
            { hodnota: user?.superAdmin ? "Super admin" : "Uživatel", popisek: "Oprávnění" },
          ]}
        />

        <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0 8px" }}>Moje organizace</div>
        <TabulkaKarta>
          <thead>
            <tr>
              <th>Organizace</th>
              <th style={{ textAlign: "right" }}>Akcí</th>
              <th style={{ textAlign: "right" }}>Členů</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(organizace ?? []).map((o) => (
              <tr key={o.id} className="sl-radek">
                <td style={{ fontWeight: 700 }}>{o.nazev}</td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {o.pocetAkci}
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {o.pocetClenu}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {o.aktivni ? (
                    <span className="sl-stav" style={{ color: "var(--color-live-700)" }}>
                      aktivní
                    </span>
                  ) : (
                    <button className="btn-pill" onClick={() => prepnout(o.id)}>
                      Přepnout
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!organizace && !error && <PrazdnyRadek sloupcu={4} text="Načítám…" />}
            {organizace && organizace.length === 0 && <PrazdnyRadek sloupcu={4} text="Zatím nejste členem žádné organizace." />}
          </tbody>
        </TabulkaKarta>
        {organizace && organizace.length > 1 && (
          <p style={{ color: "var(--text-secondary)", fontSize: 12.5, margin: "8px 0 0" }}>
            Vidíte akce té organizace, která je aktivní. Přepnout ji jde i v levém horním rohu menu.
          </p>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, margin: "24px 0 8px" }}>Smazání účtu</div>
        <div className="sl-karta" style={{ borderColor: "var(--color-danger)", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ fontWeight: 700 }}>Smazat můj účet</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13.5, lineHeight: 1.5 }}>
                Zmizí přihlášení, členství v organizacích a role na akcích. Akce, výsledky a časy závodníků zůstanou, jen bez
                vašeho jména u zápisů. Nejde to vrátit.
              </div>
            </div>
            {!rozbalitSmazani && (
              <button className="btn-pill" onClick={() => setRozbalitSmazani(true)} style={{ color: "var(--color-danger)" }}>
                Smazat účet…
              </button>
            )}
          </div>
          {rozbalitSmazani && (
            <form onSubmit={smazatUcet} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 14 }}>
              <label style={popisekStyle}>
                Heslo
                <input type="password" value={heslo} onChange={(e) => setHeslo(e.target.value)} autoComplete="current-password" style={{ ...inputStyle, width: 220 }} required />
              </label>
              <label style={popisekStyle}>
                Pro potvrzení napište svůj e-mail ({user?.email})
                <input value={potvrzeni} onChange={(e) => setPotvrzeni(e.target.value)} autoComplete="off" style={{ ...inputStyle, width: 300 }} required />
              </label>
              <button type="submit" className="btn-pill" disabled={mazu || !heslo || !potvrzeniOk} style={{ color: "var(--color-danger)" }}>
                {mazu ? "Mažu…" : "Smazat účet navždy"}
              </button>
              <button
                type="button"
                className="btn-pill"
                onClick={() => {
                  setRozbalitSmazani(false);
                  setHeslo("");
                  setPotvrzeni("");
                }}
                disabled={mazu}
              >
                Zrušit
              </button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}

const popisekStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
  fontWeight: 400,
};
