import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AnomaliesResponseDto, RunningResponseDto } from "@depo/shared";
import { TypAnomalie } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { HlavickaStranky, PrazdnyRadek, Souhrn, TabulkaKarta } from "../components/StrankaPrvky";

export function Running() {
  const { routeId } = useParams<{ routeId: string }>();
  const [data, setData] = useState<RunningResponseDto | null>(null);
  const [anomalie, setAnomalie] = useState<AnomaliesResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    function load() {
      api
        .get<RunningResponseDto>(`/routes/${routeId}/running`)
        .then(setData)
        .catch((e) => setError(chybaZeServeru(e, "Chyba načítání")));
      api
        .get<AnomaliesResponseDto>(`/routes/${routeId}/anomalies`)
        .then(setAnomalie)
        .catch(() => {
          // Anomálie jsou jen doplňkové upozornění — chyba nesmí shodit hlavní přehled "Kdo běží".
        });
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [routeId]);

  if (!data) {
    return (
      <AppShell active="bezi" routeId={routeId}>
        {error ?? "Načítám…"}
      </AppShell>
    );
  }

  const jeVickolova = data.bezi.some((b) => b.pocetKol > 1);

  return (
    <AppShell active="bezi" routeId={routeId}>
      <div style={{ maxWidth: 1500 }}>
        <HlavickaStranky titulek="Kdo ještě běží" popis="Průběžně se obnovuje každých pár sekund" />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        <Souhrn
          polozky={[
            { hodnota: data.celkemPrihlasenych, popisek: "Přihlášeno" },
            { hodnota: data.dokonceniPocet, popisek: "V cíli", zvyrazneni: "ok" },
            { hodnota: data.bezi.length, popisek: "Na trati" },
            { hodnota: data.neukonceniPocet, popisek: "DNS / DNF / DQ", zvyrazneni: data.neukonceniPocet > 0 ? "pozor" : undefined },
          ]}
        />

        <TabulkaKarta>
          <thead>
            <tr>
              <th>Č.</th>
              <th>Závodník</th>
              <th>Kat.</th>
              {jeVickolova && <th>Kolo</th>}
              <th>Čas na trati</th>
            </tr>
          </thead>
          <tbody>
            {data.bezi.map((b) => (
              <tr key={b.prihlaskaId} className="sl-radek">
                <td className="sl-cislo">{b.startovniCislo}</td>
                <td style={{ fontWeight: 700 }}>
                  {b.prijmeni} {b.jmeno}
                </td>
                <td className="mono">{b.kategorieKod}</td>
                {jeVickolova && <td>{b.pocetKol > 1 ? `${b.aktualniKolo}/${b.pocetKol}` : "—"}</td>}
                <td className="mono" style={{ fontWeight: 700 }}>
                  {b.casOdStartu}
                </td>
              </tr>
            ))}
            {data.bezi.length === 0 && <PrazdnyRadek sloupcu={jeVickolova ? 5 : 4} text="Nikdo aktuálně neběží." />}
          </tbody>
        </TabulkaKarta>

        {anomalie && anomalie.polozky.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>Podezřelé časy</h2>
              <span className="stitek stitek-varovani">{anomalie.polozky.length}</span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 12px" }}>
              Výrazná odchylka od mediánu ostatních běžců ve stejné kategorii, nebo (je-li u tratě zadaná délka)
              nereálně rychlý čas vzhledem k délce tratě. Může jít o chybu záznamu, zkrácení trati nebo nouzovou
              situaci na trati.
            </p>
            <TabulkaKarta>
              <thead>
                <tr>
                  <th>Č.</th>
                  <th>Závodník</th>
                  <th>Kat.</th>
                  <th>Problém</th>
                  <th>Čas</th>
                </tr>
              </thead>
              <tbody>
                {anomalie.polozky.map((a, i) => (
                  <tr key={i} className="sl-radek">
                    <td className="sl-cislo">{a.startovniCislo}</td>
                    <td style={{ fontWeight: 700 }}>
                      {a.prijmeni} {a.jmeno}
                    </td>
                    <td className="mono">{a.kategorieKod}</td>
                    <td>
                      <span className="stitek stitek-varovani">
                        {a.typAnomalie === TypAnomalie.NEREALNE_TEMPO
                          ? "nereálně rychlý čas"
                          : `${a.typAnomalie === TypAnomalie.PRILIS_RYCHLY ? "podezřele rychlý" : "podezřele pomalý"} ${a.typUdalosti === "MEZICAS" ? "mezičas" : "cílový čas"}`}
                      </span>
                    </td>
                    <td className="mono">
                      {a.cas}
                      {a.typAnomalie !== TypAnomalie.NEREALNE_TEMPO && (
                        <span className="sl-podtitul"> (medián {Math.round(a.medianKategorieMs / 1000 / 60)} min)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TabulkaKarta>
          </section>
        )}
      </div>
    </AppShell>
  );
}
