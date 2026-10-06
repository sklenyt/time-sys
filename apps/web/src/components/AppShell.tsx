import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUserDto, Trasa, Udalost } from "@depo/shared";
import { api, clearTokens } from "../lib/api";
import { vysledkyHref } from "../lib/domeny";

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
  | "reporty";

interface NavItem {
  key: NavKey;
  label: string;
  needsRoute?: boolean;
  needsEvent?: boolean;
  /** Otevírá se jako obyčejný <a target="_blank"> na jinou doménu, ne jako interní <Link>. */
  external?: boolean;
  href: (routeId?: string, eventId?: string) => string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "prehled", label: "Přehled akce", href: () => "/dashboard" },
  { key: "sprava", label: "Správa akcí", href: () => "/sprava" },
  { key: "mereni", label: "Měření", needsRoute: true, href: (routeId) => `/mereni/${routeId}` },
  { key: "listina", label: "Startovní listina", needsRoute: true, href: (routeId) => `/startovni-listina/${routeId}` },
  { key: "cipy", label: "Čipy", needsRoute: true, href: (routeId) => `/cipy/${routeId}` },
  { key: "bezi", label: "Kdo ještě běží", needsRoute: true, href: (routeId) => `/kdo-bezi/${routeId}` },
  {
    key: "vysledky",
    label: "Výsledky",
    needsEvent: true,
    external: true,
    href: (_r, eventId) => vysledkyHref(`/?akce=${eventId}`),
  },
  { key: "kolize", label: "Kolize", needsRoute: true, href: (routeId) => `/konflikty/${routeId}` },
  { key: "audit", label: "Audit log", needsRoute: true, href: (routeId) => `/audit/${routeId}` },
  { key: "publikace", label: "Publikace", needsEvent: true, href: (_r, eventId) => `/publikace/${eventId}` },
  { key: "reporty", label: "Reporty", href: () => "/reporty" },
];

const NAV_BY_KEY = new Map(NAV_ITEMS.map((i) => [i.key, i]));
const VYCHOZI_PORADI: NavKey[] = NAV_ITEMS.map((i) => i.key);

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
  children: React.ReactNode;
}

/**
 * Sdílený shell organizátorských obrazovek — tmavý postranní nav podle
 * docs/07-ui-mockups.md §7.12. Měření a Kiosek si drží vlastní shell bez
 * téhle navigace (§7.3), tam se AppShell nepoužívá.
 */
export function AppShell({ active, routeId, eventId, children }: AppShellProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUserDto | null>(sdilenyUzivatel);
  const [poradi, setPoradi] = useState<NavKey[]>(
    sdilenyUzivatel ? slouzitPoradi(sdilenyUzivatel.poradiMenu) : VYCHOZI_PORADI
  );
  const [tazeneKey, setTazeneKey] = useState<NavKey | null>(null);
  const [prehledTrati, setPrehledTrati] = useState<SkupinaTrati[] | null>(sdilenyPrehledTrati);
  const [, setVerzeKontextu] = useState(0);

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
  const efektivniRouteId = routeId ?? posledniKontext.routeId;
  const efektivniEventId = eventId ?? posledniKontext.eventId;

  /** Přepnutí trati: zapamatuje ji jako aktuální kontext a stránku vázanou na trať otevře pro novou trať. */
  function prepnoutTrat(novaRouteId: string) {
    const skupina = prehledTrati?.find((g) => g.trasy.some((t) => t.id === novaRouteId));
    if (!skupina) return;
    ulozitPosledniKontext(novaRouteId, skupina.udalost.id);
    const aktivniPolozka = NAV_BY_KEY.get(active);
    if (aktivniPolozka?.needsRoute && !aktivniPolozka.external) {
      navigate(aktivniPolozka.href(novaRouteId, skupina.udalost.id));
    } else {
      setVerzeKontextu((v) => v + 1);
    }
  }

  function odhlasit() {
    clearTokens();
    vycistitCacheUzivatele();
    navigate("/login");
  }

  /** Přesune položku na pozici jiné a hned uloží nové pořadí k účtu (napříč zařízeními). */
  function presunoutNa(cilKey: NavKey) {
    if (!tazeneKey || tazeneKey === cilKey) return;
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
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <img src="/depo-mark.svg" alt="" width={26} height={26} />
          <span className="app-sidebar-brand-name">Depo</span>
        </div>
        {prehledTrati && prehledTrati.some((g) => g.trasy.length > 0) && (
          <div className="app-trasa-prepinac">
            <label htmlFor="app-trasa-select">Akce a trať</label>
            <select
              id="app-trasa-select"
              value={efektivniRouteId ?? ""}
              onChange={(e) => prepnoutTrat(e.target.value)}
            >
              {!efektivniRouteId && <option value="">Vyberte trať…</option>}
              {efektivniRouteId && !prehledTrati.some((g) => g.trasy.some((t) => t.id === efektivniRouteId)) && (
                <option value={efektivniRouteId}>(trať z ukončené akce)</option>
              )}
              {prehledTrati
                .filter((g) => g.trasy.length > 0)
                .map((g) => (
                  <optgroup key={g.udalost.id} label={g.udalost.nazev}>
                    {g.trasy.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nazev}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </div>
        )}
        <nav className="app-sidebar-nav">
          {poradi.map((key) => {
            const item = NAV_BY_KEY.get(key);
            if (!item) return null;
            const disabled = (item.needsRoute && !efektivniRouteId) || (item.needsEvent && !efektivniEventId);
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
                    {item.label}
                  </button>
                ) : item.external ? (
                  <a
                    href={item.href(efektivniRouteId, efektivniEventId)}
                    target="_blank"
                    rel="noreferrer"
                    className="app-nav-link"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    to={item.href(efektivniRouteId, efektivniEventId)}
                    className={`app-nav-link${active === item.key ? " active" : ""}`}
                    aria-current={active === item.key ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
        <div className="app-sidebar-footer">
          {user && (
            <div className="app-user">
              <span className="app-user-avatar">{initialy}</span>
              <span>{user.jmeno}</span>
            </div>
          )}
          <a href="/napoveda" target="_blank" rel="noreferrer" className="app-nav-link">
            Nápověda
          </a>
          <button className="app-nav-link" onClick={odhlasit}>
            Odhlásit se
          </button>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
