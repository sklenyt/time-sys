import { useEffect, useState } from "react";
import type { ReferenceDto } from "@depo/shared";
import { api, API_BASE } from "../lib/api";
import { vysledkyHref } from "../lib/domeny";
import { ReferenceMapa } from "../components/ReferenceMapa";
import { Link } from "react-router-dom";
import { appHref } from "../lib/domeny";
import { Ikona } from "../components/IkonyMenu";
import { HeroMockup } from "../components/HeroMockup";

const FUNKCE: { ikona: string; nazev: string; text: string }[] = [
  { ikona: "registrace", nazev: "Online registrace", text: "Veřejný formulář nebo widget na tvém webu. Závodník dostane potvrzení e-mailem a zaplatí převodem nebo QR kódem." },
  { ikona: "offline", nazev: "Měření bez signálu", text: "Zapiš číslo a stiskni Enter, i offline. Když se v cíli sjede víc lidí, zapiš jen čas a číslo doplň později." },
  { ikona: "cipy", nazev: "RFID čipy", text: "Čtečka zapisuje průjezdy sama. Přehled vydaných a vrácených čipů i záloh." },
  { ikona: "zive", nazev: "Živé výsledky", text: "Veřejná stránka s pořadím v reálném čase, kiosk pro TV v cíli a widget na tvůj web." },
  { ikona: "plan", nazev: "Plánované starty", text: "Naplánuj čas startu tratě a spustí se sama. Hromadný i vlnový start." },
  { ikona: "tratě", nazev: "Tratě, kategorie, kola", text: "Víc tratí v jedné akci, kategorie podle ročníku a pohlaví, víckolové závody a štafety." },
  { ikona: "email", nazev: "E-maily závodníkům", text: "Potvrzení registrace, platby i dojezdu. Kopie každého potvrzení jde i organizátorovi." },
  { ikona: "kontrola", nazev: "Kontrola a audit", text: "Podezřelé časy, kolize stanovišť a audit log každé změny. Nic se nemaže, jen opravuje." },
  { ikona: "uzivatele", nazev: "Týmy a role", text: "Pozvi kolegy, nastav role podle akcí. Víc organizací a akcí na jednom místě." },
];

function KontaktniFormular() {
  const [jmeno, setJmeno] = useState("");
  const [email, setEmail] = useState("");
  const [zprava, setZprava] = useState("");
  const [web, setWeb] = useState("");
  const [stav, setStav] = useState<"cekam" | "odesilam" | "odeslano" | "chyba">("cekam");
  const [chyba, setChyba] = useState("");

  async function odeslat(e: React.FormEvent) {
    e.preventDefault();
    setStav("odesilam");
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jmeno, email, zprava, web }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const text = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
        throw new Error(res.status === 400 ? "Zkontroluj prosím jméno, e-mail a text zprávy (alespoň 10 znaků)." : text || "Zprávu se nepodařilo odeslat.");
      }
      setStav("odeslano");
    } catch (err) {
      setChyba(err instanceof Error ? err.message : "Zprávu se nepodařilo odeslat.");
      setStav("chyba");
    }
  }

  if (stav === "odeslano") {
    return (
      <div className="landing-form-hotovo" role="status">
        <h3>Zpráva odeslána</h3>
        <p>Díky, ozveme se ti e-mailem na {email}. Podívej se případně i do spamu.</p>
      </div>
    );
  }

  return (
    <form className="landing-form" onSubmit={odeslat}>
      <h3>Napiš nám</h3>
      <p>Napiš, kdy a kde se závod koná, kolik bude závodníků a co potřebuješ (registraci, měření, výsledky).</p>
      <label>
        Jméno
        <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" />
      </label>
      <label>
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" />
      </label>
      <label>
        Zpráva
        <textarea value={zprava} onChange={(e) => setZprava(e.target.value)} required minLength={10} maxLength={4000} rows={5} />
      </label>
      <input
        className="landing-form-past"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={web}
        onChange={(e) => setWeb(e.target.value)}
        name="web"
      />
      {stav === "chyba" && (
        <div className="landing-form-chyba" role="alert">
          {chyba}
        </div>
      )}
      <button type="submit" className="btn-pill accent" style={{ padding: "12px 22px", fontSize: 14 }} disabled={stav === "odesilam"}>
        {stav === "odesilam" ? "Odesílám…" : "Odeslat zprávu"}
      </button>
    </form>
  );
}

