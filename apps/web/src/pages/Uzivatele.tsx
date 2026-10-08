import { useEffect, useState } from "react";
import type { UzivatelSpravaDto } from "@depo/shared";
import { Role } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";

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

  async function nacist() {
    try {
      setUzivatele(await api.get<UzivatelSpravaDto[]>("/users"));
    } catch (e) {
      setError(chybaZeServeru(e, "Seznam uživatelů se nepodařilo načíst"));
    }
  }

  useEffect(() => {
    nacist();
  }, []);

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
      <div style={{ maxWidth: 900 }}>
        <div className="dash-header" style={{ marginBottom: 20 }}>
          <div>
            <h1>Uživatelé</h1>
            <div className="meta mono">
              Účty organizace — tady opravíte špatně zadaný e-mail nebo jméno
            </div>
          </div>
        </div>
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <input
          type="search"
          placeholder="Hledat podle jména nebo e-mailu…"
          value={hledani}
          onChange={(e) => setHledani(e.target.value)}
          style={{ ...inputStyle, width: "100%", maxWidth: 360, marginBottom: 16, boxSizing: "border-box" }}
        />

        {!uzivatele && !error && <p className="mono">Načítám…</p>}

        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
                <th>Jméno</th>
                <th>E-mail</th>
                {videtOrganizaci && <th>Organizace</th>}
                <th>Role na akcích</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {zobrazeni.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>
                  {upravovanyId === u.id ? (
                    <>
                      <td style={{ padding: "8px 8px 8px 0" }}>
                        <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                      </td>
                      <td style={{ padding: "8px 8px 8px 0" }}>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "10px 8px 10px 0" }}>{u.jmeno}</td>
                      <td style={{ padding: "10px 8px 10px 0" }}>{u.email}</td>
                    </>
                  )}
                  {videtOrganizaci && <td style={{ padding: "10px 8px 10px 0", color: "var(--text-secondary)", fontSize: 13 }}>{u.organizaceNazev ?? "—"}</td>}
                  <td style={{ padding: "10px 8px 10px 0", fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {u.role.length === 0 ? "—" : u.role.map((r) => `${ROLE_LABEL[r.role]} (${r.akce})`).join(", ")}
                  </td>
                  <td style={{ padding: "8px 0", whiteSpace: "nowrap" }}>
                    {upravovanyId === u.id ? (
                      <span style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => ulozit(u)} disabled={ukladam || !email.trim() || !jmeno.trim()} className="btn-pill primary">
                          Uložit
                        </button>
                        <button onClick={() => setUpravovanyId(null)} disabled={ukladam} className="btn-pill">
                          Zrušit
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => zacitUpravu(u)} className="btn-pill">
                        Upravit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {uzivatele && zobrazeni.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "16px 0", color: "var(--text-secondary)" }}>
                    Nikdo neodpovídá hledání.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
