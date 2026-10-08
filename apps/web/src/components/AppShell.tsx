import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUserDto, Trasa, Udalost } from "@depo/shared";
import { api, clearTokens } from "../lib/api";
import { vysledkyHref } from "../lib/domeny";
import { useTema } from "../lib/tema";
import { TemaPrepinac } from "./TemaPrepinac";
import { Ikona } from "./IkonyMenu";

export type NavKey =
  | "prehled"
  | "sprava"
  | "mereni"
  | "listina"
  | "cipy"
  | "bezi"
  | "vysledky"
  | "kolize"
  | "audit"
  | "publikace"
  | "reporty"
  | "uzivatele";

type SkupinaMenu = "uvod" | "priprava" | "zavod" | "vysledky" | "organizace";

const SKUPINY: { klic: SkupinaMenu; nazev: string | null }[] = [
  { klic: "uvod", nazev: null },
  { klic: "priprava", nazev: "Příprava" },
  { klic: "zavod", nazev: "Závod" },
  { klic: "vysledky", nazev: "Výsledky a data" },
  { klic: "organizace", nazev: "Organizace" },
];

interface NavItem {
  key: NavKey;
  label: string;
  skupina: SkupinaMenu;
  needsRoute?: boolean;
  needsEvent?: boolean;
  /** Otevírá se jako obyčejný <a target="_blank"> na jinou doménu, ne jako interní <Link>. */
  external?: boolean;
  href: (routeId?: string, eventId?: string) => string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "prehled", label: "Přehled akce", skupina: "uvod", href: () => "/dashboard" },
  { key: "sprava", label: "Správa akcí", skupina: "priprava", href: () => "/sprava" },
  { key: "mereni", label: "Měření", skupina: "zavod", needsRoute: true, href: (routeId) => `/mereni/${routeId}` },
  { key: "listina", label: "Startovní listina", skupina: "priprava", needsEvent: true, href: (_r, eventId) => `/startovni-listina/akce/${eventId}` },
  { key: "cipy", label: "Čipy", skupina: "priprava", needsRoute: true, href: (routeId) => `/cipy/${routeId}` },
  { key: "bezi", label: "Kdo ještě běží", skupina: "zavod", needsRoute: true, href: (routeId) => `/kdo-bezi/${routeId}` },
  {
    key: "vysledky",
    label: "Výsledky",
    skupina: "vysledky",
    needsEvent: true,
    external: true,
    href: (_r, eventId) => vysledkyHref(`/?akce=${eventId}`),
  },
  { key: "kolize", label: "Kolize", skupina: "zavod", needsRoute: true, href: (routeId) => `/konflikty/${routeId}` },
  { key: "audit", label: "Audit log", skupina: "vysledky", needsRoute: true, href: (routeId) => `/audit/${routeId}` },
  { key: "publikace", label: "Publikace", skupina: "vysledky", needsEvent: true, href: (_r, eventId) => `/publikace/${eventId}` },
  { key: "reporty", label: "Reporty", skupina: "vysledky", href: () => "/reporty" },
  { key: "uzivatele", label: "Uživatelé", skupina: "organizace", href: () => "/uzivatele" },
];

const NAV_BY_KEY = new Map(NAV_ITEMS.map((i) => [i.key, i]));
const VYCHOZI_PORADI: NavKey[] = NAV_ITEMS.map((i) => i.key);

interface Odznaky {
  registrace: number;
  kolize: number;
}
const odznakyCache = new Map<string, Odznaky & { cas: number }>();

const POSLEDNI_ROUTE_KEY = "depo_posledni_route_id";
const POSLEDNI_EVENT_KEY = "depo_posledni_event_id";

/**
 * Spousta stránek (Správa akcí, Reporty, ale i Kdo běží/Kolize/Audit) zná
 * jen routeId, ne eventId, nebo nezná ani jedno — bez fallbacku na
 * naposledy navštívenou trať/akci by menu bylo proklikatelné jen z
 * Přehledu akce, což uživatele nutí se tam pořád vracet. Uložení je čistě
 * per-prohlížeč pohodlí (ne zdroj pravdy), proto try/catch — v private
 * módu nebo se zablokovaným úložištěm menu prostě jen nebude mít fallback.
 */
