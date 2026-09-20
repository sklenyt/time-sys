import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ConflictItemDto } from "@depo/shared";
import { api, API_BASE, getTokens } from "../lib/api";
import { AppShell } from "../components/AppShell";

export function Conflicts() {
  const { routeId } = useParams<{ routeId: string }>();
  const [konflikty, setKonflikty] = useState<ConflictItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    if (!routeId) return;
    api
      .get<ConflictItemDto[]>(`/routes/${routeId}/records/conflicts`)
      .then(setKonflikty)
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"));
  }, [routeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // GET .../foto vyžaduje Bearer token, takže <img src> nejde použít přímo —
  // stáhne se jako blob a vytvoří dočasná object URL (F41).
  useEffect(() => {
    if (!routeId) return;
    let zrusen = false;
    const noveUrls: Record<string, string> = {};
    (async () => {
      for (const k of konflikty) {
        if (!k.maFotodukaz || fotoUrls[k.id]) continue;
        try {
          const { accessToken } = getTokens();
          const res = await fetch(`${API_BASE}/routes/${routeId}/records/${k.id}/foto`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          });
          if (!res.ok) continue;
          const blob = await res.blob();
          noveUrls[k.id] = URL.createObjectURL(blob);
        } catch {
          // fotodůkaz je jen doplněk — chyba stažení náhledu nesmí shodit stránku
        }
      }
      if (!zrusen && Object.keys(noveUrls).length > 0) {
        setFotoUrls((prev) => ({ ...prev, ...noveUrls }));
      }
    })();
    return () => {
      zrusen = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [konflikty, routeId]);

  async function potvrdit(zaznamId: string) {
    if (!routeId) return;
    try {
      await api.patch(`/routes/${routeId}/records/${zaznamId}/resolve`, {});
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Potvrzení se nezdařilo");
    }
  }

  async function nahratFoto(zaznamId: string, soubor: File) {
    if (!routeId) return;
    try {
      const formData = new FormData();
      formData.append("foto", soubor);
      await api.postForm(`/routes/${routeId}/records/${zaznamId}/foto`, formData);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nahrání fotodůkazu se nezdařilo");
    }
  }

  return (
    <AppShell active="kolize" routeId={routeId}>
      <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontWeight: 800, fontSize: 22 }}>Kolize stanovišť</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
        Dvě zařízení nezávisle zaznamenala doběh stejného startovního čísla ve velmi blízkém čase. Nic se
        nezahodilo — oba záznamy zůstávají v historii, jen je potřeba potvrdit, že jde o legitimní situaci
        (např. druhé kolo z jiného stanoviště), ne omyl.
      </p>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {konflikty.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Žádné nevyřešené kolize.</p>}

      {konflikty.map((k) => (
        <article
          key={k.id}
          style={{
            border: "1px solid #f1dcb0",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            marginBottom: 12,
            background: "#fffaf1",
          }}
        >
          <p className="mono" style={{ margin: "0 0 4px", fontWeight: 700 }}>
            Č. {k.startovniCislo ?? "?"} {k.prijmeni ? `— ${k.prijmeni} ${k.jmeno}` : ""}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-secondary)" }}>
            Zaznamenáno {new Date(k.cas).toLocaleString("cs-CZ")} · zařízení{" "}
            <span className="mono">{k.zarizeniId.slice(0, 8)}</span>
          </p>

          {fotoUrls[k.id] && (
            <img
              src={fotoUrls[k.id]}
              alt="Fotodůkaz doběhu"
              style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 8, marginBottom: 8, display: "block" }}
            />
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => potvrdit(k.id)} className="btn-pill primary">
              Potvrdit — vyřešeno
            </button>

            <label className="btn-pill" style={{ cursor: "pointer" }}>
              {k.maFotodukaz ? "Nahradit fotodůkaz" : "Přidat fotodůkaz"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const soubor = e.target.files?.[0];
                  if (soubor) nahratFoto(k.id, soubor);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </article>
      ))}
      </div>
    </AppShell>
  );
}
