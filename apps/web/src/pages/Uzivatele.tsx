import { useEffect, useState } from "react";
import type { AuthUserDto, UzivatelSpravaDto } from "@depo/shared";
import { Role } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: "Správce",
  [Role.ORGANIZATOR]: "Organizátor",
  [Role.CASOMERIC]: "Časoměřič",
  [Role.STANOVISTE]: "Stanoviště",
  [Role.VEREJNOST]: "Veřejnost",
};

/** Správa uživatelských účtů organizace — hlavně oprava špatně zadaného e-mailu nebo jména. */
export function Uzivatele() {
  const [uzivatele, setUzivatele] = useState<UzivatelSpravaDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upravovanyId, setUpravovanyId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [ukladam, setUkladam] = useState(false);
  const [hledani, setHledani] = useState("");
  const [ja, setJa] = useState<AuthUserDto | null>(null);
  const [mazanyId, setMazanyId] = useState<string | null>(null);
  const [potvrzeniEmail, setPotvrzeniEmail] = useState("");

  async function nacist() {
    try {
      setUzivatele(await api.get<UzivatelSpravaDto[]>("/users"));
    } catch (e) {
      setError(chybaZeServeru(e, "Seznam uživatelů se nepodařilo načíst"));
    }
  }

  useEffect(() => {
    nacist();
    api.get<AuthUserDto>("/auth/me").then(setJa).catch(() => undefined);
  }, []);

  async function smazat(u: UzivatelSpravaDto) {
    setUkladam(true);
    setError(null);
    try {
      await api.del(`/users/${u.id}`);
      setMazanyId(null);
      setPotvrzeniEmail("");
      await nacist();
    } catch (e) {
      setError(chybaZeServeru(e, "Účet se nepodařilo smazat"));
    } finally {
      setUkladam(false);
    }
  }

  function zacitUpravu(u: UzivatelSpravaDto) {
    setUpravovanyId(u.id);
    setEmail(u.email);
    setJmeno(u.jmeno);
    setError(null);
  }

  async function ulozit(u: UzivatelSpravaDto) {
    setUkladam(true);
    setError(null);
    try {
      await api.patch(`/users/${u.id}`, {
        ...(email.trim() !== u.email ? { email: email.trim() } : {}),
        ...(jmeno.trim() !== u.jmeno ? { jmeno: jmeno.trim() } : {}),
      });
      setUpravovanyId(null);
      await nacist();
    } catch (e) {
      setError(chybaZeServeru(e, "Uložení se nezdařilo"));
    } finally {
      setUkladam(false);
    }
  }

  const videtOrganizaci = uzivatele?.some((u) => u.organizaceNazev) ?? false;
  const filtr = hledani.trim().toLowerCase();
  const zobrazeni = (uzivatele ?? []).filter(
    (u) => !filtr || u.email.toLowerCase().includes(filtr) || u.jmeno.toLowerCase().includes(filtr)
  );

  return (
    <AppShell active="uzivatele">
      <div style={{ maxWidth: 1500 }}>
        <HlavickaStranky titulek="Uživatelé" popis="Účty organizace — tady opravíte špatně zadaný e-mail nebo jméno" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <Souhrn polozky={[{ hodnota: uzivatele?.length ?? "…", popisek: "Účtů" }]} />

        <div className="sl-nastroje">
          <input
            type="search"
            placeholder="Hledat podle jména nebo e-mailu…"
            value={hledani}
            onChange={(e) => setHledani(e.target.value)}
            className="sl-hledani"
          />
        </div>

        <TabulkaKarta>
          <thead>
            <tr>
              <th>Jméno</th>
              <th>E-mail</th>
              {videtOrganizaci && <th>Organizace</th>}
              <th>Role na akcích</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zobrazeni.map((u) => (
              <tr key={u.id} className="sl-radek" style={{ verticalAlign: "top" }}>
                {upravovanyId === u.id ? (
                  <>
                    <td>
                      <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                    </td>
                    <td>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 700 }}>{u.jmeno}</td>
                    <td>{u.email}</td>
                  </>
                )}
                {videtOrganizaci && <td className="sl-podtitul">{u.organizaceNazev ?? "—"}</td>}
                <td className="sl-podtitul">
                  {u.role.length === 0 ? "—" : u.role.map((r) => `${ROLE_LABEL[r.role]} (${r.akce})`).join(", ")}
                </td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  {upravovanyId === u.id ? (
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <button onClick={() => ulozit(u)} disabled={ukladam || !email.trim() || !jmeno.trim()} className="btn-pill primary">
                        Uložit
                      </button>
                      <button onClick={() => setUpravovanyId(null)} disabled={ukladam} className="btn-pill">
                        Zrušit
                      </button>
                    </span>
                  ) : mazanyId === u.id ? (
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <input
                        value={potvrzeniEmail}
                        onChange={(e) => setPotvrzeniEmail(e.target.value)}
                        placeholder={`Napište ${u.email}`}
                        aria-label="Potvrzení smazání e-mailem"
                        style={{ ...inputStyle, width: 220 }}
                      />
                      <button
                        onClick={() => smazat(u)}
                        disabled={ukladam || potvrzeniEmail.trim().toLowerCase() !== u.email.toLowerCase()}
                        className="btn-pill"
                        style={{ color: "var(--color-danger)" }}
                      >
                        Smazat účet
                      </button>
                      <button onClick={() => setMazanyId(null)} disabled={ukladam} className="btn-pill">
                        Zrušit
                      </button>
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <button onClick={() => zacitUpravu(u)} className="btn-pill">
                        Upravit
                      </button>
                      {ja?.superAdmin && u.id !== ja.id && (
                        <button
                          onClick={() => {
                            setMazanyId(u.id);
                            setPotvrzeniEmail("");
                            setError(null);
                          }}
                          className="btn-pill"
                        >
                          Smazat
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!uzivatele && !error && <PrazdnyRadek sloupcu={videtOrganizaci ? 5 : 4} text="Načítám…" />}
            {uzivatele && zobrazeni.length === 0 && <PrazdnyRadek sloupcu={videtOrganizaci ? 5 : 4} text="Nikdo neodpovídá hledání." />}
          </tbody>
        </TabulkaKarta>
        <p style={{ color: "var(--text-secondary)", fontSize: 12.5, marginTop: 16 }}>
          Po změně e-mailu se uživatel přihlašuje novou adresou. Zapomenuté heslo si pak obnoví přes „Zapomenuté
          heslo" na přihlašovací stránce.
        </p>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};
