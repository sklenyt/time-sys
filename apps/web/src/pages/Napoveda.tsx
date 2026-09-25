import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Marked } from "marked";
import { CLANEK_PODLE_SLUGU, CLANKY, SEKCE, kotva, type Clanek } from "../napoveda/clanky";
import { hledat, uryvek, type Vysledek } from "../napoveda/hledani";
import { appHref } from "../lib/domeny";
import "../styles/napoveda.css";

const markdown = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth, text }) {
      const obsah = this.parser.parseInline(tokens);
      if (depth === 2 || depth === 3) {
        const id = kotva(text);
        return `<h${depth} id="${id}"><a class="napoveda-kotva" href="#${id}" aria-hidden="true">#</a>${obsah}</h${depth}>`;
      }
      return `<h${depth}>${obsah}</h${depth}>`;
    },
  },
});

function useTitulek(titulek: string) {
  useEffect(() => {
    const puvodni = document.title;
    document.title = titulek;
    return () => {
      document.title = puvodni;
    };
  }, [titulek]);
}

function Uryvek({ v }: { v: Vysledek }) {
  return (
    <>
      {uryvek(v.text, v.terms).map((u, i) => (u.zvyraznit ? <mark key={i}>{u.text}</mark> : <span key={i}>{u.text}</span>))}
    </>
  );
}

function odkazNa(v: { slug: string; kotva: string }) {
  return `/napoveda/${v.slug}${v.kotva ? `#${v.kotva}` : ""}`;
}

