import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { appHref } from "../lib/domeny";

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

export function Landing() {
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

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
          <a href="#proc-depo">Proč Depo</a>
          <a href="#cenik">Ceník</a>
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
              Depo měří na telefonu i iPadu, funguje bez signálu a výsledky posílá na váš klubový web hned po
              doběhu — bez ruční synchronizace mezi stanovišti.
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

      <section className="landing-section" id="cenik">
        <div className="landing-section-head">
          <h2>Ceník</h2>
          <p>Žádné skryté poplatky ani platby za startovní číslo navíc.</p>
        </div>
        <div className="landing-pricing">
          <div className="landing-pricing-card">
            <div className="landing-pricing-badge">Pro kluby a komunitní závody</div>
            <div className="landing-pricing-value">Zdarma</div>
            <p>Založte závod bez poplatků — neomezený počet závodů, závodníků i zařízení.</p>
            <ul>
              <li className="yes">Offline měření na libovolném počtu stanovišť</li>
              <li className="yes">Živé výsledky + FTP/SFTP export na váš web</li>
              <li className="yes">RFID i ruční zápis, audit log, role a přístupy</li>
            </ul>
            <a href={appHref("/dashboard")} className="btn-pill accent">
              Založit závod zdarma
            </a>
          </div>
          <div className="landing-pricing-support">
            <div>
              <h3>Podpořte vývoj</h3>
              <p>Depo píšu a udržuju sám ve volném čase. Pokud vám ušetří práci na závodě, budu rád za dobrovolný příspěvek na další vývoj — libovolnou částkou.</p>
            </div>
            <div className="landing-pricing-qr">
              <img src="/qr-platba.jpg" alt="QR platba na podporu vývoje Depo" width={200} height={200} />
              <span>Naskenujte bankovní aplikací</span>
            </div>
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
          </div>
          <div className="landing-footer-links">
            <Link to="/napoveda">Nápověda</Link>
            <Link to="/zasady-ochrany-osobnich-udaju">Zásady ochrany osobních údajů</Link>
            <a href="mailto:gdpr@depotime.cz">gdpr@depotime.cz</a>
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
