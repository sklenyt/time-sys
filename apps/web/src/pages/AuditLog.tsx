import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AuditLogPolozka } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";

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
      <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontWeight: 800, fontSize: 22 }}>Auditní log</h1>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input type="date" value={od} onChange={(e) => setOd(e.target.value)} style={inputStyle} />
        <input type="date" value={doData} onChange={(e) => setDoData(e.target.value)} style={inputStyle} />
        <input
          placeholder="Filtr podle uživatele (jméno/e-mail)"
          value={uzivatel}
          onChange={(e) => setUzivatel(e.target.value)}
          style={{ ...inputStyle, minWidth: 220 }}
        />
      </div>

      {filtrovane.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Žádné záznamy.</p>}

      <div className="table-scroll">
        <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
              <th style={{ fontFamily: "var(--font-ui)" }}>Čas</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Uživatel</th>
              <th style={{ fontFamily: "var(--font-ui)" }}>Změna</th>
            </tr>
          </thead>
          <tbody>
            {filtrovane.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>
                <td style={{ padding: "8px 4px", whiteSpace: "nowrap" }}>{new Date(p.cas).toLocaleString("cs-CZ")}</td>
                <td style={{ padding: "8px 4px", fontFamily: "var(--font-ui)" }}>{p.uzivatelJmeno ?? p.uzivatelEmail ?? "—"}</td>
                <td style={{ padding: "8px 4px", fontFamily: "var(--font-ui)" }}>
                  <Diff puvodni={p.puvodniHodnota} novy={p.novaHodnota} />
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

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};