function Hledani({ dotaz, onDotaz }: { dotaz: string; onDotaz: (q: string) => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [vybrany, setVybrany] = useState(0);
  const vysledky = useMemo(() => hledat(dotaz), [dotaz]);

  useEffect(() => setVybrany(0), [dotaz]);

  // „/“ kdekoli na stránce skočí do hledání (jako na GitHubu nebo v dokumentacích).
  useEffect(() => {
    function naKlavesu(e: KeyboardEvent) {
      const cil = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(cil.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", naKlavesu);
    return () => window.removeEventListener("keydown", naKlavesu);
  }, []);

  function otevrit(v: Vysledek) {
    onDotaz("");
    navigate(odkazNa(v));
  }

  function naKlavesuVPoli(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setVybrany((i) => Math.min(i + 1, vysledky.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setVybrany((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && vysledky[vybrany]) {
      e.preventDefault();
      otevrit(vysledky[vybrany]);
    } else if (e.key === "Escape") {
      onDotaz("");
    }
  }

  return (
    <div className="napoveda-hledani">
      <div className="napoveda-hledani-pole">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={dotaz}
          onChange={(e) => onDotaz(e.target.value)}
          onKeyDown={naKlavesuVPoli}
          placeholder="Hledat v nápovědě — např. offline, import CSV, kiosk…"
          aria-label="Hledat v nápovědě"
          aria-controls="napoveda-vysledky"
          autoComplete="off"
        />
        <kbd className="napoveda-kbd" aria-hidden="true">
          /
        </kbd>
      </div>
      {dotaz.trim() && (
        <div id="napoveda-vysledky" className="napoveda-vysledky" role="listbox" aria-label="Výsledky hledání">
          <div className="napoveda-vysledky-pocet">
            {vysledky.length === 0
              ? `Pro „${dotaz.trim()}“ nic nenalezeno. Zkuste jiné slovo nebo projděte obsah vlevo.`
              : `${vysledky.length} ${vysledky.length === 1 ? "výsledek" : vysledky.length < 5 ? "výsledky" : "výsledků"}`}
          </div>
          {vysledky.map((v, i) => (
            <Link
              key={v.id}
              to={odkazNa(v)}
              onClick={() => onDotaz("")}
              onMouseEnter={() => setVybrany(i)}
              className={`napoveda-vysledek${i === vybrany ? " vybrany" : ""}`}
              role="option"
              aria-selected={i === vybrany}
            >
              <div className="napoveda-vysledek-cesta">
                {v.sekce} › {v.titulek}
                {v.nadpis && <> › {v.nadpis}</>}
              </div>
              <div className="napoveda-vysledek-uryvek">
                <Uryvek v={v} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Obsah({ aktivni }: { aktivni?: string }) {
  return (
    <nav className="napoveda-obsah" aria-label="Obsah nápovědy">
      {SEKCE.map((sekce) => (
        <div key={sekce} className="napoveda-obsah-sekce">
          <div className="napoveda-obsah-nadpis">{sekce}</div>
          {CLANKY.filter((c) => c.sekce === sekce).map((c) => (
            <Link
              key={c.slug}
              to={`/napoveda/${c.slug}`}
              className={c.slug === aktivni ? "aktivni" : undefined}
              aria-current={c.slug === aktivni ? "page" : undefined}
            >
              {c.titulek}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Uvod() {
  useTitulek("Nápověda — Depo");
  return (
    <div className="napoveda-uvod">
      <h1>Nápověda k Depu</h1>
      <p className="napoveda-lede">
        Všechno, co potřebujete od založení závodu přes měření v cíli až po výsledky na webu. Začněte průvodcem{" "}
        <Link to="/napoveda/prvni-zavod">První závod krok za krokem</Link>, nebo nahoře vyhledejte, co právě řešíte.
      </p>
      <div className="napoveda-karty">
        {SEKCE.map((sekce) => (
          <section key={sekce} className="napoveda-karta">
            <h2>{sekce}</h2>
            <ul>
              {CLANKY.filter((c) => c.sekce === sekce).map((c) => (
                <li key={c.slug}>
                  <Link to={`/napoveda/${c.slug}`}>{c.titulek}</Link>
                  {c.popis && <span>{c.popis}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ClanekStranka({ clanek }: { clanek: Clanek }) {
  const navigate = useNavigate();
  const location = useLocation();
  const html = useMemo(() => markdown.parse(clanek.obsah) as string, [clanek]);
  useTitulek(`${clanek.titulek} — Nápověda Depo`);

  const index = CLANKY.indexOf(clanek);
  const predchozi = CLANKY[index - 1];
  const dalsi = CLANKY[index + 1];

  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const cil = id ? document.getElementById(id) : null;
    if (cil) {
      cil.scrollIntoView({ block: "start" });
      cil.classList.add("napoveda-zvyrazneno");
      const t = setTimeout(() => cil.classList.remove("napoveda-zvyrazneno"), 1800);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [clanek, location.hash]);

  // Odkazy mezi články v Markdownu jsou obyčejné <a> — bez tohohle by každý klik načítal celou stránku znovu.
  function naKlik(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!a || !href || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    if (href.startsWith("/napoveda")) {
      e.preventDefault();
      navigate(href);
    } else if (href.startsWith("#")) {
      e.preventDefault();
      navigate({ hash: href });
    }
  }

  const podnadpisy = useMemo(() => clanek.obsah.match(/^## .+$/gm)?.map((r) => r.slice(3).trim()) ?? [], [clanek]);

  return (
    <article className="napoveda-clanek">
      <div className="napoveda-drobecky">
        <Link to="/napoveda">Nápověda</Link> › {clanek.sekce}
      </div>
      <h1>{clanek.titulek}</h1>
      {clanek.popis && <p className="napoveda-lede">{clanek.popis}</p>}
      {podnadpisy.length > 2 && (
        <div className="napoveda-na-strance">
          <div className="napoveda-na-strance-nadpis">V tomto článku</div>
          <ul>
            {podnadpisy.map((n) => (
              <li key={n}>
                <a href={`#${kotva(n)}`} onClick={naKlik}>
                  {n}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="napoveda-text" onClick={naKlik} dangerouslySetInnerHTML={{ __html: html }} />
      <div className="napoveda-listovani">
        {predchozi ? (
          <Link to={`/napoveda/${predchozi.slug}`} className="predchozi">
            <span>← Předchozí</span>
            {predchozi.titulek}
          </Link>
        ) : (
          <span />
        )}
        {dalsi && (
          <Link to={`/napoveda/${dalsi.slug}`} className="dalsi">
            <span>Další →</span>
            {dalsi.titulek}
          </Link>
        )}
      </div>
    </article>
  );
}

export function Napoveda() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dotaz = searchParams.get("q") ?? "";
  const clanek = slug ? CLANEK_PODLE_SLUGU.get(slug) : undefined;

  function nastavitDotaz(q: string) {
    const dalsi = new URLSearchParams(searchParams);
    if (q) dalsi.set("q", q);
    else dalsi.delete("q");
    setSearchParams(dalsi, { replace: true });
  }

  return (
    <div className="landing napoveda">
      <header className="landing-nav">
        <Link to="/napoveda" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <img src="/depo-mark.svg" alt="" width={52} height={52} />
          Depo <span className="napoveda-znacka">Nápověda</span>
        </Link>
        <nav className="landing-nav-links">
          <a href="/">Web Depa</a>
          <a href={appHref("/dashboard")}>Do aplikace</a>
        </nav>
      </header>

      <div className="napoveda-hledani-pas">
        <Hledani dotaz={dotaz} onDotaz={nastavitDotaz} />
      </div>

      <div className="napoveda-rozlozeni">
        <aside className="napoveda-bok">
          <details className="napoveda-obsah-mobil">
            <summary>Obsah nápovědy</summary>
            <Obsah aktivni={clanek?.slug} />
          </details>
          <div className="napoveda-obsah-desktop">
            <Obsah aktivni={clanek?.slug} />
          </div>
        </aside>
        <main className="napoveda-hlavni">
          {slug && !clanek ? (
            <div className="napoveda-clanek">
              <h1>Článek nenalezen</h1>
              <p>
                Tahle stránka nápovědy neexistuje nebo byla přejmenována. Zkuste vyhledávání nahoře, nebo se vraťte na{" "}
                <Link to="/napoveda">úvod nápovědy</Link>.
              </p>
            </div>
          ) : clanek ? (
            <ClanekStranka clanek={clanek} />
          ) : (
            <Uvod />
          )}
        </main>
      </div>
    </div>
  );
}
