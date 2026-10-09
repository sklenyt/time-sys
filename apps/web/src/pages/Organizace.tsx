import { useEffect, useState } from "react";
import type { AuthUserDto, OrganizacePrehledDto } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

/** Správa organizací pro super admina: založení, přejmenování a členové (jeden člověk může být ve víc organizacích). */
export function Organizace() {
  const [ja, setJa] = useState<AuthUserDto | null>(null);
  const [prehled, setPrehled] = useState<OrganizacePrehledDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hlaseni, setHlaseni] = useState<string | null>(null);
  const [nazev, setNazev] = useState("");
  const [otevrena, setOtevrena] = useState<string | null>(null);
  const [emailClena, setEmailClena] = useState("");
  const [prejmenovani, setPrejmenovani] = useState<{ id: string; nazev: string } | null>(null);
  const [pracuji, setPracuji] = useState(false);

  async function nacist() {
    try {
      const [u, p] = await Promise.all([api.get<AuthUserDto>("/auth/me"), api.get<OrganizacePrehledDto[]>("/organizations/prehled").catch(() => null)]);
      setJa(u);
      setPrehled(p);
    } catch (e) {
      setError(chybaZeServeru(e, "Načtení se nezdařilo"));
    }
  }

  useEffect(() => {
    nacist();
  }, []);

  async function provest(akce: () => Promise<unknown>, zprava?: string) {
    setPracuji(true);
    setError(null);
    setHlaseni(null);
    try {
      await akce();
      if (zprava) setHlaseni(zprava);
      await nacist();
    } catch (e) {
      setError(chybaZeServeru(e, "Akce se nezdařila"));
    } finally {
      setPracuji(false);
    }
  }

  if (ja && !ja.superAdmin) {
    return (
      <AppShell active="organizace">
        <HlavickaStranky titulek="Organizace" />
        <p>Organizace spravuje jen super admin.</p>
      </AppShell>
    );
  }

  return (
    <AppShell active="organizace">
      <div style={{ maxWidth: 1300 }}>
        <HlavickaStranky titulek="Organizace" popis="Kluby a pořadatelé — založení a členové (člověk může být ve víc organizacích)" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        {hlaseni && <p style={{ color: "var(--color-live-700)", fontWeight: 600 }}>{hlaseni}</p>}

        <Souhrn
          polozky={[
            { hodnota: prehled?.length ?? "…", popisek: "Organizací" },
            { hodnota: prehled?.reduce((s, o) => s + o.pocetAkci, 0) ?? "…", popisek: "Akcí" },
            { hodnota: prehled?.reduce((s, o) => s + o.pocetCipu, 0) ?? "…", popisek: "Čipů ve skladech" },
          ]}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = nazev.trim();
            if (!n) return;
            provest(async () => {
              await api.post("/organizations", { nazev: n });
              setNazev("");
            }, `Organizace „${n}“ založena. Přidejte do ní členy.`);
          }}
          className="sl-nastroje"
        >
          <input value={nazev} onChange={(e) => setNazev(e.target.value)} placeholder="Název nové organizace" maxLength={120} className="sl-hledani" />
          <button type="submit" className="btn-pill primary" disabled={pracuji || !nazev.trim()}>
            Založit organizaci
          </button>
        </form>

        <TabulkaKarta>
          <thead>
            <tr>
              <th>Organizace</th>
              <th style={{ textAlign: "right" }}>Akcí</th>
              <th style={{ textAlign: "right" }}>Členů</th>
              <th style={{ textAlign: "right" }}>Čipů</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(prehled ?? []).map((o) => (
              <>
                <tr key={o.id} className="sl-radek">
                  <td style={{ fontWeight: 700 }}>
                    {prejmenovani?.id === o.id ? (
                      <form
                        style={{ display: "inline-flex", gap: 6 }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          provest(async () => {
                            await api.patch(`/organizations/${o.id}`, { nazev: prejmenovani.nazev });
                            setPrejmenovani(null);
                          });
                        }}
                      >
                        <input value={prejmenovani.nazev} onChange={(e) => setPrejmenovani({ id: o.id, nazev: e.target.value })} className="sl-hledani" style={{ minWidth: 200 }} />
                        <button type="submit" className="btn-pill primary" disabled={pracuji || !prejmenovani.nazev.trim()}>
                          Uložit
                        </button>
                        <button type="button" className="btn-pill" onClick={() => setPrejmenovani(null)}>
                          Zrušit
                        </button>
                      </form>
                    ) : (
                      o.nazev
                    )}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{o.pocetAkci}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{o.pocetClenu}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{o.pocetCipu}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn-pill" onClick={() => setPrejmenovani({ id: o.id, nazev: o.nazev })} style={{ marginRight: 6 }}>
                      Přejmenovat
                    </button>
                    <button
                      className="btn-pill"
                      onClick={() => {
                        setOtevrena(otevrena === o.id ? null : o.id);
                        setEmailClena("");
                      }}
                    >
                      {otevrena === o.id ? "Skrýt členy" : "Členové"}
                    </button>
                  </td>
                </tr>
                {otevrena === o.id && (
                  <tr key={`${o.id}-clenove`}>
                    <td colSpan={5} style={{ background: "var(--surface)", padding: "12px 16px" }}>
                      {o.clenove.length === 0 && <div style={{ color: "var(--text-secondary)", fontSize: 13.5, marginBottom: 10 }}>Organizace zatím nemá členy.</div>}
                      {o.clenove.map((c) => (
                        <div key={c.uzivatelId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                          <span style={{ fontWeight: 700, minWidth: 180 }}>{c.jmeno}</span>
                          <span style={{ color: "var(--text-secondary)", flex: 1 }}>{c.email}</span>
                          {c.aktivni && <span className="stitek stitek-neutralni">aktivní u něj</span>}
                          <button
                            className="btn-pill"
                            disabled={pracuji}
                            onClick={() => provest(() => api.del(`/organizations/${o.id}/clenove/${c.uzivatelId}`), `${c.jmeno} už v organizaci není.`)}
                          >
                            Odebrat
                          </button>
                        </div>
                      ))}
                      <form
                        style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const email = emailClena.trim();
                          if (!email) return;
                          provest(async () => {
                            await api.post(`/organizations/${o.id}/clenove`, { email });
                            setEmailClena("");
                          }, `${email} je teď členem organizace.`);
                        }}
                      >
                        <input
                          type="email"
                          value={emailClena}
                          onChange={(e) => setEmailClena(e.target.value)}
                          placeholder="E-mail existujícího účtu"
                          className="sl-hledani"
                          style={{ minWidth: 280 }}
                        />
                        <button type="submit" className="btn-pill primary" disabled={pracuji || !emailClena.trim()}>
                          Přidat do organizace
                        </button>
                      </form>
                      <p style={{ color: "var(--text-secondary)", fontSize: 12.5, margin: "8px 0 0" }}>
                        Člověk musí mít v Depu založený účet. Do organizace se přidá k těm, ve kterých už je, a mezi nimi se přepíná v levém horním rohu menu.
                      </p>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!prehled && !error && <PrazdnyRadek sloupcu={5} text="Načítám…" />}
            {prehled && prehled.length === 0 && <PrazdnyRadek sloupcu={5} text="Zatím žádná organizace." />}
          </tbody>
        </TabulkaKarta>
      </div>
    </AppShell>
  );
}
