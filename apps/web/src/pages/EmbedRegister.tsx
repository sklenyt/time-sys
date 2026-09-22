import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { RegistrationInfoDto, RegistrationResponseDto } from "@depo/shared";
import { Pohlavi } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";

/**
 * Vložitelný registrační widget (F23 embed) — bezhlavá varianta
 * Register.tsx pro <iframe> na webu organizátora, stejný vzor jako
 * EmbedResults.tsx (F38). Na rozdíl od živých výsledků ale musí zůstat
 * viditelně označený jako Depo — je to registrace, ne jen data widget,
 * a organizátor chce, aby bylo poznat, kdo přihlášku obsluhuje.
 */
export function EmbedRegister() {
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
      .catch((e) => setError(chybaZeServeru(e, "Chyba načítání")));
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
      setError(chybaZeServeru(e, "Registrace se nezdařila"));
    } finally {
      setOdesilam(false);
    }
  }

  return (
    <div style={wrapStyle}>
      <EmbedBrandBar />

      {!info && !error && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Načítám…</p>}
      {!info && error && <p style={{ fontSize: 13, color: "var(--color-danger)" }}>{error}</p>}

      {info && hotovo && (
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontWeight: 800, fontSize: 19, margin: "0 0 4px" }}>Registrace dokončena</h1>
          <p style={{ fontSize: 13.5 }}>
            {hotovo.jmeno} {hotovo.prijmeni}, vaše startovní číslo je:
          </p>
          <p className="mono" style={{ fontSize: 48, fontWeight: 800, color: "var(--tape-500)", margin: "4px 0 0" }}>
            {hotovo.startovniCislo}
          </p>
        </div>
      )}

      {info && !hotovo && !info.otevrena && (
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontWeight: 800, fontSize: 19, margin: "0 0 4px" }}>{info.udalostNazev}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Registrace na trasu „{info.trasaNazev}" je bohužel uzavřená.
          </p>
        </div>
      )}

      {info && !hotovo && info.otevrena && (
        <>
          <h1 style={{ fontWeight: 800, fontSize: 19, margin: "0 0 2px" }}>{info.udalostNazev}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 14px" }}>
            Registrace na trasu „{info.trasaNazev}"
          </p>
          {error && <p style={{ color: "var(--color-danger)", fontSize: 13 }}>{error}</p>}

          <form onSubmit={odeslat} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              placeholder="E-mail pro oznámení o doběhu"
              type="email"
              value={oznamovaciEmail}
              onChange={(e) => setOznamovaciEmail(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" disabled={odesilam} className="btn-pill primary" style={{ padding: "12px 16px", fontSize: 15, justifyContent: "center" }}>
              {odesilam ? "Odesílám…" : "Registrovat se"}
            </button>
          </form>
        </>
      )}

      <p style={{ margin: "16px 0 0", fontSize: 10.5, color: "var(--text-secondary)", textAlign: "center" }}>
        Registrace přes{" "}
        <a href={API_BASE.replace(/\/api\/v1$/, "")} target="_blank" rel="noreferrer">
          Depo
        </a>
      </p>
    </div>
  );
}

/** Kompaktní brand lišta nahoře widgetu — organizátor chce, aby bylo vidět, kdo registraci obsluhuje. */
function EmbedBrandBar() {
  return (
    <a
      href={API_BASE.replace(/\/api\/v1$/, "")}
      target="_blank"
      rel="noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, textDecoration: "none" }}
    >
      <img src="/depo-mark.svg" alt="" width={18} height={18} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Depo</span>
    </a>
  );
}

const wrapStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  color: "var(--navy-800)",
  padding: 14,
  maxWidth: 480,
  boxSizing: "border-box",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};
