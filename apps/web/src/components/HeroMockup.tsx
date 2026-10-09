const RADKY: { cislo: string; jmeno: string; kategorie: string; stav: "zaplaceno" | "ceka" | "cislo" }[] = [
  { cislo: "101", jmeno: "Novák Jan", kategorie: "M30", stav: "zaplaceno" },
  { cislo: "102", jmeno: "Svobodová Eva", kategorie: "Ž30", stav: "zaplaceno" },
  { cislo: "—", jmeno: "Dvořák Petr", kategorie: "M40", stav: "cislo" },
  { cislo: "104", jmeno: "Černá Lucie", kategorie: "Ž20", stav: "zaplaceno" },
];

const STAV: Record<string, string> = { zaplaceno: "zaplaceno", ceka: "čeká na platbu", cislo: "bez čísla" };

const VYSLEDKY = [
  { poradi: "1.", jmeno: "Novák", cas: "41:07" },
  { poradi: "2.", jmeno: "Černá", cas: "41:52" },
  { poradi: "3.", jmeno: "Kříž", cas: "42:18" },
];

/** Složený obraz aplikace pro úvodní stránku: startovní listina, měření v cíli, živé výsledky a potvrzení platby. */
export function HeroMockup() {
  return (
    <div className="hero-mockup" role="img" aria-label="Ukázka aplikace Depo: startovní listina, zápis čísla v cíli, živé výsledky a potvrzení platby">
      <div className="hm-okno">
        <div className="hm-okno-hlavicka">
          <span className="hm-tecky">
            <i />
            <i />
            <i />
          </span>
          <span className="hm-titulek">Startovní listina · 20 km</span>
        </div>
        <div className="hm-souhrn">
          <div>
            <b>86</b>
            <span>přihlášených</span>
          </div>
          <div>
            <b className="ok">79</b>
            <span>zaplaceno</span>
          </div>
          <div>
            <b className="pozor">4</b>
            <span>k přidělení</span>
          </div>
        </div>
        <div className="hm-tabulka">
          {RADKY.map((r) => (
            <div key={r.jmeno} className="hm-radek">
              <span className={`hm-cislo${r.cislo === "—" ? " bez" : ""}`}>{r.cislo}</span>
              <span className="hm-jmeno">{r.jmeno}</span>
              <span className="hm-kat">{r.kategorie}</span>
              <span className={`hm-stav ${r.stav}`}>{STAV[r.stav]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hm-vysledky">
        <div className="hm-vysledky-hlavicka">
          <span className="hm-zive" />
          Živé výsledky
        </div>
        {VYSLEDKY.map((v) => (
          <div key={v.jmeno} className="hm-vysledek">
            <span>
              {v.poradi} {v.jmeno}
            </span>
            <span className="hm-cas">{v.cas}</span>
          </div>
        ))}
      </div>

      <div className="hm-telefon">
        <div className="hm-telefon-popisek">STARTOVNÍ ČÍSLO</div>
        <div className="hm-telefon-cislo">147</div>
        <div className="hm-klavesy">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
            <span key={k}>{k}</span>
          ))}
        </div>
        <div className="hm-zapsat">ZAPSAT</div>
        <div className="hm-offline">offline</div>
      </div>

      <div className="hm-toast">
        <b>Platba přijata</b>
        <span>e-mail odešel závodníkovi</span>
      </div>
    </div>
  );
}
