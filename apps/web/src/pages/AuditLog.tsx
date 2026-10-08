import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AuditLogPolozka } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

export function AuditLog() {
  const { routeId } = useParams<{ routeId: string }>();
  const [polozky, setPolozky] = useState<AuditLogPolozka[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [od, setOd] = useState("");
  const [doData, setDoData] = useState("");
  const [uzivatel, setUzivatel] = useState("");

  const reload = useCallback(() => {
    if (!routeId) return;
    const params = new URLSearchParams();
    if (od) params.set("od", new Date(od).toISOString());
    if (doData) params.set("do", new Date(doData).toISOString());
    const qs = params.toString();
    api
      .get<AuditLogPolozka[]>(`/routes/${routeId}/audit-log${qs ? `?${qs}` : ""}`)
      .then(setPolozky)
      .catch((e) => setError(chybaZeServeru(e, "Chyba načítání")));
  }, [routeId, od, doData]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtrovane = uzivatel
    ? polozky.filter((p) => (p.uzivatelJmeno ?? "").toLowerCase().includes(uzivatel.toLowerCase()) || (p.uzivatelEmail ?? "").toLowerCase().includes(uzivatel.toLowerCase()))
    : polozky;

  return (
    <AppShell active="audit" routeId={routeId}>
      <div style={{ maxWidth: 1500 }}>
        <HlavickaStranky titulek="Auditní log" popis="Kdo a kdy co změnil na této trati" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <Souhrn polozky={[{ hodnota: filtrovane.length, popisek: "Záznamů" }]} />

        <div className="sl-nastroje">
          <input type="date" value={od} onChange={(e) => setOd(e.target.value)} className="sl-hledani" style={{ minWidth: 0 }} aria-label="Od data" />
          <input type="date" value={doData} onChange={(e) => setDoData(e.target.value)} className="sl-hledani" style={{ minWidth: 0 }} aria-label="Do data" />
          <input
            type="search"
            placeholder="Filtr podle uživatele (jméno nebo e-mail)"
            value={uzivatel}
            onChange={(e) => setUzivatel(e.target.value)}
            className="sl-hledani"
            style={{ minWidth: 280 }}
          />
        </div>

        <TabulkaKarta>
          <thead>
            <tr>
              <th>Čas</th>
              <th>Uživatel</th>
              <th>Změna</th>
            </tr>
          </thead>
          <tbody>
            {filtrovane.map((p) => (
              <tr key={p.id} className="sl-radek" style={{ verticalAlign: "top" }}>
                <td style={{ whiteSpace: "nowrap" }}>{new Date(p.cas).toLocaleString("cs-CZ")}</td>
                <td style={{ fontWeight: 700 }}>{p.uzivatelJmeno ?? p.uzivatelEmail ?? "—"}</td>
                <td>
                  <Diff puvodni={p.puvodniHodnota} novy={p.novaHodnota} />
                </td>
              </tr>
            ))}
            {filtrovane.length === 0 && <PrazdnyRadek sloupcu={3} text="Žádné záznamy." />}
          </tbody>
        </TabulkaKarta>
      </div>
    </AppShell>
  );
}

function Diff({ puvodni, novy }: { puvodni: Record<string, unknown> | null; novy: Record<string, unknown> | null }) {
  const klice = Array.from(new Set([...(puvodni ? Object.keys(puvodni) : []), ...(novy ? Object.keys(novy) : [])]));
  if (klice.length === 0) return <span style={{ color: "var(--text-secondary)" }}>—</span>;
  return (
    <>
      {klice.map((klic) => {
        const stara = puvodni?.[klic];
        const nova = novy?.[klic];
        const zmeneno = JSON.stringify(stara) !== JSON.stringify(nova);
        return (
          <div key={klic} style={{ fontSize: 12 }}>
            <span style={{ color: "var(--text-secondary)" }}>{klic}: </span>
            {zmeneno ? (
              <>
                <span style={{ textDecoration: "line-through", color: "var(--color-danger)", background: "#fdf1f0", borderRadius: 4, padding: "1px 4px" }}>
                  {String(stara ?? "—")}
                </span>{" "}
                <span style={{ color: "var(--color-live)", background: "#e6f7f0", borderRadius: 4, padding: "1px 4px", marginLeft: 4 }}>
                  {String(nova ?? "—")}
                </span>
              </>
            ) : (
              <span>{String(nova ?? stara ?? "—")}</span>
            )}
          </div>
        );
      })}
    </>
  );
}
