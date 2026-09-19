import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { ImportEntriesResponseDto, Kategorie, Prihlaska, Trasa } from "@depo/shared";
import { Pohlavi } from "@depo/shared";
import { api } from "../lib/api";

export function StartList() {
  const { routeId } = useParams<{ routeId: string }>();
  const [trasa, setTrasa] = useState<(Trasa & { kategorie: Kategorie[] }) | null>(null);
  const [entries, setEntries] = useState<Prihlaska[]>([]);
  const [catKod, setCatKod] = useState("");
  const [catNazev, setCatNazev] = useState("");
  const [catPohlavi, setCatPohlavi] = useState<Pohlavi>(Pohlavi.M);
  const [cislo, setCislo] = useState("");
  const [prijmeni, setPrijmeni] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [kategorieId, setKategorieId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importVysledek, setImportVysledek] = useState<ImportEntriesResponseDto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    if (!routeId) return;
    setError(null);
    try {
      const t = await api.get<Trasa & { kategorie: Kategorie[] }>(`/routes/${routeId}`);
      setTrasa(t);
      const e = await api.get<Prihlaska[]>(`/routes/${routeId}/entries`);
      setEntries(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba načítání");
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

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

  async function createEntry() {
    if (!routeId || !cislo || !prijmeni.trim() || !jmeno.trim() || !kategorieId) {
      setError("Startovní číslo, jméno, příjmení a kategorie jsou povinné (F03).");
      return;
    }
    try {
      await api.post(`/routes/${routeId}/entries`, {
        startovniCislo: Number(cislo),
        prijmeni,
        jmeno,
        kategorieId,
      });
      setCislo("");
      setPrijmeni("");
      setJmeno("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba zápisu");
    }
  }

  async function importCsv(soubor: File) {
    if (!routeId) return;
    setError(null);
    setImportVysledek(null);
    try {
      const formData = new FormData();
      formData.append("soubor", soubor);
      const vysledek = await api.postForm<ImportEntriesResponseDto>(`/routes/${routeId}/entries/import`, formData);
      setImportVysledek(vysledek);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import se nezdařil");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!trasa) return <div style={{ padding: 24 }}>{error ?? "Načítám…"}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1>Startovní listina — {trasa.nazev}</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {trasa.kategorie.length === 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2>Nejdřív přidejte kategorii</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Kód, např. MAk" value={catKod} onChange={(e) => setCatKod(e.target.value)} style={inputStyle} />
            <input placeholder="Název, např. Muži A" value={catNazev} onChange={(e) => setCatNazev(e.target.value)} style={inputStyle} />
            <select value={catPohlavi} onChange={(e) => setCatPohlavi(e.target.value as Pohlavi)} style={inputStyle}>
              <option value={Pohlavi.M}>M</option>
              <option value={Pohlavi.Z}>Z</option>
            </select>
            <button onClick={createCategory} style={buttonStyle}>
              Přidat kategorii
            </button>
          </div>
        </section>
      )}

      {trasa.kategorie.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2>Zápis na místě</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Číslo" value={cislo} onChange={(e) => setCislo(e.target.value)} style={{ ...inputStyle, width: 80 }} />
            <input placeholder="Příjmení" value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} style={inputStyle} />
            <input placeholder="Jméno" value={jmeno} onChange={(e) => setJmeno(e.target.value)} style={inputStyle} />
            <select value={kategorieId} onChange={(e) => setKategorieId(e.target.value)} style={{ ...inputStyle, borderColor: kategorieId ? "var(--line)" : "var(--color-danger)" }}>
              <option value="">Kategorie (povinné)</option>
              {trasa.kategorie.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kod} — {k.nazev}
                </option>
              ))}
            </select>
            <button onClick={createEntry} style={buttonStyle}>
              Přidat do listiny
            </button>
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <label className="mono" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Import z CSV (sloupce: cislo, prijmeni, jmeno, kategorie, volitelně rocnik, pohlavi, klub)
            </label>
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
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td>{e.startovniCislo}</td>
                <td style={{ fontFamily: "var(--font-ui)" }}>
                  {e.prijmeni} {e.jmeno}
                </td>
                <td style={{ fontFamily: "var(--font-ui)" }}>{(e as Prihlaska & { kategorie?: Kategorie }).kategorie?.kod ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  background: "var(--navy-800)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontWeight: 600,
  cursor: "pointer",
};
