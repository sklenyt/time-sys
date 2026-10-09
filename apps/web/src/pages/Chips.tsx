import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { AuthUserDto, CipNalezenDto, CipSkladDto, CipSListem, OrganizaceCilDto, Prihlaska, Trasa } from "@depo/shared";
import { StavCipu, StavSkladuCipu, TypCipu } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

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

const TYP_LABEL: Record<TypCipu, string> = {
  [TypCipu.OPAKOVANY]: "opakovaný",
  [TypCipu.JEDNORAZOVY]: "jednorázový",
};

const SKLAD_STAV_LABEL: Record<StavSkladuCipu, string> = {
  [StavSkladuCipu.SKLADEM]: "skladem",
  [StavSkladuCipu.VYDAN]: "vydán",
  [StavSkladuCipu.ZTRACEN]: "ztracen",
  [StavSkladuCipu.VYRAZEN]: "vyřazen",
};

const SKLAD_STAV_BARVA: Record<StavSkladuCipu, string> = {
  [StavSkladuCipu.SKLADEM]: "var(--color-live-700)",
  [StavSkladuCipu.VYDAN]: "var(--color-attention)",
  [StavSkladuCipu.ZTRACEN]: "var(--color-danger)",
  [StavSkladuCipu.VYRAZEN]: "var(--text-secondary)",
};

