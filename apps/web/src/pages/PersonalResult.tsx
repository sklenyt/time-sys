import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { PersonalResultDto } from "@depo/shared";
import { api, ApiError, API_BASE } from "../lib/api";
import { PublicHeader } from "../components/PublicHeader";

/**
 * Osobní výsledek — cíl QR kódu na startovním čísle (F33/QR, viz
 * docs/12-rfid-a-doporuceni.md §12.6) — veřejné, bez přihlášení.
 */
export function PersonalResult() {
  const { routeId, prihlaskaId } = useParams<{ routeId: string; prihlaskaId: string }>();
  const [data, setData] = useState<PersonalResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId || !prihlaskaId) return;
    api
      .get<PersonalResultDto>(`/routes/${routeId}/results/bezec/${prihlaskaId}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Chyba načítání"));
  }, [routeId, prihlaskaId]);

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <PublicHeader />
          {error}
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <PublicHeader />
          Načítám…
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
    <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
      <div style={{ textAlign: "left" }}>
        <PublicHeader />
      </div>
      <p className="mono" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
        Startovní číslo {data.startovniCislo}
      </p>
      <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
        {data.prijmeni} {data.jmeno}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>{data.kategorieNazev}</p>

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          margin: "24px 0",
          background: "var(--paper)",
        }}
      >
        {data.casCelkem ? (
          <>
            <p className="mono" style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>
              {data.casCelkem}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              {data.poradiCelkove}. místo celkově &middot; {data.poradiKategorie}. místo v kategorii {data.kategorieKod}
            </p>
          </>
        ) : (
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>{data.stavUkonceni ?? "V cíli zatím ne"}</p>
        )}
        {data.mezicas && (
          <p className="mono" style={{ marginTop: 16, color: "var(--text-secondary)" }}>
            Mezičas: {data.mezicas}
          </p>
        )}
        {data.clenoveDruzstva && data.clenoveDruzstva.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-secondary)" }}>
              Družstvo
            </p>
            {data.clenoveDruzstva.map((c, i) => (
              <p key={i} style={{ margin: 0, fontSize: 14 }}>
                {c.prijmeni} {c.jmeno}
                {c.klub && <span style={{ color: "var(--text-secondary)" }}> — {c.klub}</span>}
              </p>
            ))}
          </div>
        )}
      </div>

      <img
        src={`${API_BASE}/routes/${routeId}/results/bezec/${prihlaskaId}/qr.png`}
        alt="QR kód s odkazem na tuto stránku"
        width={160}
        height={160}
        style={{ border: "1px solid var(--line)", borderRadius: 8 }}
      />
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>QR kód na startovním čísle vede sem</p>

      <p>
        <Link to={`/vysledky/${routeId}`}>Zpět na celkové výsledky</Link>
      </p>
    </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  background: "var(--surface)",
  padding: "40px 16px",
};
