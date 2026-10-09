import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  Cip,
  DruzstvoClen,
  ImportEntriesResponseDto,
  Kategorie,
  Prihlaska,
  RegistraceDto,
  Trasa,
  Udalost,
} from "@depo/shared";
import { Pohlavi, StavCipu, StavSkladuCipu, StavUkonceni, TypCipu } from "@depo/shared";
import type { CipSkladDto } from "@depo/shared";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";
import { AppShell } from "../components/AppShell";
import { BusyOverlay } from "../components/BusyOverlay";
import { RozbalovaciMenu } from "../components/RozbalovaciMenu";

/**
 * Trať bez aktivní (neukončené) akce nesmí tiše ukázat startovní listinu —
 * organizátor by tu jinak přes fallback poslední navštívené trati (viz
 * AppShell) mohl narazit na seznam přihlášených u dávno ukončeného závodu.
 * Místo listiny se nabídne výběr aktivní akce a trati, ať je vždy jasné,
 * s čím se právě pracuje.
 */
function VyberAktivniAkce() {
  const navigate = useNavigate();
  const [udalosti, setUdalosti] = useState<Udalost[] | null>(null);
  const [vybranaId, setVybranaId] = useState("");
  const [trasy, setTrasy] = useState<Trasa[] | null>(null);
  const [nacitamTrasy, setNacitamTrasy] = useState(false);

  useEffect(() => {
    api
      .get<Udalost[]>("/events")
      .then((vse) => setUdalosti(vse.filter((u) => !u.ukoncena)))
      .catch(() => setUdalosti([]));
  }, []);

  function vybratAkci(id: string) {
    setVybranaId(id);
    setTrasy(null);
    if (!id) return;
    setNacitamTrasy(true);
    api
      .get<Trasa[]>(`/events/${id}/routes`)
      .then(setTrasy)
      .catch(() => setTrasy([]))
      .finally(() => setNacitamTrasy(false));
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="dash-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Startovní listina</h1>
          <div className="meta mono">Vyberte aktivní akci</div>
        </div>
      </div>
      <section className="dash-card">
        <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginTop: 0 }}>
          Tahle trať patří k ukončené nebo neexistující akci, takže tu nejde vidět startovní listina — nejdřív
          vyberte, se kterou aktivní akcí chcete pracovat.
        </p>
        {udalosti === null && <p className="mono">Načítám…</p>}
        {udalosti?.length === 0 && (
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Zatím nemáte žádnou aktivní akci. <Link to="/sprava">Založte novou ve Správě akcí.</Link>
          </p>
        )}
        {udalosti && udalosti.length > 0 && (
          <>
            <select value={vybranaId} onChange={(e) => vybratAkci(e.target.value)} style={inputStyle}>
              <option value="">Vyberte akci…</option>
              {udalosti.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nazev}
                </option>
              ))}
            </select>
            {nacitamTrasy && (
              <p className="mono" style={{ fontSize: 13 }}>
                Načítám tratě…
              </p>
            )}
            {trasy && trasy.length === 0 && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>Tahle akce zatím nemá žádnou trať.</p>
            )}
            {trasy && trasy.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {trasy.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => navigate(`/startovni-listina/${t.id}`)}
                      className="btn-pill"
                      style={{ width: "100%" }}
                    >
                      {t.nazev}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

const CIP_STAV_LABEL: Record<StavCipu, string> = {
  [StavCipu.PRIREZEN]: "přiřazen",
  [StavCipu.ZALOZNI]: "záložní",
  [StavCipu.ZTRACEN]: "ztracen",
  [StavCipu.VRACEN]: "vrácen",
};

const CIP_STAV_BARVA: Record<StavCipu, string> = {
  [StavCipu.PRIREZEN]: "var(--color-live-700)",
  [StavCipu.ZALOZNI]: "var(--color-attention)",
  [StavCipu.ZTRACEN]: "var(--color-danger)",
  [StavCipu.VRACEN]: "var(--text-secondary)",
};

function ChipBunka({
  routeId,
  entry,
  onChanged,
}: {
  routeId: string;
  entry: Prihlaska & { cip?: Cip | null };
  onChanged: () => void;
}) {
  const [kod, setKod] = useState("");
  const [otevrene, setOtevrene] = useState(false);
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [volne, setVolne] = useState<string[] | null>(null);
  const [typ, setTyp] = useState<TypCipu>(TypCipu.OPAKOVANY);

  useEffect(() => {
    if (!otevrene || volne) return;
    api
      .get<CipSkladDto[]>(`/routes/${routeId}/chips/sklad`)
      .then((sklad) => setVolne(sklad.filter((c) => c.stav === StavSkladuCipu.SKLADEM).map((c) => c.kodCipu)))
      .catch(() => setVolne([]));
  }, [otevrene, volne, routeId]);

  const jeVeSkladu = !!volne?.some((k) => k.toLowerCase() === kod.trim().toLowerCase());

  async function parovat() {
    if (!kod.trim()) return;
    setOdesilam(true);
    setChyba(null);
    try {
      await api.post(`/routes/${routeId}/entries/${entry.id}/chip`, { kodCipu: kod.trim(), typ });
      setKod("");
      onChanged();
    } catch (e) {
      setChyba(chybaZeServeru(e, "Přiřazení čipu se nezdařilo"));
    } finally {
      setOdesilam(false);
    }
  }

  async function odebrat() {
    setOdesilam(true);
    setChyba(null);
    try {
      await api.del(`/routes/${routeId}/entries/${entry.id}/chip`);
      onChanged();
    } catch (e) {
      setChyba(chybaZeServeru(e, "Odebrání čipu se nezdařilo"));
    } finally {
      setOdesilam(false);
    }
  }

  if (entry.cip) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 12.5 }}>
          {entry.cip.kodCipu}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: 999,
            background: CIP_STAV_BARVA[entry.cip.stav],
            color: "#fff",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {CIP_STAV_LABEL[entry.cip.stav]}
        </span>
        <button onClick={odebrat} disabled={odesilam} className="btn-pill" style={{ padding: "2px 8px", fontSize: 11 }}>
          Odebrat
        </button>
        {chyba && <span style={{ color: "var(--color-danger)", fontSize: 11 }}>{chyba}</span>}
      </div>
    );
  }

  if (!otevrene) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="stitek stitek-neutralni">bez čipu</span>
        <button onClick={() => setOtevrene(true)} className="btn-pill" style={{ padding: "2px 8px", fontSize: 11 }}>
          Přiřadit
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <input
        value={kod}
        onChange={(e) => setKod(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && parovat()}
        placeholder="Sériové číslo (čtečka)"
        autoComplete="off"
        list={`cipy-sklad-${entry.id}`}
        className="mono"
        style={{ width: 150, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
      />
      <datalist id={`cipy-sklad-${entry.id}`}>
        {(volne ?? []).slice(0, 200).map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      {kod.trim() && volne && !jeVeSkladu && (
        <select
          value={typ}
          onChange={(e) => setTyp(e.target.value as TypCipu)}
          aria-label="Typ nového čipu"
          title="Čip ještě není ve skladu — přidá se"
          style={{ padding: "2px 4px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 11 }}
        >
          <option value={TypCipu.OPAKOVANY}>opakovaný</option>
          <option value={TypCipu.JEDNORAZOVY}>jednorázový</option>
        </select>
      )}
      <button onClick={parovat} disabled={odesilam || !kod.trim()} className="btn-pill" style={{ padding: "2px 8px", fontSize: 11 }}>
        Přiřadit
      </button>
      {chyba && <span style={{ color: "var(--color-danger)", fontSize: 11 }}>{chyba}</span>}
    </div>
  );
}

/** Čekající veřejná registrace: přidělení startovního čísla, oprava e-mailu, opětovné odeslání potvrzení a zamítnutí. */
function RadekRegistrace({
  registrace,
  trat,
  onChanged,
  zamitnout,
}: {
  registrace: RegistraceDto;
  trat?: string;
  onChanged: () => void;
  zamitnout: (trasaId: string, registraceId: string, jmeno: string) => void;
}) {
  const [cislo, setCislo] = useState("");
  const [odesilam, setOdesilam] = useState(false);
  const [upravuji, setUpravuji] = useState(false);
  const [email, setEmail] = useState(registrace.email ?? "");
  const [zprava, setZprava] = useState<{ text: string; chyba: boolean } | null>(null);
  const jmeno = `${registrace.prijmeni} ${registrace.jmeno}`;

  async function prideleni() {
    if (!cislo) return;
    setOdesilam(true);
    setZprava(null);
    try {
      await api.post(`/routes/${registrace.trasaId}/registrations/${registrace.id}/prideleni`, { startovniCislo: Number(cislo) });
      onChanged();
    } catch (e) {
      setZprava({ text: chybaZeServeru(e, "Přidělení čísla se nezdařilo"), chyba: true });
    } finally {
      setOdesilam(false);
    }
  }

  async function ulozitEmail() {
    setZprava(null);
    try {
      await api.patch(`/routes/${registrace.trasaId}/registrations/${registrace.id}`, { email: email.trim() });
      setUpravuji(false);
      onChanged();
    } catch (e) {
      setZprava({ text: chybaZeServeru(e, "E-mail se nepodařilo uložit"), chyba: true });
    }
  }

  async function poslatZnovu() {
    if (!registrace.email) return;
    if (!window.confirm(`Znovu odeslat potvrzení registrace na ${registrace.email}?`)) return;
    setZprava(null);
    try {
      await api.post(`/routes/${registrace.trasaId}/registrations/${registrace.id}/potvrzeni-registrace`, {});
      setZprava({ text: "Potvrzení registrace odesláno", chyba: false });
    } catch (e) {
      setZprava({ text: chybaZeServeru(e, "E-mail se nepodařilo odeslat"), chyba: true });
    }
  }

  return (
    <tr className="sl-radek">
      {trat !== undefined && (
        <td>
          <span className="stitek stitek-trat">{trat}</span>
        </td>
      )}
      <td>
        <div style={{ fontWeight: 700 }}>{jmeno}</div>
        {upravuji ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && email.trim() && ulozitEmail()}
              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12.5, minWidth: 200 }}
            />
            <button onClick={ulozitEmail} disabled={!email.trim()} className="btn-pill primary" style={{ padding: "3px 10px", fontSize: 11.5 }}>
              Uložit
            </button>
            <button onClick={() => setUpravuji(false)} className="btn-pill" style={{ padding: "3px 10px", fontSize: 11.5 }}>
              Zrušit
            </button>
          </div>
        ) : (
          <div className="sl-podtitul" style={{ color: registrace.email ? undefined : "var(--color-danger)", wordBreak: "break-all" }}>
            {registrace.email ?? "bez e-mailu"}
          </div>
        )}
        {zprava && <div style={{ fontSize: 11.5, marginTop: 2, color: zprava.chyba ? "var(--color-danger)" : "var(--text-secondary)" }}>{zprava.text}</div>}
      </td>
      <td>
        <span className="mono" style={{ fontSize: 12.5 }}>{registrace.kategorieKod ?? "—"}</span>
      </td>
      <td className="sl-podtitul">
        {new Date(registrace.vytvorenoAt).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            placeholder="Č."
            inputMode="numeric"
            value={cislo}
            onChange={(e) => setCislo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && prideleni()}
            style={{ ...inputStyle, width: 72, padding: "5px 8px", fontSize: 13 }}
          />
          <button onClick={prideleni} disabled={odesilam || !cislo} className="btn-pill primary" style={{ padding: "5px 12px", fontSize: 12 }}>
            Přidělit
          </button>
        </div>
      </td>
      <td style={{ textAlign: "right" }}>
        <RozbalovaciMenu
          popisek={`Akce: ${jmeno}`}
          kompaktni
          polozky={[
            {
              popisek: "Upravit e-mail",
              akce: () => {
                setEmail(registrace.email ?? "");
                setZprava(null);
                setUpravuji(true);
              },
            },
            ...(registrace.email ? [{ popisek: "Poslat potvrzení registrace znovu", akce: poslatZnovu }] : []),
            { popisek: "Zamítnout registraci", akce: () => zamitnout(registrace.trasaId, registrace.id, jmeno), nebezpecna: true },
          ]}
        />
      </td>
    </tr>
  );
}

type RadekPrihlasky = Prihlaska & { kategorie?: Kategorie; cip?: Cip | null };

/** Jeden závodník v tabulce: název, e-mail s opravou, štítky stavů a nabídka akcí. */
function RadekZavodnika({
  e,
  trat,
  trasy,
  onChanged,
  nastavitStav,
  nastavitZaplaceno,
  poslatPotvrzeniPlatby,
  smazat,
}: {
  e: RadekPrihlasky;
  trat?: string;
  trasy: (Trasa & { kategorie: Kategorie[] })[];
  onChanged: () => void;
  nastavitStav: (trasaId: string, entryId: string, stav: StavUkonceni | null) => void;
  nastavitZaplaceno: (trasaId: string, entryId: string, zaplaceno: boolean) => void;
  poslatPotvrzeniPlatby: (entry: RadekPrihlasky) => void;
  smazat: (trasaId: string, entryId: string, jmeno: string) => void;
}) {
  const [upravuji, setUpravuji] = useState(false);
  const [email, setEmail] = useState(e.email ?? "");
  const [zprava, setZprava] = useState<{ text: string; chyba: boolean } | null>(null);
  const [upravujiUdaje, setUpravujiUdaje] = useState(false);
  const [noveCislo, setNoveCislo] = useState(String(e.startovniCislo));
  const [novaTrasaId, setNovaTrasaId] = useState(e.trasaId);
  const [novaKategorieId, setNovaKategorieId] = useState(e.kategorieId);

  const kategorieCile = trasy.find((t) => t.id === novaTrasaId)?.kategorie ?? [];

  function zmenitTrat(id: string) {
    setNovaTrasaId(id);
    if (id === e.trasaId) {
      setNovaKategorieId(e.kategorieId);
      return;
    }
    // Při přesunu předvyplní kategorii se stejným kódem na cílové trati, jinak první.
    const kategorie = trasy.find((t) => t.id === id)?.kategorie ?? [];
    setNovaKategorieId((kategorie.find((k) => k.kod === e.kategorie?.kod) ?? kategorie[0])?.id ?? "");
  }

  async function ulozitUdaje() {
    setZprava(null);
    const cislo = Number(noveCislo);
    if (!Number.isInteger(cislo) || cislo < 1) {
      setZprava({ text: "Startovní číslo musí být celé číslo od 1 výš", chyba: true });
      return;
    }
    const zmeny: { startovniCislo?: number; trasaId?: string; kategorieId?: string } = {};
    if (cislo !== e.startovniCislo) zmeny.startovniCislo = cislo;
    if (novaTrasaId !== e.trasaId) zmeny.trasaId = novaTrasaId;
    if (novaKategorieId && novaKategorieId !== e.kategorieId) zmeny.kategorieId = novaKategorieId;
    if (Object.keys(zmeny).length === 0) {
      setUpravujiUdaje(false);
      return;
    }
    try {
      await api.patch(`/routes/${e.trasaId}/entries/${e.id}`, zmeny);
      setUpravujiUdaje(false);
      onChanged();
    } catch (err) {
      setZprava({ text: chybaZeServeru(err, "Úprava se nezdařila"), chyba: true });
    }
  }

  async function ulozitEmail() {
    setZprava(null);
    try {
      await api.patch(`/routes/${e.trasaId}/entries/${e.id}`, { email: email.trim() });
      setUpravuji(false);
      onChanged();
    } catch (err) {
      setZprava({ text: chybaZeServeru(err, "E-mail se nepodařilo uložit"), chyba: true });
    }
  }

  async function poslatRegistraci() {
    if (!e.email) return;
    if (!window.confirm(`Znovu odeslat potvrzení registrace na ${e.email}?`)) return;
    setZprava(null);
    try {
      await api.post(`/routes/${e.trasaId}/entries/${e.id}/potvrzeni-registrace`, {});
      setZprava({ text: "Potvrzení registrace odesláno", chyba: false });
    } catch (err) {
      setZprava({ text: chybaZeServeru(err, "E-mail se nepodařilo odeslat"), chyba: true });
    }
  }

  const jmeno = `${e.prijmeni} ${e.jmeno}`;
  return (
    <tr className="sl-radek">
      {trat !== undefined && (
        <td>
          <span className="stitek stitek-trat">{trat}</span>
        </td>
      )}
      <td className="sl-cislo">{e.startovniCislo}</td>
      <td>
        <div style={{ fontWeight: 700 }}>{jmeno}</div>
        {upravuji ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && email.trim() && ulozitEmail()}
              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12.5, minWidth: 200 }}
            />
            <button onClick={ulozitEmail} disabled={!email.trim()} className="btn-pill primary" style={{ padding: "3px 10px", fontSize: 11.5 }}>
              Uložit
            </button>
            <button onClick={() => setUpravuji(false)} className="btn-pill" style={{ padding: "3px 10px", fontSize: 11.5 }}>
              Zrušit
            </button>
          </div>
        ) : (
          <div className="sl-podtitul" style={{ color: e.email ? undefined : "var(--color-danger)", wordBreak: "break-all" }}>
            {e.email ?? "bez e-mailu"}
          </div>
        )}
        {e.clenoveDruzstva?.length ? (
          <div className="sl-podtitul">družstvo: {e.clenoveDruzstva.map((c) => `${c.prijmeni} ${c.jmeno}`).join(", ")}</div>
        ) : null}
        {upravujiUdaje && (
          <div className="sl-editor">
            <label>
              Č.
              <input value={noveCislo} inputMode="numeric" onChange={(ev) => setNoveCislo(ev.target.value)} style={{ width: 70 }} />
            </label>
            {trasy.length > 1 && (
              <label>
                Trať
                <select value={novaTrasaId} onChange={(ev) => zmenitTrat(ev.target.value)}>
                  {trasy.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nazev}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Kategorie
              <select value={novaKategorieId} onChange={(ev) => setNovaKategorieId(ev.target.value)}>
                {kategorieCile.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.kod} — {k.nazev}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={ulozitUdaje} disabled={!novaKategorieId} className="btn-pill primary" style={{ padding: "3px 10px", fontSize: 11.5 }}>
              Uložit
            </button>
            <button onClick={() => setUpravujiUdaje(false)} className="btn-pill" style={{ padding: "3px 10px", fontSize: 11.5 }}>
              Zrušit
            </button>
          </div>
        )}
        {zprava && <div style={{ fontSize: 11.5, marginTop: 2, color: zprava.chyba ? "var(--color-danger)" : "var(--text-secondary)" }}>{zprava.text}</div>}
      </td>
      <td>
        <span className="mono" style={{ fontSize: 12.5 }}>{e.kategorie?.kod ?? "—"}</span>
      </td>
      <td>
        <ChipBunka routeId={e.trasaId} entry={e} onChanged={onChanged} />
      </td>
      <td>
        <button
          type="button"
          onClick={() => nastavitZaplaceno(e.trasaId, e.id, !e.zaplaceno)}
          className={`stitek ${e.zaplaceno ? "stitek-ok" : "stitek-varovani"} stitek-tlacitko`}
          title={e.zaplaceno ? "Kliknutím označíte jako nezaplaceno" : "Kliknutím označíte jako zaplaceno"}
        >
          {e.zaplaceno ? "✓ zaplaceno" : "nezaplaceno"}
        </button>
        {e.zaplaceno && e.email && (
          <div className="sl-podtitul" style={{ marginTop: 3 }}>
            {e.potvrzeniPlatbyOdeslanoAt
              ? `potvrzení ${new Date(e.potvrzeniPlatbyOdeslanoAt).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}`
              : "potvrzení neodesláno"}{" "}
            <button onClick={() => poslatPotvrzeniPlatby(e)} className="sl-odkaz">
              {e.potvrzeniPlatbyOdeslanoAt ? "odeslat znovu" : "odeslat"}
            </button>
          </div>
        )}
        {e.zaplaceno && !e.email && <div className="sl-podtitul">bez e-mailu</div>}
      </td>
      <td>
        <select
          value={e.stavUkonceni ?? ""}
          onChange={(ev) => nastavitStav(e.trasaId, e.id, (ev.target.value as StavUkonceni) || null)}
          className={`sl-stav${e.stavUkonceni ? " sl-stav-problem" : ""}`}
        >
          <option value="">v pořádku</option>
          {Object.values(StavUkonceni).map((s) => (
            <option key={s} value={s}>
              {STAV_LABEL[s]}
            </option>
          ))}
        </select>
      </td>
      <td style={{ textAlign: "right" }}>
        <RozbalovaciMenu
          popisek={`Akce: ${jmeno}`}
          kompaktni
          polozky={[
            {
              popisek: "Upravit e-mail",
              akce: () => {
                setEmail(e.email ?? "");
                setZprava(null);
                setUpravuji(true);
              },
            },
            {
              popisek: "Upravit číslo, trať a kategorii",
              akce: () => {
                setNoveCislo(String(e.startovniCislo));
                setNovaTrasaId(e.trasaId);
                setNovaKategorieId(e.kategorieId);
                setZprava(null);
                setUpravujiUdaje(true);
              },
            },
            ...(e.email ? [{ popisek: "Poslat potvrzení registrace znovu", akce: poslatRegistraci }] : []),
            { popisek: "Smazat závodníka", akce: () => smazat(e.trasaId, e.id, jmeno), nebezpecna: true },
          ]}
        />
      </td>
    </tr>
  );
}