function formatCas(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

type SkladFiltr = "vse" | "skladem" | "vydane" | "ztracene";

/**
 * Čipy trati (F22/F29/F30, docs/07-ui-mockups.md §7.9). Dvě záložky:
 * „Vydané“ — přehled čipů této trati (kdo ho má venku, vrácení, záloha) — a
 * „Sklad“ — fyzické čipy organizace, které přežívají jednotlivé závody.
 * Čtečka čipů funguje jako klávesnice: kód se napíše do pole a odešle Enterem.
 */
export function Chips() {
  const { routeId } = useParams<{ routeId: string }>();
  const [zalozka, setZalozka] = useState<"vydane" | "sklad">("vydane");
  const [trasa, setTrasa] = useState<Trasa | null>(null);
  const [cipy, setCipy] = useState<CipSListem[]>([]);
  const [sklad, setSklad] = useState<CipSkladDto[]>([]);
  const [zavodnici, setZavodnici] = useState<Prihlaska[]>([]);
  const [cile, setCile] = useState<OrganizaceCilDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [skenKod, setSkenKod] = useState("");
  const [nalezeny, setNalezeny] = useState<(CipNalezenDto & { kod: string }) | null>(null);
  const [noveCislo, setNoveCislo] = useState("");
  const [novyTyp, setNovyTyp] = useState<TypCipu>(TypCipu.OPAKOVANY);
  const [chybaAkce, setChybaAkce] = useState<string | null>(null);
  const [pracuji, setPracuji] = useState(false);
  const skenRef = useRef<HTMLInputElement>(null);

  const [hromadne, setHromadne] = useState("");
  const [hromadnyTyp, setHromadnyTyp] = useState<TypCipu>(TypCipu.OPAKOVANY);
  const [hlaseni, setHlaseni] = useState<string | null>(null);
  const [filtr, setFiltr] = useState<SkladFiltr>("vse");
  const [hledat, setHledat] = useState("");
  const [vybrane, setVybrane] = useState<Set<string>>(new Set());
  const [cilPresunu, setCilPresunu] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [novaOrganizace, setNovaOrganizace] = useState("");

  async function reload() {
    if (!routeId) return;
    setError(null);
    try {
      const [t, c, z, s, ci, ja] = await Promise.all([
        api.get<Trasa>(`/routes/${routeId}`),
        api.get<CipSListem[]>(`/routes/${routeId}/chips`),
        api.get<Prihlaska[]>(`/routes/${routeId}/entries`),
        api.get<CipSkladDto[]>(`/routes/${routeId}/chips/sklad`),
        api.get<OrganizaceCilDto[]>(`/routes/${routeId}/chips/sklad/cile`),
        api.get<AuthUserDto>("/auth/me"),
      ]);
      setSuperAdmin(!!ja.superAdmin);
      setTrasa(t);
      setCipy(c);
      setZavodnici(z);
      setSklad(s);
      setCile(ci);
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

  async function upravitSklad(id: string, zmena: { typ?: TypCipu; stav?: StavSkladuCipu; stitek?: string }) {
    if (!routeId) return;
    setError(null);
    try {
      await api.patch(`/routes/${routeId}/chips/sklad/${id}`, zmena);
      await reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Uložení se nezdařilo"));
    }
  }

  async function smazatZeSkladu(id: string) {
    if (!routeId) return;
    setError(null);
    try {
      await api.del(`/routes/${routeId}/chips/sklad/${id}`);
      await reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Čip nejde smazat"));
    }
  }

  /** Čtečky se chovají jako klávesnice — po přiložení čipu kód „napíšou“ a odešlou Enter. */
  async function naskenovat(e: React.FormEvent) {
    e.preventDefault();
    const kod = skenKod.trim();
    if (!kod || !routeId) return;
    setChybaAkce(null);
    setNoveCislo("");
    setSkenKod("");
    try {
      const vysledek = await api.get<CipNalezenDto>(`/routes/${routeId}/chips/najit?kod=${encodeURIComponent(kod)}`);
      setNalezeny({ ...vysledek, kod });
    } catch (err) {
      setNalezeny(null);
      setChybaAkce(chybaZeServeru(err, "Hledání se nezdařilo"));
    }
    skenRef.current?.focus();
  }

  async function potvrditVraceni() {
    if (nalezeny?.cip) {
      await upravitStav(nalezeny.cip.id, StavCipu.VRACEN);
      setNalezeny(null);
    }
  }

  async function priraditNaCislo(e: React.FormEvent) {
    e.preventDefault();
    if (!routeId || !nalezeny) return;
    const zavodnik = zavodnici.find((z) => z.startovniCislo === Number(noveCislo));
    if (!zavodnik) {
      setChybaAkce("Startovní číslo nenalezeno na této trati.");
      return;
    }
    setPracuji(true);
    setChybaAkce(null);
    try {
      await api.post(`/routes/${routeId}/entries/${zavodnik.id}/chip`, { kodCipu: nalezeny.kod, typ: novyTyp });
      setNalezeny(null);
      setNoveCislo("");
      await reload();
      skenRef.current?.focus();
    } catch (err) {
      setChybaAkce(chybaZeServeru(err, "Přiřazení se nezdařilo"));
    } finally {
      setPracuji(false);
    }
  }

  async function jenPridatDoSkladu() {
    if (!routeId || !nalezeny) return;
    setPracuji(true);
    setChybaAkce(null);
    try {
      await api.post(`/routes/${routeId}/chips/sklad`, { kody: [nalezeny.kod], typ: novyTyp });
      setNalezeny(null);
      await reload();
    } catch (err) {
      setChybaAkce(chybaZeServeru(err, "Přidání se nezdařilo"));
    } finally {
      setPracuji(false);
    }
  }

  async function vratitMeziDostupne() {
    if (!nalezeny?.sklad) return;
    await upravitSklad(nalezeny.sklad.id, { stav: StavSkladuCipu.SKLADEM });
    setNalezeny(null);
  }

  async function pridatHromadne(e: React.FormEvent) {
    e.preventDefault();
    if (!routeId) return;
    const kody = hromadne.split(/[\s,;]+/).map((k) => k.trim()).filter(Boolean);
    if (kody.length === 0) return;
    setPracuji(true);
    setHlaseni(null);
    setError(null);
    try {
      const r = await api.post<{ pridano: number; preskoceno: number }>(`/routes/${routeId}/chips/sklad`, { kody, typ: hromadnyTyp });
      setHlaseni(
        `Přidáno ${r.pridano} čipů${r.preskoceno > 0 ? `, ${r.preskoceno} už ve skladu bylo (přeskočeno)` : ""}.`
      );
      setHromadne("");
      await reload();
    } catch (err) {
      setError(chybaZeServeru(err, "Přidání se nezdařilo"));
    } finally {
      setPracuji(false);
    }
  }

  async function zalozitOrganizaci(e: React.FormEvent) {
    e.preventDefault();
    const nazev = novaOrganizace.trim();
    if (!nazev) return;
    setPracuji(true);
    setHlaseni(null);
    setError(null);
    try {
      await api.post("/organizations", { nazev });
      setNovaOrganizace("");
      setHlaseni(`Organizace „${nazev}“ založena. Můžete do ní přesunout čipy.`);
      await reload();
    } catch (err) {
      setError(chybaZeServeru(err, "Organizaci se nepodařilo založit"));
    } finally {
      setPracuji(false);
    }
  }

  async function presunout() {
    if (!routeId || vybrane.size === 0 || !cilPresunu) return;
    setPracuji(true);
    setHlaseni(null);
    setError(null);
    try {
      const r = await api.post<{ presunuto: number; preskoceno: number; duvod: string }>(`/routes/${routeId}/chips/sklad/presunout`, {
        ids: [...vybrane],
        cilOrganizaceId: cilPresunu,
      });
      setHlaseni(`Přesunuto ${r.presunuto} čipů${r.preskoceno > 0 ? `, ${r.preskoceno} přeskočeno. ${r.duvod}` : "."}`);
      setVybrane(new Set());
      await reload();
    } catch (err) {
      setError(chybaZeServeru(err, "Přesun se nezdařil"));
    } finally {
      setPracuji(false);
    }
  }

  function stahnoutExportNevracenych() {
    const nevracene = cipy.filter((c) => c.stav !== StavCipu.VRACEN && c.typ !== TypCipu.JEDNORAZOVY);
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

  const k_vraceni = cipy.filter((c) => c.stav !== StavCipu.VRACEN && c.typ !== TypCipu.JEDNORAZOVY);
  const nevracenoPocet = k_vraceni.length;

  const skladVidet = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    return sklad.filter((c) => {
      if (filtr === "skladem" && c.stav !== StavSkladuCipu.SKLADEM) return false;
      if (filtr === "vydane" && c.stav !== StavSkladuCipu.VYDAN) return false;
      if (filtr === "ztracene" && c.stav !== StavSkladuCipu.ZTRACEN && c.stav !== StavSkladuCipu.VYRAZEN) return false;
      if (q && !`${c.kodCipu} ${c.stitek ?? ""} ${c.vydanoKomu?.prijmeni ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sklad, filtr, hledat]);

  const pocty = {
    vse: sklad.length,
    skladem: sklad.filter((c) => c.stav === StavSkladuCipu.SKLADEM).length,
    vydane: sklad.filter((c) => c.stav === StavSkladuCipu.VYDAN).length,
    ztracene: sklad.filter((c) => c.stav === StavSkladuCipu.ZTRACEN || c.stav === StavSkladuCipu.VYRAZEN).length,
  };

  function prepnoutVyber(id: string) {
    setVybrane((v) => {
      const dalsi = new Set(v);
      if (dalsi.has(id)) dalsi.delete(id);
      else dalsi.add(id);
      return dalsi;
    });
  }

  if (!trasa) {
    return (
      <AppShell active="cipy" routeId={routeId}>
        {error ?? "Načítám…"}
      </AppShell>
    );
  }

  return (
    <AppShell active="cipy" routeId={routeId} eventId={trasa.udalostId}>
      <div style={{ maxWidth: 1500 }}>
        <div className="dash-header" style={{ marginBottom: 20 }}>
          <div>
            <h1>Čipy</h1>
            <div className="meta mono">{trasa.nazev}</div>
          </div>
          <div className="dash-header-actions">
            {zalozka === "vydane" && (
              <button onClick={stahnoutExportNevracenych} className="btn-pill" disabled={nevracenoPocet === 0}>
                Export nevrácených (CSV)
              </button>
            )}
          </div>
        </div>
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        {hlaseni && <p style={{ color: "var(--color-live-700)", fontWeight: 600 }}>{hlaseni}</p>}

        <div className="sl-nastroje" style={{ marginBottom: 16 }}>
          <button type="button" className={`sl-filtr${zalozka === "vydane" ? " aktivni" : ""}`} onClick={() => setZalozka("vydane")}>
            Vydané na této trati ({cipy.length})
          </button>
          <button type="button" className={`sl-filtr${zalozka === "sklad" ? " aktivni" : ""}`} onClick={() => setZalozka("sklad")}>
            Sklad organizace ({sklad.length})
          </button>
        </div>

        {zalozka === "vydane" && (
          <>
            <Souhrn
              polozky={[
                { hodnota: cipy.length, popisek: "Vydaných čipů" },
                { hodnota: cipy.filter((c) => c.stav === StavCipu.VRACEN).length, popisek: "Vráceno", zvyrazneni: "ok" },
                { hodnota: nevracenoPocet, popisek: "K vrácení", zvyrazneni: nevracenoPocet > 0 ? "pozor" : undefined },
                { hodnota: cipy.filter((c) => c.stav === StavCipu.ZTRACEN).length, popisek: "Ztraceno" },
              ]}
            />
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5, maxWidth: 820, margin: "0 0 16px" }}>
              Čipy se berou ze skladu organizace (záložka Sklad). Přiřazení závodníkovi se dělá ve Startovní listině nebo
              tady přiložením čipu ke čtečce. Opakované čipy se po závodě vrací do skladu, jednorázové zůstávají závodníkům a
              do „K vrácení“ se nepočítají.
            </p>
          </>
        )}

        {(zalozka === "vydane" || zalozka === "sklad") && (
          <section className="dash-card" style={{ marginBottom: 24, maxWidth: 560 }}>
            <div className="dash-card-head">
              <h2>Najít čip</h2>
            </div>
            <form onSubmit={naskenovat} style={{ display: "flex", gap: 8 }}>
              <input
                ref={skenRef}
                autoFocus={zalozka === "vydane"}
                value={skenKod}
                onChange={(e) => setSkenKod(e.target.value)}
                placeholder="Sériové číslo (čtečka)"
                autoComplete="off"
                className="mono"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="submit" className="btn-pill primary">
                Najít
              </button>
            </form>
            {chybaAkce && !nalezeny && <p style={{ color: "var(--color-danger)", fontSize: 13, marginTop: 8 }}>{chybaAkce}</p>}

            {nalezeny && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" }}>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>
                  {nalezeny.sklad?.kodCipu ?? nalezeny.kod}
                  {nalezeny.sklad && ` · ${TYP_LABEL[nalezeny.sklad.typ]}`}
                </div>

                {nalezeny.vysledek === "VYDAN_NA_TRATI" && nalezeny.cip && (
                  <>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      č. {nalezeny.cip.startovniCislo} — {nalezeny.cip.prijmeni} {nalezeny.cip.jmeno}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "4px 0 10px" }}>
                      vydán na této trati, stav: {CIP_STAV_LABEL[nalezeny.cip.stav]}
                    </div>
                    {nalezeny.cip.typ === TypCipu.JEDNORAZOVY ? (
                      <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                        Jednorázový čip zůstává závodníkovi, vracet se nemusí.
                      </span>
                    ) : nalezeny.cip.stav !== StavCipu.VRACEN ? (
                      <button onClick={potvrditVraceni} className="btn-pill primary">
                        Potvrdit vrácení
                      </button>
                    ) : (
                      <span className="mono" style={{ fontSize: 12.5, color: "var(--color-live-700)" }}>
                        Už je vrácený.
                      </span>
                    )}
                  </>
                )}

                {nalezeny.vysledek === "VYDAN_JINDE" && nalezeny.sklad?.vydanoKomu && (
                  <div style={{ fontSize: 13 }}>
                    Čip je vydaný jinde: č. {nalezeny.sklad.vydanoKomu.startovniCislo} {nalezeny.sklad.vydanoKomu.prijmeni}{" "}
                    {nalezeny.sklad.vydanoKomu.jmeno} ({nalezeny.sklad.vydanoKomu.udalostNazev}, {nalezeny.sklad.vydanoKomu.trasaNazev}).
                    Vraťte ho tam, než ho vydáte znovu.
                  </div>
                )}

                {nalezeny.vysledek === "NEDOSTUPNY" && nalezeny.sklad && (
                  <>
                    <div style={{ fontSize: 13, color: "var(--color-danger)", marginBottom: 8 }}>
                      Čip je ve skladu označený jako {SKLAD_STAV_LABEL[nalezeny.sklad.stav]}.
                    </div>
                    <button onClick={vratitMeziDostupne} className="btn-pill">
                      Vrátit mezi dostupné
                    </button>
                  </>
                )}

                {(nalezeny.vysledek === "SKLADEM" || nalezeny.vysledek === "NEZNAMY") && (
                  <>
                    <div style={{ fontSize: 13, marginBottom: 8, color: nalezeny.vysledek === "NEZNAMY" ? "var(--color-danger)" : "inherit" }}>
                      {nalezeny.vysledek === "SKLADEM"
                        ? "Čip je ve skladu a je volný."
                        : `Čip „${nalezeny.kod}“ zatím není ve skladu organizace.`}
                    </div>
                    <form onSubmit={priraditNaCislo} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Přiřadit startovnímu číslu:</span>
                      <input value={noveCislo} onChange={(e) => setNoveCislo(e.target.value)} placeholder="Číslo" className="mono" style={{ ...inputStyle, width: 80 }} />
                      {nalezeny.vysledek === "NEZNAMY" && (
                        <select value={novyTyp} onChange={(e) => setNovyTyp(e.target.value as TypCipu)} style={inputStyle} aria-label="Typ čipu">
                          {Object.values(TypCipu).map((t) => (
                            <option key={t} value={t}>
                              {TYP_LABEL[t]}
                            </option>
                          ))}
                        </select>
                      )}
                      <button type="submit" disabled={pracuji || !noveCislo.trim()} className="btn-pill primary">
                        {nalezeny.vysledek === "NEZNAMY" ? "Přidat do skladu a přiřadit" : "Přiřadit"}
                      </button>
                      {nalezeny.vysledek === "NEZNAMY" && (
                        <button type="button" onClick={jenPridatDoSkladu} disabled={pracuji} className="btn-pill">
                          Jen přidat do skladu
                        </button>
                      )}
                    </form>
                    {chybaAkce && <p style={{ color: "var(--color-danger)", fontSize: 12.5, marginTop: 8 }}>{chybaAkce}</p>}
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {zalozka === "vydane" && (
          <TabulkaKarta>
            <thead>
              <tr>
                <th>Č.</th>
                <th>Závodník</th>
                <th>Sériové číslo</th>
                <th>Typ</th>
                <th>Stav</th>
                <th>Záloha (Kč)</th>
                <th>Vydáno</th>
                <th>Vráceno</th>
              </tr>
            </thead>
            <tbody>
              {cipy.map((c) => (
                <tr key={c.id} className="sl-radek">
                  <td className="sl-cislo">{c.startovniCislo}</td>
                  <td style={{ fontWeight: 700 }}>
                    {c.prijmeni} {c.jmeno}
                  </td>
                  <td className="mono">{c.kodCipu}</td>
                  <td className="sl-podtitul">{TYP_LABEL[c.typ ?? TypCipu.OPAKOVANY]}</td>
                  <td>
                    <select
                      value={c.stav}
                      onChange={(e) => upravitStav(c.id, e.target.value as StavCipu)}
                      className="sl-stav"
                      style={{ color: CIP_STAV_BARVA[c.stav] }}
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
                      style={{ width: 90, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}
                    />
                  </td>
                  <td className="sl-podtitul">{formatCas(c.vydanoAt)}</td>
                  <td className="sl-podtitul">{formatCas(c.vracenoAt)}</td>
                </tr>
              ))}
              {cipy.length === 0 && (
                <PrazdnyRadek sloupcu={8} text="Na této trati zatím není vydaný žádný čip. Přiřaďte ho ve Startovní listině nebo přiložte čip ke čtečce výše." />
              )}
            </tbody>
          </TabulkaKarta>
        )}

        {zalozka === "sklad" && (
          <>
            <Souhrn
              polozky={[
                { hodnota: pocty.vse, popisek: "Čipů ve skladu" },
                { hodnota: pocty.skladem, popisek: "Skladem", zvyrazneni: "ok" },
                { hodnota: pocty.vydane, popisek: "Vydáno" },
                { hodnota: pocty.ztracene, popisek: "Ztraceno nebo vyřazeno", zvyrazneni: pocty.ztracene > 0 ? "pozor" : undefined },
              ]}
            />

            <section className="dash-card" style={{ marginBottom: 20, maxWidth: 720 }}>
              <div className="dash-card-head">
                <h2>Přidat čipy do skladu</h2>
              </div>
              <form onSubmit={pridatHromadne} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={hromadne}
                  onChange={(e) => setHromadne(e.target.value)}
                  rows={4}
                  className="mono"
                  placeholder="Naskenujte čip za čipem, každý kód na nový řádek (čtečka sama odešle Enter). Nebo sem vložte seznam."
                  style={{ ...inputStyle, width: "100%", resize: "vertical", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={hromadnyTyp} onChange={(e) => setHromadnyTyp(e.target.value as TypCipu)} style={inputStyle} aria-label="Typ přidávaných čipů">
                    {Object.values(TypCipu).map((t) => (
                      <option key={t} value={t}>
                        {TYP_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-pill primary" disabled={pracuji || !hromadne.trim()}>
                    Přidat do skladu
                  </button>
                  <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    Opakovaný čip se po závodě vrací, jednorázový zůstává závodníkovi.
                  </span>
                </div>
              </form>
            </section>

            <div className="sl-nastroje">
              <input value={hledat} onChange={(e) => setHledat(e.target.value)} placeholder="Hledat kód, štítek nebo jméno" className="sl-hledani" />
              {(
                [
                  ["vse", "Všechny"],
                  ["skladem", "Skladem"],
                  ["vydane", "Vydané"],
                  ["ztracene", "Ztracené a vyřazené"],
                ] as [SkladFiltr, string][]
              ).map(([klic, popisek]) => (
                <button key={klic} type="button" onClick={() => setFiltr(klic)} className={`sl-filtr${filtr === klic ? " aktivni" : ""}`}>
                  {popisek} {pocty[klic]}
                </button>
              ))}
              {superAdmin && (
                <span style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
                  {cile.length > 0 && (
                    <>
                      <select value={cilPresunu} onChange={(e) => setCilPresunu(e.target.value)} style={inputStyle} aria-label="Cílová organizace">
                        <option value="">Přesunout vybrané do…</option>
                        {cile.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nazev}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={presunout} disabled={pracuji || vybrane.size === 0 || !cilPresunu} className="btn-pill">
                        Přesunout ({vybrane.size})
                      </button>
                    </>
                  )}
                  <form onSubmit={zalozitOrganizaci} style={{ display: "flex", gap: 6 }}>
                    <input
                      value={novaOrganizace}
                      onChange={(e) => setNovaOrganizace(e.target.value)}
                      placeholder={cile.length > 0 ? "Nová organizace" : "Nová organizace (cíl přesunu)"}
                      maxLength={120}
                      style={{ ...inputStyle, width: 200 }}
                    />
                    <button type="submit" className="btn-pill" disabled={pracuji || !novaOrganizace.trim()}>
                      Založit
                    </button>
                  </form>
                </span>
              )}
            </div>

            <TabulkaKarta>
              <thead>
                <tr>
                  {superAdmin && cile.length > 0 && <th style={{ width: 32 }} />}
                  <th>Kód čipu</th>
                  <th>Typ</th>
                  <th>Stav</th>
                  <th>Vydáno komu</th>
                  <th>Štítek</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {skladVidet.map((c) => (
                  <tr key={c.id} className="sl-radek">
                    {superAdmin && cile.length > 0 && (
                      <td>
                        <input
                          type="checkbox"
                          checked={vybrane.has(c.id)}
                          onChange={() => prepnoutVyber(c.id)}
                          disabled={c.stav !== StavSkladuCipu.SKLADEM}
                          aria-label={`Vybrat čip ${c.kodCipu}`}
                        />
                      </td>
                    )}
                    <td className="mono" style={{ fontWeight: 700 }}>
                      {c.kodCipu}
                    </td>
                    <td>
                      <select value={c.typ} onChange={(e) => upravitSklad(c.id, { typ: e.target.value as TypCipu })} className="sl-stav">
                        {Object.values(TypCipu).map((t) => (
                          <option key={t} value={t}>
                            {TYP_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {c.stav === StavSkladuCipu.VYDAN ? (
                        <span className="sl-stav" style={{ color: SKLAD_STAV_BARVA[c.stav] }}>
                          {SKLAD_STAV_LABEL[c.stav]}
                        </span>
                      ) : (
                        <select
                          value={c.stav}
                          onChange={(e) => upravitSklad(c.id, { stav: e.target.value as StavSkladuCipu })}
                          className="sl-stav"
                          style={{ color: SKLAD_STAV_BARVA[c.stav] }}
                        >
                          {[StavSkladuCipu.SKLADEM, StavSkladuCipu.ZTRACEN, StavSkladuCipu.VYRAZEN].map((s) => (
                            <option key={s} value={s}>
                              {SKLAD_STAV_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="sl-podtitul">
                      {c.vydanoKomu
                        ? `č. ${c.vydanoKomu.startovniCislo} ${c.vydanoKomu.prijmeni} ${c.vydanoKomu.jmeno} · ${c.vydanoKomu.udalostNazev}, ${c.vydanoKomu.trasaNazev}`
                        : "—"}
                    </td>
                    <td>
                      <input
                        defaultValue={c.stitek ?? ""}
                        placeholder="např. č. na těle"
                        maxLength={80}
                        onBlur={(e) => {
                          if (e.target.value !== (c.stitek ?? "")) upravitSklad(c.id, { stitek: e.target.value });
                        }}
                        style={{ width: 140, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}
                      />
                    </td>
                    <td>
                      <button type="button" className="sl-odkaz" onClick={() => smazatZeSkladu(c.id)} disabled={c.stav === StavSkladuCipu.VYDAN}>
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))}
                {skladVidet.length === 0 && (
                  <PrazdnyRadek
                    sloupcu={superAdmin && cile.length > 0 ? 7 : 6}
                    text={sklad.length === 0 ? "Sklad je prázdný. Naskenujte čipy do pole výše, nebo je přidejte při prvním přiřazení závodníkovi." : "Žádný čip neodpovídá filtru."}
                  />
                )}
              </tbody>
            </TabulkaKarta>
          </>
        )}
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
