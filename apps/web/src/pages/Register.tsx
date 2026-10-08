import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { RegistrationInfoDto, RegistrationResponseDto } from "@depo/shared";
import { Pohlavi } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { PatickaCopyright } from "../components/PatickaCopyright";
import { PublicHeader } from "../components/PublicHeader";

/**
 * Vlastní veřejný registrační formulář (F23, Fáze 4) — bez přihlášení,
 * napojený přímo na startovní listinu. Startovní číslo se přiřadí
 * automaticky, uživatel si ho nevolí (viz PublicRegisterDto na API).
 */
export function Register() {
  const { routeId } = useParams<{ routeId: string }>();
  const [info, setInfo] = useState<RegistrationInfoDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState<RegistrationResponseDto | null>(null);
  const [odesilam, setOdesilam] = useState(false);

  const [prijmeni, setPrijmeni] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [rocnik, setRocnik] = useState("");
  const [pohlavi, setPohlavi] = useState<Pohlavi | "">("");
  const [klub, setKlub] = useState("");
  const [kategorieId, setKategorieId] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [nouzovyKontakt, setNouzovyKontakt] = useState("");
  const [zdravotniPoznamka, setZdravotniPoznamka] = useState("");
  const [souhlas, setSouhlas] = useState(false);

  useEffect(() => {
    if (!routeId) return;
    api
      .get<RegistrationInfoDto>(`/routes/${routeId}/register`)
      .then(setInfo)
      .catch((e) => setError(chybaZeServeru(e, "Chyba načítání")));
  }, [routeId]);

  async function odeslat(e: React.FormEvent) {
    e.preventDefault();
    if (!routeId || !prijmeni.trim() || !jmeno.trim() || !kategorieId || !rocnik || !pohlavi || !email.trim() || !telefon.trim()) {
      setError("Jméno, příjmení, ročník, pohlaví, kategorie, e-mail a telefon jsou povinné.");
      return;
    }
    if (!souhlas) {
      setError("Pro registraci je nutný souhlas se zpracováním osobních údajů.");
      return;
    }
    setOdesilam(true);
    setError(null);
    try {
      const vysledek = await api.post<RegistrationResponseDto>(`/routes/${routeId}/register`, {
        prijmeni: prijmeni.trim(),
        jmeno: jmeno.trim(),
        rocnik: rocnik ? Number(rocnik) : undefined,
        pohlavi: pohlavi || undefined,
        klub: klub.trim() || undefined,
        kategorieId,
        email: email.trim(),
        telefon: telefon.trim(),
        nouzovyKontakt: nouzovyKontakt.trim() || undefined,
        zdravotniPoznamka: zdravotniPoznamka.trim() || undefined,
        souhlasSeZpracovanim: souhlas,
      });
      setHotovo(vysledek);
    } catch (e) {
      setError(chybaZeServeru(e, "Registrace se nezdařila"));
    } finally {
      setOdesilam(false);
    }
  }

  if (!info) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <PublicHeader />
          {error ?? "Načítám…"}
        </div>
      </div>
    );
  }

  if (hotovo) {
    return (
      <div style={pageStyle}>
        <div className="dash-card" style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          <PublicHeader />
          <h1 style={{ fontWeight: 800, fontSize: 22 }}>Registrace přijata</h1>
          <p>
            {hotovo.jmeno} {hotovo.prijmeni}, vaše registrace čeká na potvrzení organizátorem.
          </p>
          <p style={{ color: "var(--text-secondary)" }}>
            Startovní číslo vám přidělí organizátor ručně. Potvrzení registrace jsme vám poslali na e-mail. Pokud ho
            nevidíte, zkontrolujte prosím i složku <strong>Spam</strong> (nevyžádaná pošta).
          </p>
        </div>
      </div>
    );
  }

  if (!info.otevrena) {
    return (
      <div style={pageStyle}>
        <div className="dash-card" style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          <PublicHeader />
          <h1 style={{ fontWeight: 800, fontSize: 22 }}>{info.udalostNazev}</h1>
          <p style={{ color: "var(--text-secondary)" }}>Registrace na trasu „{info.trasaNazev}" je bohužel uzavřená.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div className="dash-card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <PublicHeader tagline="závodní časomíra" />
        <h1 style={{ fontWeight: 800, fontSize: 22 }}>{info.udalostNazev}</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: -8 }}>Registrace na trasu „{info.trasaNazev}"</p>
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <form onSubmit={odeslat} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="Jméno *" value={jmeno} onChange={(e) => setJmeno(e.target.value)} required style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input placeholder="Příjmení *" value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} required style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="Ročník narození *" inputMode="numeric" pattern="(19|20)[0-9]{2}" title="Čtyřmístný rok, např. 1990" required value={rocnik} onChange={(e) => setRocnik(e.target.value)} style={{ ...inputStyle, width: 140 }} />
          <select value={pohlavi} onChange={(e) => setPohlavi(e.target.value as Pohlavi)} required style={{ ...inputStyle, width: 100 }}>
            <option value="">Pohlaví *</option>
            <option value={Pohlavi.M}>M</option>
            <option value={Pohlavi.Z}>Ž</option>
          </select>
          <select value={kategorieId} onChange={(e) => setKategorieId(e.target.value)} required style={{ ...inputStyle, flex: 1, minWidth: 160 }}>
            <option value="">Kategorie *</option>
            {info.kategorie.map((k) => (
              <option key={k.id} value={k.id}>
                {k.kod} — {k.nazev}
              </option>
            ))}
          </select>
        </div>
        <input placeholder="Klub" value={klub} onChange={(e) => setKlub(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="E-mail *" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <input placeholder="Telefon *" type="tel" required value={telefon} onChange={(e) => setTelefon(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        </div>
        <input
          placeholder="Nouzový kontakt (jméno + telefon)"
          value={nouzovyKontakt}
          onChange={(e) => setNouzovyKontakt(e.target.value)}
          style={inputStyle}
        />
        <textarea
          placeholder="Zdravotní poznámka (alergie, léky…)"
          value={zdravotniPoznamka}
          onChange={(e) => setZdravotniPoznamka(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.4 }}>
          <input type="checkbox" required checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Souhlasím se zpracováním osobních údajů za účelem organizace závodu a zveřejnění výsledků (jméno, klub, kategorie, čas). Nouzový kontakt a zdravotní údaje, pokud je uvedu, slouží jen pro mou bezpečnost na trati. Podrobnosti v{" "}
            <a href="https://depotime.cz/zasady-ochrany-osobnich-udaju" target="_blank" rel="noreferrer">
              zásadách ochrany osobních údajů
            </a>
            . *
          </span>
        </label>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 2px" }}>* povinné údaje</p>
        <button type="submit" disabled={odesilam} className="btn-pill primary" style={{ padding: "12px 16px", fontSize: 15, justifyContent: "center" }}>
          {odesilam ? "Odesílám…" : "Registrovat se"}
        </button>
      </form>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, textAlign: "center", marginTop: 16, marginBottom: 0 }}>
        Registrace probíhá přes platformu Depo — závodní časomíra.
      </p>
      </div>
    <PatickaCopyright />
      </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  background: "var(--surface)",
  padding: "40px 16px",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
  width: "100%",
};
