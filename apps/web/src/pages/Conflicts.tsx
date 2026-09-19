import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ConflictItemDto } from "@depo/shared";
import { api } from "../lib/api";

export function Conflicts() {
  const { routeId } = useParams<{ routeId: string }>();
  const [konflikty, setKonflikty] = useState<ConflictItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  async function potvrdit(zaznamId: string) {
    if (!routeId) return;
    try {
      await api.patch(`/routes/${routeId}/records/${zaznamId}/resolve`, {});
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Potvrzení se nezdařilo");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 800 }}>Kolize stanovišť</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
        Dvě zařízení nezávisle zaznamenala doběh stejného startovního čísla ve velmi blízkém čase (F15,
        03-architecture.md §3.5). Nic se nezahodilo — oba záznamy zůstávají v historii, jen je potřeba
        potvrdit, že jde o legitimní situaci (např. druhé kolo z jiného stanoviště), ne omyl.
      </p>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {konflikty.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Žádné nevyřešené kolize.</p>}

      {konflikty.map((k) => (
        <article
          key={k.id}
          style={{
            border: "1px solid var(--color-attention)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            marginBottom: 12,
            background: "var(--surface)",
          }}
        >
          <p className="mono" style={{ margin: "0 0 4px", fontWeight: 700 }}>
            Č. {k.startovniCislo ?? "?"} {k.prijmeni ? `— ${k.prijmeni} ${k.jmeno}` : ""}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-secondary)" }}>
            Zaznamenáno {new Date(k.cas).toLocaleString("cs-CZ")} · zařízení{" "}
            <span className="mono">{k.zarizeniId.slice(0, 8)}</span>
          </p>
          <button
            onClick={() => potvrdit(k.id)}
            style={{
              background: "var(--navy-800)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Potvrdit — vyřešeno
          </button>
        </article>
      ))}
    </div>
  );
}
