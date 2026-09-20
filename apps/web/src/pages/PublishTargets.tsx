import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { PublikacniCil, PublishExportResponseDto, PublishTestResponseDto } from "@depo/shared";
import { ProtokolPublikace } from "@depo/shared";
import { api } from "../lib/api";
import { AppShell } from "../components/AppShell";

export function PublishTargets() {
  const { eventId } = useParams<{ eventId: string }>();
  const [cile, setCile] = useState<PublikacniCil[]>([]);
  const [protokol, setProtokol] = useState<ProtokolPublikace>(ProtokolPublikace.SFTP);
  const [server, setServer] = useState("");
  const [port, setPort] = useState("22");
  const [cesta, setCesta] = useState("/");
  const [uzivatel, setUzivatel] = useState("");
  const [heslo, setHeslo] = useState("");
  const [intervalMinut, setIntervalMinut] = useState("5");
  const [zpravy, setZpravy] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!eventId) return;
    try {
      const data = await api.get<PublikacniCil[]>(`/events/${eventId}/publish-targets`);
      setCile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba načítání");
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function createCil() {
    if (!eventId || !server.trim() || !uzivatel.trim() || !heslo.trim()) {
      setError("Server, uživatel a heslo jsou povinné.");
      return;
    }
    try {
      await api.post(`/events/${eventId}/publish-targets`, {
        protokol,
        server,
        port: Number(port),
        cesta,
        uzivatel,
        heslo,
        intervalMinut: Number(intervalMinut),
        exportPoKazdemZaznamu: true,
      });
      setServer("");
      setUzivatel("");
      setHeslo("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Založení se nezdařilo");
    }
  }

  async function testCil(id: string) {
    const vysledek = await api.post<PublishTestResponseDto>(`/publish-targets/${id}/test`, {});
    setZpravy((z) => ({ ...z, [id]: vysledek.ok ? `OK — ${vysledek.zprava}` : `Chyba — ${vysledek.zprava}` }));
  }

  async function exportNyni(id: string) {
    const vysledek = await api.post<PublishExportResponseDto>(`/publish-targets/${id}/export-now`, {});
    setZpravy((z) => ({ ...z, [id]: `Export: ${vysledek.stav}` }));
    reload();
  }

  async function smazatCil(id: string) {
    if (!window.confirm("Opravdu smazat tento publikační cíl?")) return;
    try {
      await api.del(`/publish-targets/${id}`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Smazání se nezdařilo");
    }
  }

  return (
    <AppShell active="publikace" eventId={eventId}>
      <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontWeight: 800, fontSize: 22 }}>Publikace výsledků (FTP/SFTP)</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <section className="dash-card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Nový publikační cíl</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={protokol} onChange={(e) => setProtokol(e.target.value as ProtokolPublikace)} style={inputStyle}>
            <option value={ProtokolPublikace.SFTP}>SFTP</option>
            <option value={ProtokolPublikace.FTPS}>FTPS</option>
            <option value={ProtokolPublikace.FTP}>FTP</option>
          </select>
          <input placeholder="Server" value={server} onChange={(e) => setServer(e.target.value)} style={inputStyle} />
          <input placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} style={{ ...inputStyle, width: 70 }} />
          <input placeholder="Cesta, např. /" value={cesta} onChange={(e) => setCesta(e.target.value)} style={inputStyle} />
          <input placeholder="Uživatel" value={uzivatel} onChange={(e) => setUzivatel(e.target.value)} style={inputStyle} />
          <input placeholder="Heslo" type="password" value={heslo} onChange={(e) => setHeslo(e.target.value)} style={inputStyle} />
          <input placeholder="Interval (min)" value={intervalMinut} onChange={(e) => setIntervalMinut(e.target.value)} style={{ ...inputStyle, width: 110 }} />
          <button onClick={createCil} className="btn-pill primary">
            Přidat cíl
          </button>
        </div>
      </section>

      {cile.map((c) => (
        <article key={c.id} className="dash-card" style={{ marginBottom: 12 }}>
          <p className="mono" style={{ margin: "0 0 4px", fontWeight: 700 }}>
            {c.protokol}://{c.uzivatel}@{c.server}:{c.port}{c.cesta}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-secondary)" }}>
            Interval {c.intervalMinut} min · poslední export:{" "}
            {c.posledniExportAt ? `${new Date(c.posledniExportAt).toLocaleString("cs-CZ")} (${c.posledniExportStav})` : "zatím žádný"}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => testCil(c.id)} className="btn-pill">
              Otestovat připojení
            </button>
            <button onClick={() => exportNyni(c.id)} className="btn-pill">
              Exportovat teď
            </button>
            <button onClick={() => smazatCil(c.id)} className="btn-pill danger">
              Smazat
            </button>
          </div>
          {zpravy[c.id] && <p className="mono" style={{ fontSize: 12, marginTop: 8 }}>{zpravy[c.id]}</p>}
        </article>
      ))}
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
