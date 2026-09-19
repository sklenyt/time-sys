import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { RegistrationInfoDto, RegistrationResponseDto } from "@depo/shared";
import { Pohlavi } from "@depo/shared";
import { api } from "../lib/api";

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
  const [oznamovaciEmail, setOznamovaciEmail] = useState("");

  useEffect(() => {
    if (!routeId) return;
    api
      .get<RegistrationInfoDto>(`/routes/${routeId}/register`)
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"));
  }, [routeId]);

  async function odeslat(e: React.FormEvent) {
    e.preventDefault();
    if (!routeId || !prijmeni.trim() || !jmeno.trim() || !kategorieId) {
      setError("Jméno, příjmení a kategorie jsou povinné.");
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
        email: email.trim() || undefined,
        telefon: telefon.trim() || undefined,
        nouzovyKontakt: nouzovyKontakt.trim() || undefined,
        zdravotniPoznamka: zdravotniPoznamka.trim() || undefined,
        oznamovaciEmail: oznamovaciEmail.trim() || undefined,
      });
      setHotovo(vysledek);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registrace se nezdařila");
    } finally {
      setOdesilam(false);
    }
  }

  if (!info) return <div style={{ padding: 24 }}>{error ?? "Načítám…"}</div>;

  if (hotovo) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontWeight: 800 }}>Registrace dokončena</h1>
        <p>
          {hotovo.jmeno} {hotovo.prijmeni}, vaše startovní číslo je:
        </p>
        <p className="mono" style={{ fontSize: 64, fontWeight: 800, color: "var(--tape-500)" }}>
          {hotovo.startovniCislo}
        </p>
      </div>
    );
  }

  if (!info.otevrena) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontWeight: 800 }}>{info.udalostNazev}</h1>
        <p style={{ color: "var(--text-secondary)" }}>Registrace na trasu „{info.trasaNazev}" je bohužel uzavřená.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 800 }}>{info.udalostNazev}</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: -8 }}>Registrace na trasu „{info.trasaNazev}"</p>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      <form onSubmit={odeslat} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="Jméno" value={jmeno} onChange={(e) => setJmeno(e.target.value)} required style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input placeholder="Příjmení" value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} required style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="Ročník narození" value={rocnik} onChange={(e) => setRocnik(e.target.value)} style={{ ...inputStyle, width: 140 }} />
          <select value={pohlavi} onChange={(e) => setPohlavi(e.target.value as Pohlavi)} style={{ ...inputStyle, width: 100 }}>
            <option value="">Pohlaví</option>
            <option value={Pohlavi.M}>M</option>
            <option value={Pohlavi.Z}>Ž</option>
          </select>
          <select value={kategorieId} onChange={(e) => setKategorieId(e.target.value)} required style={{ ...inputStyle, flex: 1, minWidth: 160 }}>
            <option value="">Kategorie (povinné)</option>
            {info.kategorie.map((k) => (
              <option key={k.id} value={k.id}>
                {k.kod} — {k.nazev}
              </option>
            ))}
          </select>
        </div>
        <input placeholder="Klub (volitelné)" value={klub} onChange={(e) => setKlub(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <input placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        </div>
        <input
          placeholder="Nouzový kontakt (jméno + telefon)"
          value={nouzovyKontakt}
          onChange={(e) => setNouzovyKontakt(e.target.value)}
          style={inputStyle}
        />
        <textarea
          placeholder="Zdravotní poznámka (alergie, léky…) — volitelné"
          value={zdravotniPoznamka}
          onChange={(e) => setZdravotniPoznamka(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
        <input
          placeholder="E-mail pro oznámení o doběhu (volitelné, F32)"
          type="email"
          value={oznamovaciEmail}
          onChange={(e) => setOznamovaciEmail(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" disabled={odesilam} style={buttonStyle}>
          {odesilam ? "Odesílám…" : "Registrovat se"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
  width: "100%",
};

const buttonStyle: React.CSSProperties = {
  background: "var(--navy-800)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "12px 16px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};