const STAV_LABEL: Record<StavUkonceni, string> = {
  [StavUkonceni.DNS]: "DNS",
  [StavUkonceni.DNF]: "DNF",
  [StavUkonceni.DQ]: "DQ",
};

const PRAZDNY_CLEN: DruzstvoClen = { prijmeni: "", jmeno: "", rocnik: undefined, klub: undefined };

export function StartList() {
  const { routeId, eventId: eventIdParam } = useParams<{ routeId?: string; eventId?: string }>();
  const [trasy, setTrasy] = useState<(Trasa & { kategorie: Kategorie[] })[]>([]);
  const [udalost, setUdalost] = useState<Udalost | null>(null);
  const [entries, setEntries] = useState<(Prihlaska & { kategorie?: Kategorie; cip?: Cip | null })[]>([]);
  const [registrace, setRegistrace] = useState<RegistraceDto[]>([]);
  const [nacteno, setNacteno] = useState(false);
  const [catKod, setCatKod] = useState("");
  const [catNazev, setCatNazev] = useState("");
  const [catPohlavi, setCatPohlavi] = useState<Pohlavi>(Pohlavi.M);
  const [catRocnikOd, setCatRocnikOd] = useState("");
  const [catRocnikDo, setCatRocnikDo] = useState("");
  const [formTrasaId, setFormTrasaId] = useState(routeId ?? "");
  const [cislo, setCislo] = useState("");
  const [prijmeni, setPrijmeni] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [rocnik, setRocnik] = useState("");
  const [pohlavi, setPohlavi] = useState<Pohlavi | "">("");
  const [kategorieId, setKategorieId] = useState("");
  const [klub, setKlub] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [nouzovyKontakt, setNouzovyKontakt] = useState("");
  const [zdravotniPoznamka, setZdravotniPoznamka] = useState("");
  const [navrzenaKategorieId, setNavrzenaKategorieId] = useState<string | null>(null);
  const [druzstvo, setDruzstvo] = useState(false);
  const [clenove, setClenove] = useState<DruzstvoClen[]>([{ ...PRAZDNY_CLEN }]);
  const [error, setError] = useState<string | null>(null);
  const [importVysledek, setImportVysledek] = useState<ImportEntriesResponseDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pridatKategorii, setPridatKategorii] = useState(false);
  const [zapisOtevreny, setZapisOtevreny] = useState(false);
  const [hledani, setHledani] = useState("");
  const [filtr, setFiltr] = useState<"vse" | "nezaplaceno" | "bez-cipu" | "stav">("vse");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vsechny = !routeId;
  const trasa = routeId ? trasy.find((t) => t.id === routeId) ?? null : null;
  const trasaPodleId = (id: string) => trasy.find((t) => t.id === id);
  const nazevTrase = (id: string) => trasaPodleId(id)?.nazev ?? "—";
  const formTrasa = trasaPodleId(formTrasaId) ?? null;

  async function reload() {
    setError(null);
    try {
      let udalostId = eventIdParam;
      if (routeId) {
        const t = await api.get<Trasa>(`/routes/${routeId}`);
        udalostId = t.udalostId;
      }
      if (!udalostId) return;
      const u = await api.get<Udalost>(`/events/${udalostId}`);
      setUdalost(u);
      if (u.ukoncena) {
        setNacteno(true);
        return; // ukončená akce — listina se nenačítá, viz VyberAktivniAkce níže
      }
      const seznam = await api.get<Trasa[]>(`/events/${udalostId}/routes`);
      const podrobnosti = await Promise.all(seznam.map((t) => api.get<Trasa & { kategorie: Kategorie[] }>(`/routes/${t.id}`)));
      setTrasy(podrobnosti);
      const cile = routeId ? [routeId] : seznam.map((t) => t.id);
      const data = await Promise.all(
        cile.map(async (id) => ({
          prihlasky: await api.get<(Prihlaska & { kategorie?: Kategorie; cip?: Cip | null })[]>(`/routes/${id}/entries`),
          cekajici: await api.get<RegistraceDto[]>(`/routes/${id}/registrations`),
        }))
      );
      setEntries(data.flatMap((d) => d.prihlasky));
      setRegistrace(data.flatMap((d) => d.cekajici));
      setNacteno(true);
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba načítání"));
    }
  }

  useEffect(() => {
    setNacteno(false);
    setZapisOtevreny(false);
    setFormTrasaId(routeId ?? "");
    setKategorieId("");
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, eventIdParam]);

  // Akce s jedinou tratí: v pohledu "Všechny tratě" není co vybírat.
  useEffect(() => {
    if (!routeId && !formTrasaId && trasy.length === 1) setFormTrasaId(trasy[0].id);
  }, [routeId, formTrasaId, trasy]);

  // F03 — automatický návrh kategorie podle ročníku/pohlaví. Jen našeptává:
  // kategorii přednastaví, ale pole zůstává editovatelné a organizátor musí
  // zápis vždy sám odeslat, nic se neuloží potichu.
  useEffect(() => {
    if (!formTrasaId || !rocnik || !pohlavi) {
      setNavrzenaKategorieId(null);
      return;
    }
    const rocnikCislo = Number(rocnik);
    if (Number.isNaN(rocnikCislo)) return;
    let zruseno = false;
    api
      .get<Kategorie | null>(`/routes/${formTrasaId}/categories/suggest?rocnik=${rocnikCislo}&pohlavi=${pohlavi}`)
      .then((navrh) => {
        if (zruseno || !navrh) return;
        setNavrzenaKategorieId(navrh.id);
        setKategorieId((aktualni) => aktualni || navrh.id);
      })
      .catch(() => {
        // Návrh je jen doplněk — chyba nesmí bránit ručnímu výběru kategorie.
      });
    return () => {
      zruseno = true;
    };
  }, [formTrasaId, rocnik, pohlavi]);

  async function createCategory() {
    if (!routeId || !catKod.trim() || !catNazev.trim()) return;
    try {
      await api.post(`/routes/${routeId}/categories`, {
        kod: catKod,
        nazev: catNazev,
        pohlavi: catPohlavi,
        rocnikOd: catRocnikOd ? Number(catRocnikOd) : undefined,
        rocnikDo: catRocnikDo ? Number(catRocnikDo) : undefined,
      });
    } catch (e) {
      setError(chybaZeServeru(e, "Kategorii se nepodařilo přidat"));
      return;
    }
    setCatKod("");
    setCatNazev("");
    setCatRocnikOd("");
    setCatRocnikDo("");
    reload();
  }

  function stahnoutSablonuCsv() {
    const hlavicka = [
      "cislo",
      "prijmeni",
      "jmeno",
      "kategorie",
      "rocnik",
      "pohlavi",
      "klub",
      "clen1_prijmeni",
      "clen1_jmeno",
      "clen1_rocnik",
      "clen1_klub",
      "clen2_prijmeni",
      "clen2_jmeno",
      "clen2_rocnik",
      "clen2_klub",
      "clen3_prijmeni",
      "clen3_jmeno",
      "clen3_rocnik",
      "clen3_klub",
      "clen4_prijmeni",
      "clen4_jmeno",
      "clen4_rocnik",
      "clen4_klub",
    ];
    const ukazkovyKod = trasa?.kategorie[0]?.kod ?? "MAk";
    const ukazka = ["101", "Novák", "Petr", ukazkovyKod, "1990", "M", "AC Sparta"];
    const csv = [hlavicka.join(","), ukazka.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const odkaz = document.createElement("a");
    odkaz.href = url;
    odkaz.download = "startovni-listina-sablona.csv";
    odkaz.click();
    URL.revokeObjectURL(url);
  }

  async function createEntry() {
    if (!formTrasaId || !cislo || !prijmeni.trim() || !jmeno.trim() || !rocnik || !pohlavi || !kategorieId || !email.trim()) {
      setError("Trať, startovní číslo, jméno, příjmení, ročník, pohlaví, kategorie a e-mail jsou povinné.");
      return;
    }
    const platniClenove = druzstvo
      ? clenove.filter((c) => c.prijmeni.trim() && c.jmeno.trim()).map((c) => ({ ...c, prijmeni: c.prijmeni.trim(), jmeno: c.jmeno.trim() }))
      : undefined;
    try {
      await api.post(`/routes/${formTrasaId}/entries`, {
        startovniCislo: Number(cislo),
        prijmeni: prijmeni.trim(),
        jmeno: jmeno.trim(),
        kategorieId,
        rocnik: Number(rocnik),
        pohlavi,
        klub: klub.trim() || undefined,
        email: email.trim(),
        telefon: telefon.trim() || undefined,
        nouzovyKontakt: nouzovyKontakt.trim() || undefined,
        zdravotniPoznamka: zdravotniPoznamka.trim() || undefined,
        clenoveDruzstva: platniClenove?.length ? platniClenove : undefined,
      });
      setCislo("");
      setPrijmeni("");
      setJmeno("");
      setRocnik("");
      setPohlavi("");
      setKategorieId("");
      setKlub("");
      setEmail("");
      setTelefon("");
      setNouzovyKontakt("");
      setZdravotniPoznamka("");
      setNavrzenaKategorieId(null);
      setDruzstvo(false);
      setClenove([{ ...PRAZDNY_CLEN }]);
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Chyba zápisu"));
    }
  }

  async function nastavitStav(trasaId: string, entryId: string, stav: StavUkonceni | null) {
    try {
      await api.patch(`/routes/${trasaId}/entries/${entryId}`, { stavUkonceni: stav });
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Nastavení stavu se nezdařilo"));
    }
  }

  async function nastavitZaplaceno(trasaId: string, entryId: string, zaplaceno: boolean) {
    try {
      await api.patch(`/routes/${trasaId}/entries/${entryId}`, { zaplaceno });
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Nastavení platby se nezdařilo"));
    }
  }

  async function poslatPotvrzeniPlatby(entry: { id: string; trasaId: string; jmeno: string; prijmeni: string; email?: string | null; potvrzeniPlatbyOdeslanoAt?: string | null }) {
    const znovu = !!entry.potvrzeniPlatbyOdeslanoAt;
    const otazka = znovu
      ? `Potvrzení už bylo odesláno. Odeslat ${entry.jmeno} ${entry.prijmeni} (${entry.email}) znovu?`
      : `Odeslat ${entry.jmeno} ${entry.prijmeni} (${entry.email}) potvrzení platby se startovním číslem?`;
    if (!window.confirm(otazka)) return;
    try {
      await api.post(`/routes/${entry.trasaId}/entries/${entry.id}/potvrzeni-platby`, {});
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "E-mail se nepodařilo odeslat"));
    }
  }

  async function zamitnoutRegistraci(trasaId: string, registraceId: string, jmeno: string) {
    if (!window.confirm(`Opravdu zamítnout registraci "${jmeno}"? Nevznikne z ní přihláška.`)) return;
    try {
      await api.del(`/routes/${trasaId}/registrations/${registraceId}`);
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Zamítnutí se nezdařilo"));
    }
  }

  async function exportovatXlsx() {
    if (!routeId) return;
    setBusy("Připravuji export…");
    try {
      const blob = await api.getBlob(`/routes/${routeId}/entries/export.xlsx`);
      const url = URL.createObjectURL(blob);
      const odkaz = document.createElement("a");
      odkaz.href = url;
      odkaz.download = "startovni-listina.xlsx";
      odkaz.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(chybaZeServeru(e, "Export se nezdařil"));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Právo na výmaz (GDPR) — smaže jméno, kontakty a zdravotní poznámku
   * závodníka. Naměřené časy zůstávají (jen anonymně), ať výsledky a
   * audit log neztratí integritu — viz zásady ochrany osobních údajů.
   */
  async function anonymizovatZavodnika(trasaId: string, entryId: string, jmeno: string) {
    if (
      !window.confirm(
        `Opravdu smazat závodníka "${jmeno}"? Smaže se jeho přihláška včetně osobních údajů a startovní číslo se uvolní. Naměřené časy zůstanou v logu měření jako nepřiřazené. Tuto akci nelze vrátit zpět.`
      )
    ) {
      return;
    }
    try {
      await api.del(`/routes/${trasaId}/entries/${entryId}`);
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Smazání závodníka se nezdařilo"));
    }
  }

  async function importCsv(soubor: File) {
    if (!routeId) return;
    setError(null);
    setImportVysledek(null);
    setBusy("Importuji CSV…");
    try {
      const formData = new FormData();
      formData.append("soubor", soubor);
      const vysledek = await api.postForm<ImportEntriesResponseDto>(`/routes/${routeId}/entries/import`, formData);
      setImportVysledek(vysledek);
      reload();
    } catch (e) {
      setError(chybaZeServeru(e, "Import se nezdařil"));
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function upravitClena(index: number, zmena: Partial<DruzstvoClen>) {
    setClenove((c) => c.map((clen, i) => (i === index ? { ...clen, ...zmena } : clen)));
  }

  const shellProps = { active: "listina" as const, routeId, eventId: udalost?.id ?? eventIdParam, vsechnyTrate: vsechny };

  if (!nacteno && !udalost) {
    return <AppShell {...shellProps}>{error ?? "Načítám…"}</AppShell>;
  }

  if (udalost?.ukoncena) {
    return (
      <AppShell {...shellProps}>
        <VyberAktivniAkce />
      </AppShell>
    );
  }

  if (routeId && !trasa) {
    return <AppShell {...shellProps}>{error ?? "Načítám…"}</AppShell>;
  }

  const kategorieFormulare = formTrasa?.kategorie ?? [];
  const zaplaceno = entries.filter((e) => e.zaplaceno).length;
  const bezEmailu = entries.filter((e) => !e.email).length;
  const dotaz = hledani.trim().toLowerCase();
  const zobrazene = [...entries]
    .filter((e) => {
      if (filtr === "nezaplaceno" && e.zaplaceno) return false;
      if (filtr === "bez-cipu" && e.cip) return false;
      if (filtr === "stav" && !e.stavUkonceni) return false;
      if (!dotaz) return true;
      return (
        `${e.prijmeni} ${e.jmeno}`.toLowerCase().includes(dotaz) ||
        String(e.startovniCislo).includes(dotaz) ||
        (e.email ?? "").toLowerCase().includes(dotaz)
      );
    })
    .sort(
      (a, b) =>
        (vsechny ? nazevTrase(a.trasaId).localeCompare(nazevTrase(b.trasaId), "cs", { numeric: true }) : 0) ||
        a.startovniCislo - b.startovniCislo
    );
  const poctyNaTrasu = (id: string) => entries.filter((e) => e.trasaId === id).length;

  return (
    <AppShell {...shellProps}>
      <BusyOverlay active={busy !== null} label={busy ?? undefined} />
      <div style={{ maxWidth: 1500 }}>
      <div className="dash-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Startovní listina</h1>
          <div className="meta mono">
            {udalost?.nazev} · {vsechny ? "všechny tratě" : trasa?.nazev} · {entries.length}{" "}
            {entries.length === 1 ? "závodník" : "závodníků"}
          </div>
        </div>
      </div>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {vsechny && trasy.length > 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 16px" }}>
          Pohled na celou akci.{" "}
          {trasy.map((t, i) => (
            <span key={t.id}>
              {i > 0 && " · "}
              {t.nazev}: {poctyNaTrasu(t.id)}
            </span>
          ))}
          . Kategorie, import CSV a export spravujete na záložce konkrétní trati.
        </p>
      )}

      {trasa && (
      <section className="dash-card" style={{ marginBottom: 24 }}>
        <div className="dash-card-head">
          <h2>Kategorie</h2>
          {trasa.kategorie.length > 0 && (
            <button onClick={() => setPridatKategorii((v) => !v)} className="btn-pill">
              {pridatKategorii ? "Zrušit" : "+ Přidat kategorii"}
            </button>
          )}
        </div>
        {trasa.kategorie.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {trasa.kategorie.map((k) => (
              <span
                key={k.id}
                className="mono"
                style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid var(--line)", fontSize: 12.5 }}
              >
                {k.kod} — {k.nazev} ({k.pohlavi}
                {k.rocnikOd || k.rocnikDo ? `, ročník ${k.rocnikOd ?? "…"}–${k.rocnikDo ?? "…"}` : ""})
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: 0 }}>
            Zatím žádná kategorie — bez alespoň jedné kategorie nejde zapsat závodníka do listiny.
          </p>
        )}
        {(pridatKategorii || trasa.kategorie.length === 0) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <input placeholder="Kód, např. MAk" value={catKod} onChange={(e) => setCatKod(e.target.value)} style={inputStyle} />
            <input placeholder="Název, např. Muži A" value={catNazev} onChange={(e) => setCatNazev(e.target.value)} style={inputStyle} />
            <select value={catPohlavi} onChange={(e) => setCatPohlavi(e.target.value as Pohlavi)} style={inputStyle}>
              <option value={Pohlavi.M}>M</option>
              <option value={Pohlavi.Z}>Z</option>
            </select>
            <input
              placeholder="Ročník od"
              inputMode="numeric"
              value={catRocnikOd}
              onChange={(e) => setCatRocnikOd(e.target.value)}
              style={{ ...inputStyle, width: 100 }}
            />
            <input
              placeholder="Ročník do"
              inputMode="numeric"
              value={catRocnikDo}
              onChange={(e) => setCatRocnikDo(e.target.value)}
              style={{ ...inputStyle, width: 100 }}
            />
            <button onClick={createCategory} className="btn-pill primary">
              Přidat kategorii
            </button>
          </div>
        )}
      </section>
      )}

      {zapisOtevreny && (
      <section className="dash-card" style={{ marginBottom: 24 }}>
        <div className="dash-card-head">
          <h2>Zapsat závodníka</h2>
          {formTrasa && !vsechny && <span className="zapis-trat-stitek">{formTrasa.nazev}</span>}
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 12.5, margin: "0 0 12px" }}>* povinné údaje</p>

        {vsechny && (
          <div className="zapis-pole" style={{ maxWidth: 320, marginBottom: 12 }}>
            <label htmlFor="zapis-trat">Trať *</label>
            <select
              id="zapis-trat"
              value={formTrasaId}
              onChange={(e) => {
                setFormTrasaId(e.target.value);
                setKategorieId("");
                setNavrzenaKategorieId(null);
              }}
              style={{ ...inputStyle, borderColor: formTrasaId ? "var(--line)" : "var(--color-attention)" }}
            >
              <option value="">Vyberte trať…</option>
              {trasy.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nazev}
                </option>
              ))}
            </select>
          </div>
        )}

        {formTrasa && kategorieFormulare.length === 0 && (
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: 0 }}>
            Trať „{formTrasa.nazev}" zatím nemá žádnou kategorii — přidejte ji na záložce této tratě, jinak nejde zapsat
            závodníka.
          </p>
        )}

        {formTrasa && kategorieFormulare.length > 0 && (
          <>
            <div className="zapis-mrizka">
              <div className="zapis-pole" style={{ maxWidth: 110 }}>
                <label htmlFor="zapis-cislo">Startovní číslo *</label>
                <input id="zapis-cislo" value={cislo} inputMode="numeric" onChange={(e) => setCislo(e.target.value)} style={inputStyle} />
              </div>
              <div className="zapis-pole">
                <label htmlFor="zapis-jmeno">Jméno *</label>
                <input id="zapis-jmeno" value={jmeno} onChange={(e) => setJmeno(e.target.value)} style={inputStyle} />
              </div>
              <div className="zapis-pole">
                <label htmlFor="zapis-prijmeni">Příjmení *</label>
                <input id="zapis-prijmeni" value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} style={inputStyle} />
              </div>
              <div className="zapis-pole" style={{ maxWidth: 130 }}>
                <label htmlFor="zapis-rocnik">Ročník narození *</label>
                <input id="zapis-rocnik" value={rocnik} inputMode="numeric" onChange={(e) => setRocnik(e.target.value)} style={inputStyle} />
              </div>
              <div className="zapis-pole" style={{ maxWidth: 110 }}>
                <label htmlFor="zapis-pohlavi">Pohlaví *</label>
                <select id="zapis-pohlavi" value={pohlavi} onChange={(e) => setPohlavi(e.target.value as Pohlavi | "")} style={inputStyle}>
                  <option value="">—</option>
                  <option value={Pohlavi.M}>M</option>
                  <option value={Pohlavi.Z}>Ž</option>
                </select>
              </div>
              <div className="zapis-pole">
                <label htmlFor="zapis-kategorie">Kategorie *</label>
                <select
                  id="zapis-kategorie"
                  value={kategorieId}
                  onChange={(e) => setKategorieId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Vyberte…</option>
                  {kategorieFormulare.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.kod} — {k.nazev}
                    </option>
                  ))}
                </select>
              </div>
              <div className="zapis-pole">
                <label htmlFor="zapis-email">E-mail *</label>
                <input id="zapis-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              </div>
            </div>
            {navrzenaKategorieId && kategorieId === navrzenaKategorieId && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0" }}>
                Kategorie navržena automaticky podle ročníku a pohlaví — klidně ji přepiš, pokud nesedí.
              </p>
            )}

            <details className="zapis-dalsi" style={{ marginTop: 14 }}>
              <summary>Další údaje (nepovinné)</summary>
              <div className="zapis-mrizka" style={{ marginTop: 10 }}>
                <div className="zapis-pole">
                  <label htmlFor="zapis-klub">Klub</label>
                  <input id="zapis-klub" value={klub} onChange={(e) => setKlub(e.target.value)} style={inputStyle} />
                </div>
                <div className="zapis-pole">
                  <label htmlFor="zapis-telefon">Telefon</label>
                  <input id="zapis-telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} style={inputStyle} />
                </div>
                <div className="zapis-pole">
                  <label htmlFor="zapis-nouzovy">Nouzový kontakt (jméno + telefon)</label>
                  <input id="zapis-nouzovy" value={nouzovyKontakt} onChange={(e) => setNouzovyKontakt(e.target.value)} style={inputStyle} />
                </div>
                <div className="zapis-pole" style={{ flexBasis: "100%" }}>
                  <label htmlFor="zapis-zdravi">Zdravotní poznámka (alergie, léky…)</label>
                  <textarea
                    id="zapis-zdravi"
                    value={zdravotniPoznamka}
                    onChange={(e) => setZdravotniPoznamka(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
              </div>
            </details>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={druzstvo} onChange={(e) => setDruzstvo(e.target.checked)} />
                Štafeta / družstvo (max 4 další členové pod tímto startovním číslem)
              </label>
              {druzstvo && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {clenove.map((clen, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input
                        placeholder={`Člen ${i + 1} — příjmení`}
                        value={clen.prijmeni}
                        onChange={(e) => upravitClena(i, { prijmeni: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        placeholder="Jméno"
                        value={clen.jmeno}
                        onChange={(e) => upravitClena(i, { jmeno: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        placeholder="Ročník"
                        value={clen.rocnik ?? ""}
                        onChange={(e) => upravitClena(i, { rocnik: e.target.value ? Number(e.target.value) : undefined })}
                        style={{ ...inputStyle, width: 90 }}
                      />
                      <input
                        placeholder="Klub"
                        value={clen.klub ?? ""}
                        onChange={(e) => upravitClena(i, { klub: e.target.value || undefined })}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  {clenove.length < 4 && (
                    <button
                      type="button"
                      className="btn-pill"
                      style={{ alignSelf: "flex-start" }}
                      onClick={() => setClenove((c) => [...c, { ...PRAZDNY_CLEN }])}
                    >
                      + Další člen
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <button onClick={createEntry} className="btn-pill primary" style={{ padding: "10px 20px", fontSize: 14 }}>
                Přidat do listiny
              </button>
            </div>
          </>
        )}

        {trasa && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label className="mono" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Import z CSV (cislo, prijmeni, jmeno, kategorie — nepovinné rocnik, pohlavi, klub; bez kategorie se
              dopočítá z ročníku/pohlaví; clen1_prijmeni…clen4_klub pro štafety)
            </label>
            <button type="button" onClick={stahnoutSablonuCsv} className="btn-pill">
              Stáhnout šablonu CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
          </div>
        )}
        {importVysledek && (
          <p className="mono" style={{ fontSize: 13, marginTop: 8 }}>
            Importováno {importVysledek.importovano}.
            {importVysledek.chyby.length > 0 && (
              <span style={{ color: "var(--color-danger)" }}>
                {" "}
                Chyby: {importVysledek.chyby.map((c) => `řádek ${c.radek}: ${c.zprava}`).join("; ")}
              </span>
            )}
          </p>
        )}
      </section>
      )}

      {registrace.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>K přidělení</h2>
            <span className="stitek stitek-varovani">{registrace.length} čeká na číslo</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 12px" }}>
            Veřejné registrace čekající na ruční přidělení startovního čísla. Dokud číslo nepřidělíte, závodník se
            nepočítá do listiny ani do výsledků.
          </p>
          <div className="sl-karta">
            <div className="table-scroll">
              <table className="sl-tabulka">
                <thead>
                  <tr>
                    {vsechny && <th>Trať</th>}
                    <th>Závodník</th>
                    <th>Kat.</th>
                    <th>Registrace</th>
                    <th>Startovní číslo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {registrace.map((r) => (
                    <RadekRegistrace
                      key={r.id}
                      registrace={r}
                      trat={vsechny ? nazevTrase(r.trasaId) : undefined}
                      onChanged={reload}
                      zamitnout={zamitnoutRegistraci}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <div className="sl-souhrn">
        <div>
          <b>{entries.length}</b>
          <span>Závodníků</span>
        </div>
        <div>
          <b>
            {zaplaceno} <small>/ {entries.length}</small>
          </b>
          <span>Zaplaceno</span>
        </div>
        <div>
          <b>{registrace.length}</b>
          <span>Čeká na číslo</span>
        </div>
        <div>
          <b>{bezEmailu}</b>
          <span>Bez e-mailu</span>
        </div>
      </div>

      <div className="sl-nastroje">
        <input
          type="search"
          value={hledani}
          onChange={(ev) => setHledani(ev.target.value)}
          placeholder="Hledat jméno, číslo nebo e-mail…"
          className="sl-hledani"
        />
        {(
          [
            ["vse", "Všichni"],
            ["nezaplaceno", "Nezaplaceno"],
            ["bez-cipu", "Bez čipu"],
            ["stav", "DNS / DNF / DQ"],
          ] as const
        ).map(([klic, popisek]) => (
          <button key={klic} type="button" onClick={() => setFiltr(klic)} className={`sl-filtr${filtr === klic ? " aktivni" : ""}`}>
            {popisek}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {trasa && (
          <button type="button" onClick={exportovatXlsx} className="btn-pill">
            Export XLSX
          </button>
        )}
        <button type="button" onClick={() => setZapisOtevreny((v) => !v)} className="btn-pill primary">
          {zapisOtevreny ? "Zavřít zápis" : "+ Zapsat závodníka"}
        </button>
      </div>

      <div className="sl-karta">
        <div className="table-scroll">
          <table className="sl-tabulka">
            <thead>
              <tr>
                {vsechny && <th>Trať</th>}
                <th>Č.</th>
                <th>Závodník</th>
                <th>Kat.</th>
                <th>Čip</th>
                <th>Platba</th>
                <th>Stav</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {zobrazene.map((e) => (
                <RadekZavodnika
                  key={e.id}
                  e={e}
                  trat={vsechny ? nazevTrase(e.trasaId) : undefined}
                  trasy={trasy}
                  onChanged={reload}
                  nastavitStav={nastavitStav}
                  nastavitZaplaceno={nastavitZaplaceno}
                  poslatPotvrzeniPlatby={poslatPotvrzeniPlatby}
                  smazat={anonymizovatZavodnika}
                />
              ))}
              {zobrazene.length === 0 && (
                <tr>
                  <td colSpan={vsechny ? 8 : 7} style={{ padding: "20px 8px", color: "var(--text-secondary)" }}>
                    {entries.length === 0 ? "Zatím nikdo není zapsaný." : "Nikdo neodpovídá hledání nebo filtru."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};
