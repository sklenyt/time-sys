import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { PublikacniCil, PublishExportResponseDto, PublishTestResponseDto, Trasa } from "@depo/shared";
import { ProtokolPublikace, StavExportu } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

export function PublishTargets() {
  const { eventId } = useParams<{ eventId: string }>();
  const [cile, setCile] = useState<PublikacniCil[]>([]);
  const [trasy, setTrasy] = useState<Trasa[]>([]);
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
      const routes = await api.get<Trasa[]>(`/events/${eventId}/routes`);
      setTrasy(routes);
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba načítání"));
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
      setError(chybaZeServeru(e, "Založení se nezdařilo"));
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
      setError(chybaZeServeru(e, "Smazání se nezdařilo"));
    }
  }

  const prvniTrasa = trasy.find((t) => !t.dokoncena) ?? trasy[0];

  return (
    <AppShell active="publikace" routeId={prvniTrasa?.id} eventId={eventId}>
      <div style={{ maxWidth: 1500 }}>
        <HlavickaStranky titulek="Publikace výsledků" popis="Automatický export výsledků na váš web přes FTP, FTPS nebo SFTP" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <Souhrn
          polozky={[
            { hodnota: cile.length, popisek: "Publikačních cílů" },
            {
              hodnota: cile.filter((c) => c.posledniExportStav === StavExportu.OK).length,
              popisek: "Poslední export v pořádku",
              zvyrazneni: "ok",
            },
            {
              hodnota: cile.filter((c) => c.posledniExportStav && c.posledniExportStav !== StavExportu.OK).length,
              popisek: "Poslední export s chybou",
              zvyrazneni: cile.some((c) => c.posledniExportStav && c.posledniExportStav !== StavExportu.OK) ? "pozor" : undefined,
            },
          ]}
        />

        <section className="sl-karta" style={{ padding: "16px 18px", marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 12px" }}>Nový publikační cíl</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={protokol} onChange={(e) => setProtokol(e.target.value as ProtokolPublikace)} style={inputStyle}>
              <option value={ProtokolPublikace.SFTP}>SFTP</option>
              <option value={ProtokolPublikace.FTPS}>FTPS</option>
              <option value={ProtokolPublikace.FTP}>FTP</option>
            </select>
            <input placeholder="Server" value={server} onChange={(e) => setServer(e.target.value)} style={inputStyle} />
            <input placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} style={{ ...inputStyle, width: 80 }} />
            <input placeholder="Cesta, např. /" value={cesta} onChange={(e) => setCesta(e.target.value)} style={inputStyle} />
            <input placeholder="Uživatel" value={uzivatel} onChange={(e) => setUzivatel(e.target.value)} style={inputStyle} />
            <input placeholder="Heslo" type="password" value={heslo} onChange={(e) => setHeslo(e.target.value)} style={inputStyle} />
            <input placeholder="Interval (min)" value={intervalMinut} onChange={(e) => setIntervalMinut(e.target.value)} style={{ ...inputStyle, width: 120 }} />
            <button onClick={createCil} className="btn-pill primary">
              Přidat cíl
            </button>
          </div>
        </section>

        <TabulkaKarta>
          <thead>
            <tr>
              <th>Cíl</th>
              <th>Interval</th>
              <th>Poslední export</th>
              <th>Stav</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cile.map((c) => (
              <tr key={c.id} className="sl-radek" style={{ verticalAlign: "top" }}>
                <td>
                  <div className="mono" style={{ fontWeight: 700, wordBreak: "break-all" }}>
                    {c.protokol}://{c.uzivatel}@{c.server}:{c.port}
                    {c.cesta}
                  </div>
                  {zpravy[c.id] && <div className="mono sl-podtitul" style={{ marginTop: 4 }}>{zpravy[c.id]}</div>}
                </td>
                <td>{c.intervalMinut} min</td>
                <td className="sl-podtitul">{c.posledniExportAt ? new Date(c.posledniExportAt).toLocaleString("cs-CZ") : "zatím žádný"}</td>
                <td>
                  {c.posledniExportStav ? (
                    <span className={`stitek ${c.posledniExportStav === StavExportu.OK ? "stitek-ok" : "stitek-chyba"}`}>
                      {c.posledniExportStav === StavExportu.OK ? "OK" : "chyba"}
                    </span>
                  ) : (
                    <span className="stitek stitek-neutralni">nespuštěno</span>
                  )}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => testCil(c.id)} className="btn-pill" style={{ marginRight: 6 }}>
                    Otestovat připojení
                  </button>
                  <button onClick={() => exportNyni(c.id)} className="btn-pill" style={{ marginRight: 6 }}>
                    Exportovat teď
                  </button>
                  <button onClick={() => smazatCil(c.id)} className="btn-pill danger">
                    Smazat
                  </button>
                </td>
              </tr>
            ))}
            {cile.length === 0 && <PrazdnyRadek sloupcu={5} text="Zatím žádný publikační cíl." />}
          </tbody>
        </TabulkaKarta>
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
