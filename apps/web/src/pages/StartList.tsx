import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Cip, DruzstvoClen, ImportEntriesResponseDto, Kategorie, Prihlaska, Trasa, Udalost } from "@depo/shared";
import { Pohlavi, StavCipu, StavUkonceni } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { BusyOverlay } from "../components/BusyOverlay";

/**
 * Trať bez aktivní (neukončené) akce nesmí tiše ukázat startovní listinu —
 * organizátor by tu jinak přes fallback poslední navštívené trati (viz
 * AppShell) mohl narazit na seznam přihlášených u dávno ukončeného závodu.
 * Místo listiny se nabídne výběr aktivní akce a trati, ať je vždy jasné,
 * s čím se právě pracuje.
 */
function VyberAktivniAkce() {
  const navigate = useNavigate();
  const [udalosti, setUdalosti] = useState<Udalost[] | null>(null);
  const [vybranaId, setVybranaId] = useState("");
  const [trasy, setTrasy] = useState<Trasa[] | null>(null);
  const [nacitamTrasy, setNacitamTrasy] = useState(false);

  useEffect(() => {
    api
      .get<Udalost[]>("/events")
      .then((vse) => setUdalosti(vse.filter((u) => !u.ukoncena)))
      .catch(() => setUdalosti([]));
  }, []);

  function vybratAkci(id: string) {
    setVybranaId(id);
    setTrasy(null);
    if (!id) return;
    setNacitamTrasy(true);
    api
      .get<Trasa[]>(`/events/${id}/routes`)
      .then(setTrasy)
      .catch(() => setTrasy([]))
      .finally(() => setNacitamTrasy(false));
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="dash-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Startovní listina</h1>
          <div className="meta mono">Vyberte aktivní akci</div>
        </div>
      </div>
      <section className="dash-card">
        <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginTop: 0 }}>
          Tahle trať patří k ukončené nebo neexistující akci, takže tu nejde vidět startovní listina — nejdřív
          vyberte, se kterou aktivní akcí chcete pracovat.
        </p>
        {udalosti === null && <p className="mono">Načítám…</p>}
        {udalosti?.length === 0 && (
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Zatím nemáte žádnou aktivní akci. <Link to="/sprava">Založte novou ve Správě akcí.</Link>
          </p>
        )}
        {udalosti && udalosti.length > 0 && (
          <>
            <select value={vybranaId} onChange={(e) => vybratAkci(e.target.value)} style={inputStyle}>
              <option value="">Vyberte akci…</option>
              {udalosti.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nazev}
                </option>
              ))}
            </select>
            {nacitamTrasy && (
              <p className="mono" style={{ fontSize: 13 }}>
                Načítám tratě…
              </p>
            )}
            {trasy && trasy.length === 0 && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>Tahle akce zatím nemá žádnou trať.</p>
            )}
            {trasy && trasy.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {trasy.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => navigate(`/startovni-listina/${t.id}`)}
                      className="btn-pill"
                      style={{ width: "100%" }}
                    >
                      {t.nazev}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

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

function ChipBunka({
  routeId,
  entry,
  onChanged,
}: {
  routeId: string;
  entry: Prihlaska & { cip?: Cip | null };
  onChanged: () => void;
}) {
  const [kod, setKod] = useState("");
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  async function parovat() {
    if (!kod.trim()) return;
    setOdesilam(true);
    setChyba(null);
    try {
      await api.post(`/routes/${routeId}/entries/${entry.id}/chip`, { kodCipu: kod.trim() });
      setKod("");
      onChanged();
    } catch (e) {
      setChyba(chybaZeServeru(e, "Přiřazení čipu se nezdařilo"));
    } finally {
      setOdesilam(false);
    }
  }

  async function odebrat() {
    setOdesilam(true);
    setChyba(null);
    try {
      await api.del(`/routes/${routeId}/entries/${entry.id}/chip`);
      onChanged();
    } catch (e) {
      setChyba(chybaZeServeru(e, "Odebrání čipu se nezdařilo"));
    } finally {
      setOdesilam(false);
    }
  }

  if (entry.cip) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 12.5 }}>
          {entry.cip.kodCipu}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: 999,
            background: CIP_STAV_BARVA[entry.cip.stav],
            color: "#fff",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {CIP_STAV_LABEL[entry.cip.stav]}
        </span>
        <button onClick={odebrat} disabled={odesilam} className="btn-pill" style={{ padding: "2px 8px", fontSize: 11 }}>
          Odebrat
        </button>
        {chyba && <span style={{ color: "var(--color-danger)", fontSize: 11 }}>{chyba}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <input
        value={kod}
        onChange={(e) => setKod(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && parovat()}
        placeholder="Sériové číslo (čtečka)"
        autoComplete="off"
        className="mono"
        style={{ width: 150, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
      />
      <button onClick={parovat} disabled={odesilam || !kod.trim()} className="btn-pill" style={{ padding: "2px 8px", fontSize: 11 }}>
        Přiřadit
      </button>
      {chyba && <span style={{ color: "var(--color-danger)", fontSize: 11 }}>{chyba}</span>}
    </div>
  );
}

const STAV_LABEL: Record<StavUkonceni, string> = {
  [StavUkonceni.DNS]: "DNS",
  [StavUkonceni.DNF]: "DNF",
  [StavUkonceni.DQ]: "DQ",
};

const PRAZDNY_CLEN: DruzstvoClen = { prijmeni: "", jmeno: "", rocnik: undefined, klub: undefined };

export function StartList() {
  const { routeId } = useParams<{ routeId: string }>();
  const [trasa, setTrasa] = useState<(Trasa & { kategorie: Kategorie[] }) | null>(null);
  const [udalost, setUdalost] = useState<Udalost | null>(null);
  const [entries, setEntries] = useState<(Prihlaska & { kategorie?: Kategorie; cip?: Cip | null })[]>([]);
  const [catKod, setCatKod] = useState("");
  const [catNazev, setCatNazev] = useState("");
  const [catPohlavi, setCatPohlavi] = useState<Pohlavi>(Pohlavi.M);
  const [cislo, setCislo] = useState("");
  const [prijmeni, setPrijmeni] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [rocnik, setRocnik] = useState("");
  const [pohlavi, setPohlavi] = useState<Pohlavi | "">("");
  const [kategorieId, setKategorieId] = useState("");
  const [navrzenaKategorieId, setNavrzenaKategorieId] = useState<string | null>(null);
  const [druzstvo, setDruzstvo] = useState(false);
  const [clenove, setClenove] = useState<DruzstvoClen[]>([{ ...PRAZDNY_CLEN }]);
  const [error, setError] = useState<string | null>(null);
  const [importVysledek, setImportVysledek] = useState<ImportEntriesResponseDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pridatKategorii, setPridatKategorii] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    if (!routeId) return;
    setError(null);
    try {
      const t = await api.get<Trasa & { kategorie: Kategorie[] }>(`/routes/${routeId}`);
      setTrasa(t);
      const u = await api.get<Udalost>(`/events/${t.udalostId}`);
      setUdalost(u);
      if (u.ukoncena) return; // ukončená akce — listina se nenačítá, viz VyberAktivniAkce níže
      const e = await api.get<(Prihlaska & { kategorie?: Kategorie; cip?: Cip | null })[]>(
        `/routes/${routeId}/entries`
      );
      setEntries(e);
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba načítání"));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // F03 — automatický návrh kategorie podle ročníku/pohlaví. Jen našeptává:
  // kategorii přednastaví, ale pole zůstává editovatelné a organizátor musí
  // zápis vždy sám odeslat, nic se neuloží potichu.
  useEffect(() => {
    if (!routeId || !rocnik || !pohlavi) {
      setNavrzenaKategorieId(null);
      return;
    }
    const rocnikCislo = Number(rocnik);
    if (Number.isNaN(rocnikCislo)) return;
    let zruseno = false;
    api
      .get<Kategorie | null>(`/routes/${routeId}/categories/suggest?rocnik=${rocnikCislo}&pohlavi=${pohlavi}`)
      .then((navrh) => {
        if (zruseno || !navrh) return;
        setNavrzenaKategorieId(navrh.id);
        setKategorieId((aktualni) => aktualni || navrh.id);
      })
      .catch(() => {
        // Návrh je jen doplněk — chyba nesmí bránit ručnímu výběru kategorie.
      });
    return () => {
      zruseno = true;
    };
  }, [routeId, rocnik, pohlavi]);

  async function createCategory() {
    if (!routeId || !catKod.trim() || !catNazev.trim()) return;
    await api.post(`/routes/${routeId}/categories`, {
      kod: catKod,
      nazev: catNazev,
      pohlavi: catPohlavi,
    });
    setCatKod("");
    setCatNazev("");
    reload();
  }

  function stahnoutSablonuCsv() {
    const hlavicka = [
      "cislo",
      "prijmeni",
      "jmeno",
      "kategorie",
      "rocnik",
      "pohlavi",
      "klub",
      "clen1_prijmeni",
      "clen1_jmeno",
      "clen1_rocnik",
      "clen1_klub",
      "clen2_prijmeni",
      "clen2_jmeno",
      "clen2_rocnik",
      "clen2_klub",
      "clen3_prijmeni",
      "clen3_jmeno",
      "clen3_rocnik",
      "clen3_klub",
      "clen4_prijmeni",
      "clen4_jmeno",
      "clen4_rocnik",
      "clen4_klub",
    ];
    const ukazkovyKod = trasa?.kategorie[0]?.kod ?? "MAk";
    const ukazka = ["101", "Novák", "Petr", ukazkovyKod, "1990", "M", "AC Sparta"];
    const csv = [hlavicka.join(","), ukazka.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const odkaz = document.createElement("a");
    odkaz.href = url;
    odkaz.download = "startovni-listina-sablona.csv";
    odkaz.click();
    URL.revokeObjectURL(url);
  }

  async function createEntry() {
    if (!routeId || !cislo || !prijmeni.trim() || !jmeno.trim() || !kategorieId) {
      setError("Startovní číslo, jméno, příjmení a kategorie jsou povinné.");
      return;
    }
    const platniClenove = druzstvo
      ? clenove.filter((c) => c.prijmeni.trim() && c.jmeno.trim()).map((c) => ({ ...c, prijmeni: c.prijmeni.trim(), jmeno: c.jmeno.trim() }))
      : undefined;
    try {
      await api.post(`/routes/${routeId}/entries`, {
        startovniCislo: Number(cislo),
        prijmeni,
        jmeno,
        kategorieId,
        rocnik: rocnik ? Number(rocnik) : undefined,
        pohlavi: pohlavi || undefined,
        clenoveDruzstva: platniClenove?.length ? platniClenove : undefined,
      });
      setCislo("");
      setPrijmeni("");
      setJmeno("");
      setRocnik("");
      setPohlavi("");
      setKategorieId("");
      setNavrzenaKategorieId(null);
      setDruzstvo(false);
      setClenove([{ ...PRAZDNY_CLEN }]);
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba zápisu"));
    }
  }

  async function nastavitStav(entryId: string, stav: StavUkonceni | null) {
    if (!routeId) return;
    try {
      await api.patch(`/routes/${routeId}/entries/${entryId}`, { stavUkonceni: stav });
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Nastavení stavu se nezdařilo"));
    }
  }

  async function importCsv(soubor: File) {
    if (!routeId) return;
    setError(null);
    setImportVysledek(null);
    setBusy("Importuji CSV…");
    try {
      const formData = new FormData();
      formData.append("soubor", soubor);
      const vysledek = await api.postForm<ImportEntriesResponseDto>(`/routes/${routeId}/entries/import`, formData);
      setImportVysledek(vysledek);
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Import se nezdařil"));
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function upravitClena(index: number, zmena: Partial<DruzstvoClen>) {
    setClenove((c) => c.map((clen, i) => (i === index ? { ...clen, ...zmena } : clen)));
  }

  if (!trasa) {
    return (
      <AppShell active="listina" routeId={routeId}>
        {error ?? "Načítám…"}
      </AppShell>
    );
  }

  if (udalost?.ukoncena) {
    return (
      <AppShell active="listina" routeId={routeId} eventId={trasa.udalostId}>
        <VyberAktivniAkce />
      </AppShell>
    );
  }

  return (
    <AppShell active="listina" routeId={routeId} eventId={trasa.udalostId}>
      <BusyOverlay active={busy !== null} label={busy ?? undefined} />
      <div style={{ maxWidth: 760 }}>
      <div className="dash-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Startovní listina</h1>
          <div className="meta mono">
            {trasa.nazev} · {entries.length} {entries.length === 1 ? "závodník" : "závodníků"}
          </div>
        </div>
      </div>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <section className="dash-card" style={{ marginBottom: 24 }}>
        <div className="dash-card-head">
          <h2>Kategorie</h2>
          {trasa.kategorie.length > 0 && (
            <button onClick={() => setPridatKategorii((v) => !v)} className="btn-pill">
              {pridatKategorii ? "Zrušit" : "+ Přidat kategorii"}
            </button>
          )}
        </div>
        {trasa.kategorie.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {trasa.kategorie.map((k) => (
              <span
                key={k.id}
                className="mono"
                style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid var(--line)", fontSize: 12.5 }}
              >
                {k.kod} — {k.nazev} ({k.pohlavi})
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: 0 }}>
            Zatím žádná kategorie — bez alespoň jedné kategorie nejde zapsat závodníka do listiny.
          </p>
        )}
        {(pridatKategorii || trasa.kategorie.length === 0) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <input placeholder="Kód, např. MAk" value={catKod} onChange={(e) => setCatKod(e.target.value)} style={inputStyle} />
            <input placeholder="Název, např. Muži A" value={catNazev} onChange={(e) => setCatNazev(e.target.value)} style={inputStyle} />
            <select value={catPohlavi} onChange={(e) => setCatPohlavi(e.target.value as Pohlavi)} style={inputStyle}>
              <option value={Pohlavi.M}>M</option>
              <option value={Pohlavi.Z}>Z</option>
            </select>
            <button onClick={createCategory} className="btn-pill primary">
              Přidat kategorii
            </button>
          </div>
        )}
      </section>

      {trasa.kategorie.length > 0 && (
        <section className="dash-card" style={{ marginBottom: 24 }}>
          <div className="dash-card-head">
            <h2>Zápis na místě</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Číslo" value={cislo} onChange={(e) => setCislo(e.target.value)} style={{ ...inputStyle, width: 80 }} />
            <input placeholder="Příjmení" value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} style={inputStyle} />
            <input placeholder="Jméno" value={jmeno} onChange={(e) => setJmeno(e.target.value)} style={inputStyle} />
            <input
              placeholder="Ročník"
              value={rocnik}
              onChange={(e) => setRocnik(e.target.value)}
              style={{ ...inputStyle, width: 90 }}
            />
            <select value={pohlavi} onChange={(e) => setPohlavi(e.target.value as Pohlavi | "")} style={inputStyle}>
              <option value="">Pohlaví</option>
              <option value={Pohlavi.M}>M</option>
              <option value={Pohlavi.Z}>Z</option>
            </select>
            <select
              value={kategorieId}
              onChange={(e) => setKategorieId(e.target.value)}
              style={{ ...inputStyle, borderColor: kategorieId ? "var(--line)" : "var(--color-danger)" }}
            >
              <option value="">Kategorie (povinné)</option>
              {trasa.kategorie.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kod} — {k.nazev}
                </option>
              ))}
            </select>
            <button onClick={createEntry} className="btn-pill primary">
              Přidat do listiny
            </button>
          </div>
          {navrzenaKategorieId && kategorieId === navrzenaKategorieId && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0" }}>
              Kategorie navržena automaticky podle ročníku a pohlaví — klidně ji přepiš, pokud nesedí.
            </p>
          )}

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={druzstvo} onChange={(e) => setDruzstvo(e.target.checked)} />
              Štafeta / družstvo (max 4 další členové pod tímto startovním číslem)
            </label>
            {druzstvo && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {clenove.map((clen, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      placeholder={`Člen ${i + 1} — příjmení`}
                      value={clen.prijmeni}
                      onChange={(e) => upravitClena(i, { prijmeni: e.target.value })}
                      style={inputStyle}
                    />
                    <input
                      placeholder="Jméno"
                      value={clen.jmeno}
                      onChange={(e) => upravitClena(i, { jmeno: e.target.value })}
                      style={inputStyle}
                    />
                    <input
                      placeholder="Ročník"
                      value={clen.rocnik ?? ""}
                      onChange={(e) => upravitClena(i, { rocnik: e.target.value ? Number(e.target.value) : undefined })}
                      style={{ ...inputStyle, width: 90 }}
                    />
                    <input
                      placeholder="Klub"
                      value={clen.klub ?? ""}
                      onChange={(e) => upravitClena(i, { klub: e.target.value || undefined })}
                      style={inputStyle}
                    />
                  </div>
                ))}
                {clenove.length < 4 && (
                  <button
                    type="button"
                    className="btn-pill"
                    style={{ alignSelf: "flex-start" }}
                    onClick={() => setClenove((c) => [...c, { ...PRAZDNY_CLEN }])}
                  >
                    + Další člen
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label className="mono" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Import z CSV (cislo, prijmeni, jmeno, kategorie — nepovinné rocnik, pohlavi, klub; bez kategorie se
              dopočítá z ročníku/pohlaví; clen1_prijmeni…clen4_klub pro štafety)
            </label>
            <button type="button" onClick={stahnoutSablonuCsv} className="btn-pill">
              Stáhnout šablonu CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
          </div>
          {importVysledek && (
            <p className="mono" style={{ fontSize: 13, marginTop: 8 }}>
              Importováno {importVysledek.importovano}.
              {importVysledek.chyby.length > 0 && (
                <span style={{ color: "var(--color-danger)" }}>
                  {" "}
                  Chyby: {importVysledek.chyby.map((c) => `řádek ${c.radek}: ${c.zprava}`).join("; ")}
                </span>
              )}
            </p>
          )}
        </section>
      )}

      <div className="table-scroll">
        <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
              <th>Č.</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Jméno</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Kategorie</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Družstvo</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Čip</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Stav</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td>{e.startovniCislo}</td>
                <td style={{ fontFamily: "var(--font-ui)" }}>
                  {e.prijmeni} {e.jmeno}
                </td>
                <td style={{ fontFamily: "var(--font-ui)" }}>{e.kategorie?.kod ?? "—"}</td>
                <td style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--text-secondary)" }}>
                  {e.clenoveDruzstva?.length
                    ? e.clenoveDruzstva.map((c) => `${c.prijmeni} ${c.jmeno}`).join(", ")
                    : "—"}
                </td>
                <td>
                  <ChipBunka routeId={routeId!} entry={e} onChanged={reload} />
                </td>
                <td>
                  <select
                    value={e.stavUkonceni ?? ""}
                    onChange={(ev) => nastavitStav(e.id, (ev.target.value as StavUkonceni) || null)}
                    style={{
                      ...inputStyle,
                      padding: "4px 8px",
                      fontSize: 12.5,
                      color: e.stavUkonceni ? "var(--color-danger)" : "var(--text-secondary)",
                      borderColor: e.stavUkonceni ? "var(--color-danger)" : "var(--line)",
                    }}
                  >
                    <option value="">v pořádku</option>
                    {Object.values(StavUkonceni).map((s) => (
                      <option key={s} value={s}>
                        {STAV_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