function ulozitPosledniKontext(routeId?: string, eventId?: string) {
  try {
    if (routeId) localStorage.setItem(POSLEDNI_ROUTE_KEY, routeId);
    if (eventId) localStorage.setItem(POSLEDNI_EVENT_KEY, eventId);
  } catch {
    // localStorage nedostupné — fallback se příště jednoduše neuplatní
  }
}

function nacistPosledniKontext(): { routeId?: string; eventId?: string } {
  try {
    return {
      routeId: localStorage.getItem(POSLEDNI_ROUTE_KEY) ?? undefined,
      eventId: localStorage.getItem(POSLEDNI_EVENT_KEY) ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Sloučí uložené pořadí uživatele s výchozím — položky z uloženého pořadí
 * jdou první (jen ty, co v appce pořád existují), zbytek (nové položky menu
 * přidané po uložení, nebo když uživatel ještě nic nepřeuspořádal) se
 * doplní na konec ve výchozím pořadí.
 */
function slouzitPoradi(ulozene: string[]): NavKey[] {
  const platne = ulozene.filter((k): k is NavKey => VYCHOZI_PORADI.includes(k as NavKey));
  const zbyva = VYCHOZI_PORADI.filter((k) => !platne.includes(k));
  return [...platne, ...zbyva];
}

/**
 * AppShell se v aktuálním routingu (viz App.tsx) mountuje znovu na každé
 * stránce — bez cache by to znamenalo nový /auth/me dotaz a viditelné
 * probliknutí menu (nejdřív výchozí pořadí, pak přeskládání) při každém
 * kliknutí. Modulová proměnná přežije mezi mounty v rámci jedné návštěvy
 * appky, takže menu se po prvním načtení vykresluje rovnou staticky.
 */
let sdilenyUzivatel: AuthUserDto | null = null;
let probihajiciNacteni: Promise<AuthUserDto> | null = null;

function nacistUzivatele(): Promise<AuthUserDto> {
  if (sdilenyUzivatel) {
    return Promise.resolve(sdilenyUzivatel);
  }
  if (!probihajiciNacteni) {
    probihajiciNacteni = api
      .get<AuthUserDto>("/auth/me")
      .then((u) => {
        sdilenyUzivatel = u;
        return u;
      })
      .finally(() => {
        probihajiciNacteni = null;
      });
  }
  return probihajiciNacteni;
}

interface SkupinaTrati {
  udalost: Udalost;
  trasy: Trasa[];
}

let sdilenyPrehledTrati: SkupinaTrati[] | null = null;

/** Aktivní (neukončené) akce s jejich tratěmi — pro přepínač trati v postranním menu. */
async function nacistPrehledTrati(): Promise<SkupinaTrati[]> {
  const akce = (await api.get<Udalost[]>("/events")).filter((u) => !u.ukoncena);
  const skupiny = await Promise.all(
    akce.map(async (udalost) => ({ udalost, trasy: await api.get<Trasa[]>(`/events/${udalost.id}/routes`) }))
  );
  sdilenyPrehledTrati = skupiny;
  return skupiny;
}

/** Volat při odhlášení, ať se po přihlášení jiného účtu na chvíli nemihne předchozí jméno/pořadí. */
function vycistitCacheUzivatele() {
  sdilenyPrehledTrati = null;
  sdilenyUzivatel = null;
  probihajiciNacteni = null;
}

/**
 * Vysvětlení, proč položka menu ještě nejde otevřít — nikdy jen tiše
 * neztlumit, klik na ni musí uživatele posunout k řešení (viz Sprava.tsx,
 * kde se tahle hláška zobrazí jako banner po přesměrování).
 */
function duvodNedostupnosti(item: NavItem): string {
  if (item.needsRoute) {
    return `Nejdřív přidejte trať k akci, ať můžete otevřít „${item.label}“.`;
  }
  return `Nejdřív založte akci, ať můžete otevřít „${item.label}“.`;
}

interface AppShellProps {
  active: NavKey;
  routeId?: string;
  eventId?: string;
  /** Pohled na celou akci (záložka „Všechny tratě") — routeId se pak nepoužívá. */
  vsechnyTrate?: boolean;
  children: React.ReactNode;
}

/** Odkaz záložky konkrétní trati — Startovní listina má vlastní adresu pro trať, ostatní obrazovky berou href z menu. */
function hrefZalozkyTrate(key: NavKey, trasaId: string, eventId: string): string {
  return key === "listina" ? `/startovni-listina/${trasaId}` : NAV_BY_KEY.get(key)!.href(trasaId, eventId);
}

/** Obrazovky vázané na trať, kde se nad obsahem zobrazují záložky tratí akce. */
const NAV_SE_ZALOZKAMI: NavKey[] = ["listina", "cipy", "bezi", "kolize", "audit"];

/**
 * Sdílený shell organizátorských obrazovek — tmavý postranní nav podle
 * docs/07-ui-mockups.md §7.12. Měření a Kiosek si drží vlastní shell bez
 * téhle navigace (§7.3), tam se AppShell nepoužívá.
 */
export function AppShell({ active, routeId, eventId, vsechnyTrate, children }: AppShellProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUserDto | null>(sdilenyUzivatel);
  const [poradi, setPoradi] = useState<NavKey[]>(
    sdilenyUzivatel ? slouzitPoradi(sdilenyUzivatel.poradiMenu) : VYCHOZI_PORADI
  );
  const [tazeneKey, setTazeneKey] = useState<NavKey | null>(null);
  const [prehledTrati, setPrehledTrati] = useState<SkupinaTrati[] | null>(sdilenyPrehledTrati);
  const [, setVerzeKontextu] = useState(0);
  const [tema, prepnoutTema] = useTema("depo_panel_tema");
  const [odznaky, setOdznaky] = useState<Odznaky | null>(null);

  useEffect(() => {
    nacistPrehledTrati()
      .then(setPrehledTrati)
      .catch(() => {
        // Bez přepínače se dá dál pracovat s naposledy otevřenou tratí.
      });
  }, []);

  useEffect(() => {
    if (sdilenyUzivatel) return; // už vykresleno synchronně výše, není co dotahovat
    nacistUzivatele()
      .then((u) => {
        setUser(u);
        setPoradi(slouzitPoradi(u.poradiMenu));
      })
      .catch(() => {
        // Sidebar funguje i bez znalosti jména přihlášeného uživatele.
      });
  }, []);

  useEffect(() => {
    ulozitPosledniKontext(routeId, eventId);
  }, [routeId, eventId]);

  // Stránky jako Správa akcí nebo Reporty nemají vlastní trať/akci v URL —
  // bez fallbacku na naposledy navštívenou by z nich nešlo proklikat menu
  // a uživatel by se musel pokaždé vracet na Přehled akce.
  const posledniKontext = nacistPosledniKontext();
  const efektivniEventId = eventId ?? posledniKontext.eventId;
  const skupinaAkce =
    prehledTrati?.find((g) => g.trasy.some((t) => t.id === routeId)) ??
    prehledTrati?.find((g) => g.udalost.id === efektivniEventId);
  // Uložená trať z jiné akce by v menu vedla na cizí trať — vezme se první trať aktuální akce.
  const ulozenaRouteId = posledniKontext.routeId;
  const efektivniRouteId =
    routeId ??
    (skupinaAkce && !skupinaAkce.trasy.some((t) => t.id === ulozenaRouteId) ? skupinaAkce.trasy[0]?.id : ulozenaRouteId);

  /** Přepnutí akce: zapamatuje ji a stránku vázanou na trať otevře pro novou akci (listina rovnou pro celou akci). */
  function prepnoutAkci(novaEventId: string) {
    const skupina = prehledTrati?.find((g) => g.udalost.id === novaEventId);
    if (!skupina) return;
    const prvniTrasa = skupina.trasy[0];
    ulozitPosledniKontext(prvniTrasa?.id, novaEventId);
    const aktivniPolozka = NAV_BY_KEY.get(active);
    if (active === "listina") {
      navigate(`/startovni-listina/akce/${novaEventId}`);
    } else if (aktivniPolozka?.needsRoute && !aktivniPolozka.external && prvniTrasa) {
      navigate(aktivniPolozka.href(prvniTrasa.id, novaEventId));
    } else {
      setVerzeKontextu((v) => v + 1);
    }
  }

  const idAkceProOdznaky = skupinaAkce?.udalost.id;
  useEffect(() => {
    if (!skupinaAkce || !idAkceProOdznaky) return;
    const cache = odznakyCache.get(idAkceProOdznaky);
    if (cache && Date.now() - cache.cas < 60_000) {
      setOdznaky(cache);
      return;
    }
    let zruseno = false;
    Promise.all(
      skupinaAkce.trasy.map((t) =>
        Promise.all([
          api.get<unknown[]>(`/routes/${t.id}/registrations`).catch(() => [] as unknown[]),
          api.get<unknown[]>(`/routes/${t.id}/records/conflicts`).catch(() => [] as unknown[]),
        ])
      )
    ).then((vysledky) => {
      if (zruseno) return;
      const nove = {
        registrace: vysledky.reduce((soucet, [r]) => soucet + r.length, 0),
        kolize: vysledky.reduce((soucet, [, k]) => soucet + k.length, 0),
        cas: Date.now(),
      };
      odznakyCache.set(idAkceProOdznaky, nove);
      setOdznaky(nove);
    });
    return () => {
      zruseno = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAkceProOdznaky]);

  function odhlasit() {
    clearTokens();
    vycistitCacheUzivatele();
    navigate("/login");
  }

  /** Přesune položku na pozici jiné a hned uloží nové pořadí k účtu (napříč zařízeními). */
  function presunoutNa(cilKey: NavKey) {
    if (!tazeneKey || tazeneKey === cilKey) return;
    // Přetahovat jde jen v rámci jedné sekce menu.
    if (NAV_BY_KEY.get(tazeneKey)?.skupina !== NAV_BY_KEY.get(cilKey)?.skupina) return;
    setPoradi((aktualni) => {
      const bezTazene = aktualni.filter((k) => k !== tazeneKey);
      const cilIndex = bezTazene.indexOf(cilKey);
      const nove = [...bezTazene.slice(0, cilIndex), tazeneKey, ...bezTazene.slice(cilIndex)];
      if (sdilenyUzivatel) {
        // Jinak by další mount AppShellu (přechod na jinou stránku) přepsal
        // pořadí zpátky na to staré z cache, viz komentář u nacistUzivatele().
        sdilenyUzivatel = { ...sdilenyUzivatel, poradiMenu: nove };
      }
      api.patch("/auth/me/menu-order", { poradiMenu: nove }).catch(() => {
        // Nekritická cesta — pořadí zůstává lokálně, jen se neuloží pro jiná zařízení.
      });
      return nove;
    });
  }

  const initialy = user?.jmeno
    ? user.jmeno
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <div className="app-shell">
      <aside className={`app-sidebar panel-${tema}`}>
        <div className="app-sidebar-brand">
          <img src="/depo-mark.svg" alt="" width={26} height={26} />
          <span className="app-sidebar-brand-name">Depo</span>
        </div>
        {skupinaAkce && (
          <div className="app-akce">
            <Ikona nazev="akce" />
            <div className="app-akce-text">
              <strong>{skupinaAkce.udalost.nazev}</strong>
              <small>
                {new Date(skupinaAkce.udalost.datum).toLocaleDateString("cs-CZ")} · {skupinaAkce.trasy.length}{" "}
                {skupinaAkce.trasy.length === 1 ? "trať" : skupinaAkce.trasy.length < 5 ? "tratě" : "tratí"}
              </small>
            </div>
            {prehledTrati && prehledTrati.length > 1 && (
              <>
                <Ikona nazev="vyber" />
                <select
                  className="app-akce-select"
                  aria-label="Přepnout akci"
                  value={skupinaAkce.udalost.id}
                  onChange={(e) => prepnoutAkci(e.target.value)}
                >
                  {prehledTrati.map((g) => (
                    <option key={g.udalost.id} value={g.udalost.id}>
                      {g.udalost.nazev}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
        <nav className="app-sidebar-nav">
          {SKUPINY.map((skupina) => {
            const polozky = poradi
              .map((key) => NAV_BY_KEY.get(key))
              .filter((i): i is NavItem => !!i && i.skupina === skupina.klic);
            if (polozky.length === 0) return null;
            return (
              <div key={skupina.klic} className="app-skupina">
                {skupina.nazev && <div className="app-skupina-nadpis">{skupina.nazev}</div>}
                {polozky.map((item) => {
                  const disabled = (item.needsRoute && !efektivniRouteId) || (item.needsEvent && !efektivniEventId);
                  const odznak =
                    item.key === "listina" ? odznaky?.registrace : item.key === "kolize" ? odznaky?.kolize : undefined;
                  const obsah = (
                    <>
                      <Ikona nazev={item.key} />
                      <span className="app-nav-popisek">{item.label}</span>
                      {!!odznak && <span className="app-nav-odznak">{odznak}</span>}
                    </>
                  );
                  return (
                    <div
                      key={item.key}
                      className={`app-nav-item${tazeneKey === item.key ? " dragging" : ""}`}
                      draggable
                      onDragStart={() => setTazeneKey(item.key)}
                      onDragEnd={() => setTazeneKey(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => presunoutNa(item.key)}
                      title="Přetažením změníte pořadí"
                    >
                      <span className="app-nav-handle" aria-hidden="true">
                        ⠿
                      </span>
                      {disabled ? (
                        <button
                          type="button"
                          className="app-nav-link disabled"
                          onClick={() => navigate("/sprava", { state: { hint: duvodNedostupnosti(item) } })}
                        >
                          {obsah}
                        </button>
                      ) : item.external ? (
                        <a
                          href={item.href(efektivniRouteId, efektivniEventId)}
                          target="_blank"
                          rel="noreferrer"
                          className="app-nav-link"
                        >
                          {obsah}
                        </a>
                      ) : (
                        <Link
                          to={item.href(efektivniRouteId, efektivniEventId)}
                          className={`app-nav-link${active === item.key ? " active" : ""}`}
                          aria-current={active === item.key ? "page" : undefined}
                        >
                          {obsah}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="app-sidebar-footer">
          {user && (
            <div className="app-user">
              <span className="app-user-avatar">{initialy}</span>
              <div className="app-user-text">
                <strong>{user.jmeno}</strong>
                {user.superAdmin && <small>Super admin</small>}
              </div>
              <TemaPrepinac tema={tema} onPrepnout={prepnoutTema} />
            </div>
          )}
          <a href="/napoveda" target="_blank" rel="noreferrer" className="app-nav-link">
            <Ikona nazev="napoveda" />
            <span className="app-nav-popisek">Nápověda</span>
          </a>
          <button className="app-nav-link" onClick={odhlasit}>
            <Ikona nazev="odhlasit" />
            <span className="app-nav-popisek">Odhlásit se</span>
          </button>
        </div>
      </aside>
      <main className="app-main">
        {NAV_SE_ZALOZKAMI.includes(active) && skupinaAkce && skupinaAkce.trasy.length > 0 && (
          <div className="app-trat-zalozky" role="tablist" aria-label={`Tratě akce ${skupinaAkce.udalost.nazev}`}>
            <span className="app-trat-akce">{skupinaAkce.udalost.nazev}</span>
            {active === "listina" && (
              <Link
                role="tab"
                aria-selected={!!vsechnyTrate}
                className={`app-trat-zalozka${vsechnyTrate ? " active" : ""}`}
                to={`/startovni-listina/akce/${skupinaAkce.udalost.id}`}
              >
                Všechny tratě
              </Link>
            )}
            {skupinaAkce.trasy.map((t) => {
              const jeAktivni = !vsechnyTrate && t.id === routeId;
              return (
                <Link
                  key={t.id}
                  role="tab"
                  aria-selected={jeAktivni}
                  className={`app-trat-zalozka${jeAktivni ? " active" : ""}`}
                  to={hrefZalozkyTrate(active, t.id, skupinaAkce.udalost.id)}
                >
                  {t.nazev}
                </Link>
              );
            })}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
