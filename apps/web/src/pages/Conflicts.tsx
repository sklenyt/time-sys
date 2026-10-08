import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ConflictItemDto } from "@depo/shared";
import { api, API_BASE, getTokens } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

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
      .catch((e) => setError(chybaZeServeru(e, "Chyba načítání")));
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
      setError(chybaZeServeru(e, "Potvrzení se nezdařilo"));
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
      setError(chybaZeServeru(e, "Nahrání fotodůkazu se nezdařilo"));
    }
  }

  return (
    <AppShell active="kolize" routeId={routeId}>
      <div style={{ maxWidth: 1500 }}>
        <HlavickaStranky
          titulek="Kolize stanovišť"
          popis="Dvě zařízení zaznamenala doběh stejného čísla ve velmi blízkém čase"
        />
        <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 16px", maxWidth: 820 }}>
          Nic se nezahodilo, oba záznamy zůstávají v historii. Je potřeba jen potvrdit, že jde o legitimní situaci
          (např. druhé kolo z jiného stanoviště), a ne o omyl.
        </p>
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <Souhrn
          polozky={[{ hodnota: konflikty.length, popisek: "Nevyřešených kolizí", zvyrazneni: konflikty.length > 0 ? "pozor" : "ok" }]}
        />

        <TabulkaKarta>
          <thead>
            <tr>
              <th>Č.</th>
              <th>Závodník</th>
              <th>Zaznamenáno</th>
              <th>Zařízení</th>
              <th>Fotodůkaz</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {konflikty.map((k) => (
              <tr key={k.id} className="sl-radek">
                <td className="sl-cislo">{k.startovniCislo ?? "?"}</td>
                <td style={{ fontWeight: 700 }}>{k.prijmeni ? `${k.prijmeni} ${k.jmeno}` : "—"}</td>
                <td>{new Date(k.cas).toLocaleString("cs-CZ")}</td>
                <td className="mono">{k.zarizeniId.slice(0, 8)}</td>
                <td>
                  {fotoUrls[k.id] ? (
                    <img src={fotoUrls[k.id]} alt="Fotodůkaz doběhu" style={{ maxWidth: 140, maxHeight: 90, borderRadius: 6, display: "block", marginBottom: 6 }} />
                  ) : null}
                  <label className="btn-pill" style={{ cursor: "pointer", padding: "3px 10px", fontSize: 11.5 }}>
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
                </td>
                <td style={{ textAlign: "right" }}>
                  <button onClick={() => potvrdit(k.id)} className="btn-pill primary">
                    Potvrdit, vyřešeno
                  </button>
                </td>
              </tr>
            ))}
            {konflikty.length === 0 && <PrazdnyRadek sloupcu={6} text="Žádné nevyřešené kolize." />}
          </tbody>
        </TabulkaKarta>
      </div>
    </AppShell>
  );
}
