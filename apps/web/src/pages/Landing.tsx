import { useEffect, useState } from "react";
import type { ReferenceDto } from "@depo/shared";
import { api } from "../lib/api";
import { vysledkyHref } from "../lib/domeny";
import { ReferenceMapa } from "../components/ReferenceMapa";
import { Link } from "react-router-dom";
import { appHref } from "../lib/domeny";
import { Ikona } from "../components/IkonyMenu";

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
      <header className="landing-nav">
        <div className="brand">
          <img src="/depo-mark.svg" alt="" width={68} height={68} />
          Depo
        </div>
        <nav className="landing-nav-links">
          <a href="#jak-to-funguje">Jak to funguje</a>
          <a href="#funkce">Co umí</a>
          {maReference && <a href="#reference">Reference</a>}
          <a href="#proc-depo">Proč Depo</a>
          <a href="#cenik">Ceník</a>
          <a href="#kontakt">Kontakt</a>
          <a href="https://vysledky.depotime.cz">Výsledky</a>
          <Link to="/napoveda">Nápověda</Link>
        </nav>
        <div className="landing-nav-cta">
          <a href={appHref("/login")} className="btn-pill outline-light">
            Přihlásit se
          </a>
          <a href={appHref("/dashboard")} className="btn-pill accent">
            Vyzkoušet zdarma
          </a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div>
            <div className="landing-eyebrow">Časomíra pro sportovní závody</div>
            <h1>
              Zadej číslo.
              <br />
              Stiskni Enter.
              <br />
              Máš výsledky.
            </h1>
            <p className="lede">
              Depo přijímá registrace, měří na telefonu i iPadu, funguje bez signálu a výsledky posílá na váš
              klubový web hned po doběhu. Bez ruční synchronizace mezi stanovišti.
            </p>
            <div className="landing-hero-actions">
              <a href={appHref("/dashboard")} className="btn-pill accent" style={{ padding: "12px 22px", fontSize: 14 }}>
                Založit první závod
              </a>
              <a href="#jak-to-funguje" className="btn-pill outline-light" style={{ padding: "12px 22px", fontSize: 14 }}>
                Jak to funguje
              </a>
            </div>
            <div className="landing-metric-row">
              <div className="landing-metric">
                <div className="n">100 %</div>
                <div className="l">funkční offline</div>
              </div>
              <div className="landing-metric">
                <div className="n">0,01 s</div>
                <div className="l">rozlišení času</div>
              </div>
              <div className="landing-metric">
                <div className="n">FTP</div>
                <div className="l">export na váš web</div>
              </div>
              <div className="landing-metric">
                <div className="n">RFID</div>
                <div className="l">i čipová časomíra</div>
              </div>
            </div>
          </div>

          {/* Skutečný snímek obrazovky Měření (ne mockup) — viz F06, workflow číslo + Enter. */}
          <div className="landing-device">
            <Screenshot
              src="/screenshots/mereni.png"
              alt="Obrazovka Měření v aplikaci Depo se zadaným startovním číslem 147"
              onOpen={setLightbox}
            />
            <div className="landing-device-caption">
              <span className="landing-device-chip">offline</span>
              Zápis čísla + Enter — přesně tahle obrazovka, žádný mockup
            </div>
          </div>
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
            <h3>Chceš Depo na svůj závod?</h3>
            <p>Napiš, kdy a kde se závod koná, kolik bude závodníků a co potřebuješ (registraci, měření, výsledky). Pomůžeme ti s nastavením.</p>
            <a
              className="btn-pill accent"
              style={{ padding: "12px 22px", fontSize: 14 }}
              href="mailto:info@depotime.cz?subject=Depo%20na%20n%C3%A1%C5%A1%20z%C3%A1vod&body=N%C3%A1zev%20a%20datum%20z%C3%A1vodu%3A%0AP%C5%99ibli%C5%BEn%C3%BD%20po%C4%8Det%20z%C3%A1vodn%C3%ADk%C5%AF%3A%0ACo%20pot%C5%99ebujeme%20(registrace%2C%20m%C4%9B%C5%99en%C3%AD%2C%20v%C3%BDsledky)%3A%0A"
            >
              Napsat na info@depotime.cz
            </a>
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