const NABIDKA_FUNKCI: { ikona: string; nazev: string; popis: string }[] = [
  { ikona: "registrace", nazev: "Online registrace", popis: "formulář, QR platba, e-maily" },
  { ikona: "mereni", nazev: "Měření v cíli", popis: "číslo + Enter, i offline" },
  { ikona: "zive", nazev: "Živé výsledky", popis: "web, kiosk, export na FTP" },
  { ikona: "listina", nazev: "Startovní listina", popis: "import, čísla, kategorie" },
  { ikona: "plan", nazev: "Plánované starty", popis: "hromadný i vlnový start" },
  { ikona: "cipy", nazev: "RFID čipy", popis: "čtečky, kontrola, audit" },
];

type LightboxImage = { src: string; alt: string };


function Screenshot({
  src,
  alt,
  className,
  onOpen,
}: {
  src: string;
  alt: string;
  className?: string;
  onOpen: (image: LightboxImage) => void;
}) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      role="button"
      tabIndex={0}
      onClick={() => onOpen({ src, alt })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen({ src, alt });
        }
      }}
    />
  );
}

/** Sekce Reference se na webu ukáže až od tohoto počtu veřejných akcí — dřív by působila prázdně. */
const MIN_REFERENCI = 3;

export function Landing() {
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const [reference, setReference] = useState<ReferenceDto[]>([]);

  useEffect(() => {
    api
      .get<ReferenceDto[]>("/events/reference")
      .then(setReference)
      .catch(() => {
        // Reference jsou jen doplněk úvodní stránky — chyba nesmí nic rozbít, sekce se prostě nezobrazí.
      });
  }, []);
  const maReference = reference.length >= MIN_REFERENCI;

  const [menuOtevrene, setMenuOtevrene] = useState(false);
  const [funkceOtevrene, setFunkceOtevrene] = useState(false);
  const [aktivni, setAktivni] = useState("");
  const [odscrollovano, setOdscrollovano] = useState(false);

  useEffect(() => {
    const onScroll = () => setOdscrollovano(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = ["funkce", "jak-to-funguje", "reference", "cenik", "kontakt"];
    const prvky = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (zaznamy) => {
        const viditelny = zaznamy.find((z) => z.isIntersecting);
        if (viditelny) setAktivni(viditelny.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    prvky.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [maReference]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFunkceOtevrene(false);
        setMenuOtevrene(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function zavritMenu() {
    setFunkceOtevrene(false);
    setMenuOtevrene(false);
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  return (
    <div className="landing">
      <div className={`landing-nav-obal${odscrollovano ? " odscrollovano" : ""}`}>
        <header className="landing-nav">
          <a href="#" className="brand" onClick={zavritMenu} aria-label="Depo — úvod">
            <img src="/depo-mark.svg" alt="" width={30} height={30} />
            Depo
          </a>
          <button
            type="button"
            className="landing-nav-hamburger"
            aria-label={menuOtevrene ? "Zavřít menu" : "Otevřít menu"}
            aria-expanded={menuOtevrene}
            onClick={() => setMenuOtevrene((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`landing-nav-telo${menuOtevrene ? " otevrene" : ""}`}>
            <nav className="landing-nav-links" aria-label="Hlavní menu">
              <div
                className="landing-nav-skupina"
                onMouseEnter={() => setFunkceOtevrene(true)}
                onMouseLeave={() => setFunkceOtevrene(false)}
              >
                <a
                  href="#funkce"
                  className={aktivni === "funkce" ? "aktivni" : undefined}
                  aria-haspopup="true"
                  aria-expanded={funkceOtevrene}
                  onClick={zavritMenu}
                >
                  Funkce
                  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <div className={`landing-nav-nabidka${funkceOtevrene ? " otevrena" : ""}`}>
                  <div className="landing-nav-nabidka-mrizka">
                    {NABIDKA_FUNKCI.map((f) => (
                      <a key={f.nazev} href="#funkce" onClick={zavritMenu} className="landing-nav-polozka">
                        <span className="landing-nav-polozka-ikona">
                          <Ikona nazev={f.ikona} />
                        </span>
                        <span>
                          <strong>{f.nazev}</strong>
                          <small>{f.popis}</small>
                        </span>
                      </a>
                    ))}
                  </div>
                  <div className="landing-nav-nabidka-pata">
                    <a href="#proc-depo" onClick={zavritMenu}>Proč Depo</a>
                    <Link to="/napoveda" onClick={zavritMenu}>Nápověda</Link>
                  </div>
                </div>
              </div>
              <a href="#jak-to-funguje" className={aktivni === "jak-to-funguje" ? "aktivni" : undefined} onClick={zavritMenu}>
                Jak to funguje
              </a>
              <a href="#cenik" className={aktivni === "cenik" ? "aktivni" : undefined} onClick={zavritMenu}>
                Ceník
              </a>
              {maReference && (
                <a href="#reference" className={aktivni === "reference" ? "aktivni" : undefined} onClick={zavritMenu}>
                  Reference
                </a>
              )}
              <a href="#kontakt" className={aktivni === "kontakt" ? "aktivni" : undefined} onClick={zavritMenu}>
                Kontakt
              </a>
            </nav>
            <div className="landing-nav-cta">
              <a href="https://vysledky.depotime.cz" className="landing-nav-tichy">
                Výsledky
              </a>
              <a href={appHref("/login")} className="landing-nav-prihlasit">
                Přihlásit se
              </a>
              <a href={appHref("/dashboard")} className="landing-nav-start">
                Vyzkoušet zdarma
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </header>
      </div>

      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div>
            <div className="landing-eyebrow">Časomíra závodů</div>
            <h1>
              Zadej číslo.
              <br />
              Stiskni Enter.
              <br />
              Máš výsledky.
            </h1>
            <p className="lede">
              Depo zvládne celý závod: online registraci, měření v cíli i na telefonu, živé výsledky a export na váš web.
              Funguje i bez signálu.
            </p>
            <div className="landing-hero-actions">
              <a href={appHref("/dashboard")} className="btn-pill accent" style={{ padding: "12px 22px", fontSize: 14 }}>
                Založit závod zdarma
              </a>
              <a href="#jak-to-funguje" className="btn-pill outline-light" style={{ padding: "12px 22px", fontSize: 14 }}>
                Jak to funguje
              </a>
            </div>
            <div className="landing-metric-row">
              <div className="landing-metric">
                <div className="n">QR</div>
                <div className="l">platba startovného</div>
              </div>
              <div className="landing-metric">
                <div className="n">Offline</div>
                <div className="l">měření v cíli</div>
              </div>
              <div className="landing-metric">
                <div className="n">FTP</div>
                <div className="l">výsledky na váš web</div>
              </div>
              <div className="landing-metric">
                <div className="n">RFID</div>
                <div className="l">čipová časomíra</div>
              </div>
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      <section className="landing-section" id="jak-to-funguje">
        <div className="landing-section-head">
          <h2>Celý závod z jednoho zázemí</h2>
          <p>Od startovní listiny po výsledky na klubovém webu — bez přenášení souborů na flashce.</p>
        </div>
        <div className="landing-cards">
          <div className="landing-card">
            <Screenshot
              className="landing-card-shot"
              src="/screenshots/startovni-listina.png"
              alt="Startovní listina se zapsanými závodníky a kategoriemi"
              onOpen={setLightbox}
            />
            <div className="num">01</div>
            <h3>Startovní listina za pár minut</h3>
            <p>Ruční zápis na místě nebo import z CSV. Kategorie se navrhne sama podle ročníku a pohlaví, jen ji potvrdíte.</p>
          </div>
          <div className="landing-card">
            <Screenshot
              className="landing-card-shot"
              src="/screenshots/dashboard.png"
              alt="Přehled akce se stavem v cíli, na trati a průběhem tratě v reálném čase"
              onOpen={setLightbox}
            />
            <div className="num">02</div>
            <h3>Přehled akce v reálném čase</h3>
            <p>Kdo je v cíli, kdo ještě běží a co vyžaduje pozornost — vidíte živě z jednoho zázemí, i když měříte na víc stanovištích.</p>
          </div>
          <div className="landing-card">
            <Screenshot
              className="landing-card-shot"
              src="/screenshots/vysledky.png"
              alt="Veřejná stránka výsledků s pořadím a časy závodníků"
              onOpen={setLightbox}
            />
            <div className="num">03</div>
            <h3>Výsledky hned na webu</h3>
            <p>Živá veřejná stránka bez přihlášení a automatický export přes FTP/SFTP na váš vlastní klubový web.</p>
          </div>
        </div>
      </section>

      <section className="landing-section" id="funkce">
        <div className="landing-section-head">
          <div>
            <div className="landing-eyebrow dark">Co umí</div>
            <h2>Všechno, co závod potřebuje</h2>
          </div>
          <p>Od přihlášky po výsledky. Věcně a bez zbytečných kroků.</p>
        </div>
        <div className="landing-features">
          {FUNKCE.map((f) => (
            <div key={f.nazev} className="landing-feature">
              <span className="landing-feature-ikona">
                <Ikona nazev={f.ikona} />
              </span>
              <h3>{f.nazev}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {maReference && (
        <section className="landing-section" id="reference">
          <div className="landing-section-head">
            <div>
              <div className="landing-eyebrow dark">Reference</div>
              <h2>Kde už se s Depem měřilo</h2>
            </div>
            <p>Akce, které pořadatelé sami zveřejnili. Klikni na bod a podívej se na výsledky.</p>
          </div>
          <ReferenceMapa reference={reference} odkazNaVysledky={(id) => vysledkyHref(`/?akce=${id}`)} />
        </section>
      )}

      <section className="landing-sports-strip">
        <div className="landing-sports-strip-inner">
          <span className="landing-sports-label">Podporované sporty</span>
          <div className="landing-sports-tags">
            {["Běh", "Cyklistika", "Triatlon a duatlon", "Orientační běh", "Běžky", "Inline brusle"].map((sport) => (
              <span key={sport} className="landing-sports-tag">
                {sport}
              </span>
            ))}
            <span className="landing-sports-tag accent">+ cokoliv se startovními čísly, ručně nebo přes RFID čip</span>
          </div>
        </div>
      </section>

      <section className="landing-section" id="proc-depo">
        <div className="landing-section-head">
          <h2>Proč ne excelová tabulka nebo drahý systém</h2>
          <p>Mezi papírem a stopkami a profesionální časomírou za desetitisíce je prázdné místo — tam patří Depo.</p>
        </div>
        <div className="landing-compare">
          <div className="landing-compare-card">
            <div className="landing-compare-head">
              <h3>Papír a Excel</h3>
              <span className="landing-compare-price">zdarma</span>
            </div>
            <ul>
              <li className="no">Ruční přepis časů = chybovost</li>
              <li className="no">Žádná synchronizace mezi stanovišti</li>
              <li className="no">Výsledky až hodiny po doběhu posledního</li>
            </ul>
          </div>
          <div className="landing-compare-card">
            <div className="landing-compare-head">
              <h3>Free desktop nástroje</h3>
              <span className="landing-compare-price">zdarma</span>
            </div>
            <p className="landing-compare-sub">např. PikaTimer, fsTimer</p>
            <ul>
              <li className="yes">Export výsledků, traťové rekordy</li>
              <li className="no">Jeden počítač, jedna obsluha</li>
              <li className="no">Víc lidí na trati spolu nesynchronizují</li>
            </ul>
          </div>
          <div className="landing-compare-card">
            <div className="landing-compare-head">
              <h3>Profesionální systémy</h3>
              <span className="landing-compare-price">desetitisíce Kč</span>
            </div>
            <p className="landing-compare-sub">RFID transpondéry, licence, podpora</p>
            <ul>
              <li className="yes">RFID přesnost, škálovatelnost</li>
              <li className="no">Cena mimo rozpočet klubového závodu</li>
              <li className="no">Nutný nákup/pronájem hardwaru předem</li>
            </ul>
          </div>
          <div className="landing-compare-card featured">
            <div className="landing-compare-badge">Depo</div>
            <div className="landing-compare-head">
              <h3>Depo</h3>
              <span className="landing-compare-price accent">zdarma</span>
            </div>
            <p className="landing-compare-sub">Open-source, běží ve vašem prohlížeči</p>
            <ul>
              <li className="yes">Víc zařízení, víc stanovišť, i offline</li>
              <li className="yes">Živé výsledky + FTP/SFTP export na váš web</li>
              <li className="yes">Žádný nákup hardwaru — jen telefony, co máte</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-section" id="kontakt">
        <div className="landing-section-head">
          <div>
            <div className="landing-eyebrow dark">Kontakt</div>
            <h2>Napiš nám</h2>
          </div>
          <p>Dotaz, nápad, nebo chceš Depo vyzkoušet na svém závodě? Odpovídáme e-mailem.</p>
        </div>
        <div className="landing-kontakt">
          <div className="landing-kontakt-hlavni">
            <KontaktniFormular />
          </div>
          <div className="landing-kontakt-seznam">
            <a className="landing-kontakt-polozka" href="mailto:info@depotime.cz">
              <span className="landing-feature-ikona">
                <Ikona nazev="email" />
              </span>
              <div>
                <strong>Dotazy, nápady a spolupráce</strong>
                <span>info@depotime.cz</span>
              </div>
            </a>
            <a className="landing-kontakt-polozka" href="tel:+420604371610">
              <span className="landing-feature-ikona">
                <Ikona nazev="telefon" />
              </span>
              <div>
                <strong>Telefon</strong>
                <span>+420 604 371 610</span>
              </div>
            </a>
            <a className="landing-kontakt-polozka" href="mailto:gdpr@depotime.cz">
              <span className="landing-feature-ikona">
                <Ikona nazev="kontrola" />
              </span>
              <div>
                <strong>Ochrana osobních údajů</strong>
                <span>gdpr@depotime.cz</span>
              </div>
            </a>
            <div className="landing-kontakt-provozovatel">
              Provozovatel: Tomáš Sklenář, IČO <span className="mono">06755071</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="cenik">
        <div className="landing-section-head">
          <div>
            <div className="landing-eyebrow dark">Ceník</div>
            <h2>Platíš za akci, ne za měsíce</h2>
          </div>
          <p>Všechny funkce jsou ve všech úrovních. Žádné skryté poplatky ani platba za startovní číslo navíc.</p>
        </div>
        <div className="landing-tarify">
          <div className="landing-tarif">
            <div className="landing-tarif-nazev">Zdarma</div>
            <div className="landing-tarif-cena">
              0 Kč
            </div>
            <p className="landing-tarif-pro">Zkouška a malé závody do 50 závodníků</p>
            <ul>
              <li className="yes">Všechny funkce Depa</li>
              <li className="yes">Online registrace, e-maily, výsledky, kiosk</li>
              <li className="yes">Měření i offline, RFID, FTP/SFTP export</li>
              <li className="yes">Bez časového omezení</li>
            </ul>
            <a href={appHref("/dashboard")} className="btn-pill">
              Začít zdarma
            </a>
          </div>
          <div className="landing-tarif featured">
            <span className="landing-tarif-stitek">Nejčastější</span>
            <div className="landing-tarif-nazev">Akce</div>
            <div className="landing-tarif-cena">
              590 Kč <small>/ akce</small>
            </div>
            <p className="landing-tarif-pro">Do 300 závodníků, každých dalších 100 za 50 Kč</p>
            <ul>
              <li className="yes">Všechny funkce Depa</li>
              <li className="yes">Do 300 závodníků, dalších 100 za 50 Kč</li>
              <li className="yes">Neomezený počet tratí a zařízení</li>
              <li className="yes">Víc uživatelů, role a přístupy</li>
              <li className="yes">Faktura po akci, splatnost 14 dnů</li>
            </ul>
            <a href={appHref("/dashboard")} className="btn-pill accent">
              Založit akci
            </a>
          </div>
          <div className="landing-tarif">
            <div className="landing-tarif-nazev">Podpora</div>
            <div className="landing-tarif-cena">
              Dle domluvy
            </div>
            <p className="landing-tarif-pro">Nepovinná služba nad rámec aplikace</p>
            <ul>
              <li className="yes">Nastavení akce, tratí a kategorií</li>
              <li className="yes">Příprava startovní listiny a importu</li>
              <li className="yes">Zaškolení obsluhy před závodem</li>
              <li className="yes">Pohotovost na telefonu během závodu</li>
            </ul>
            <a
              href="mailto:info@depotime.cz?subject=Podpora%20Depo%20na%20z%C3%A1vod&body=N%C3%A1zev%20a%20datum%20z%C3%A1vodu%3A%0AC%C3%ADl%20(nastaven%C3%AD%2C%20za%C5%A1kolen%C3%AD%2C%20podpora%20b%C4%9Bhem%20z%C3%A1vodu)%3A%0A"
              className="btn-pill"
            >
              Napsat nám
            </a>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <h2>Vyzkoušejte Depo na příštím závodě</h2>
          <p>Stačí prohlížeč — žádná instalace, žádný účet navíc pro diváky.</p>
        </div>
        <a href={appHref("/dashboard")} className="btn-pill accent" style={{ padding: "12px 22px", fontSize: 14 }}>
          Založit závod
        </a>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/depo-mark.svg" alt="" width={28} height={28} />
            Depo
            <span className="landing-footer-copy">© {new Date().getFullYear()}</span>
          </div>
          <div className="landing-footer-links">
            <Link to="/napoveda">Nápověda</Link>
            <a href="#kontakt">Kontakt</a>
            <Link to="/zasady-ochrany-osobnich-udaju">Zásady ochrany osobních údajů</Link>
            <a href="mailto:info@depotime.cz">info@depotime.cz</a>
          </div>
        </div>
      </footer>

      {lightbox && (
        <div className="landing-lightbox" onClick={() => setLightbox(null)}>
          <button
            type="button"
            className="landing-lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Zavřít náhled"
          >
            ×
          </button>
          <img src={lightbox.src} alt={lightbox.alt} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
