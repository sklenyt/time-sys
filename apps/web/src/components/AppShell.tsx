import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUserDto } from "@depo/shared";
import { api, clearTokens } from "../lib/api";

export type NavKey =
  | "prehled"
  | "sprava"
  | "mereni"
  | "listina"
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
  href: (routeId?: string, eventId?: string) => string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "prehled", label: "Přehled akce", href: () => "/dashboard" },
  { key: "sprava", label: "Správa akcí", href: () => "/sprava" },
  { key: "mereni", label: "Měření", needsRoute: true, href: (routeId) => `/mereni/${routeId}` },
  { key: "listina", label: "Startovní listina", needsRoute: true, href: (routeId) => `/startovni-listina/${routeId}` },
  { key: "bezi", label: "Kdo ještě běží", needsRoute: true, href: (routeId) => `/kdo-bezi/${routeId}` },
  { key: "vysledky", label: "Výsledky", needsRoute: true, href: (routeId) => `/vysledky/${routeId}` },
  { key: "kolize", label: "Kolize", needsRoute: true, href: (routeId) => `/konflikty/${routeId}` },
  { key: "audit", label: "Audit log", needsRoute: true, href: (routeId) => `/audit/${routeId}` },
  { key: "publikace", label: "Publikace", needsEvent: true, href: (_r, eventId) => `/publikace/${eventId}` },
  { key: "reporty", label: "Reporty", href: () => "/reporty" },
];

const NAV_BY_KEY = new Map(NAV_ITEMS.map((i) => [i.key, i]));
const VYCHOZI_PORADI: NavKey[] = NAV_ITEMS.map((i) => i.key);

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
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [poradi, setPoradi] = useState<NavKey[]>(VYCHOZI_PORADI);
  const [tazeneKey, setTazeneKey] = useState<NavKey | null>(null);

  useEffect(() => {
    api
      .get<AuthUserDto>("/auth/me")
      .then((u) => {
        setUser(u);
        setPoradi(slouzitPoradi(u.poradiMenu));
      })
      .catch(() => {
        // Sidebar funguje i bez znalosti jména přihlášeného uživatele.
      });
  }, []);

  function odhlasit() {
    clearTokens();
    navigate("/login");
  }

  /** Přesune položku na pozici jiné a hned uloží nové pořadí k účtu (napříč zařízeními). */
  function presunoutNa(cilKey: NavKey) {
    if (!tazeneKey || tazeneKey === cilKey) return;
    setPoradi((aktualni) => {
      const bezTazene = aktualni.filter((k) => k !== tazeneKey);
      const cilIndex = bezTazene.indexOf(cilKey);
      const nove = [...bezTazene.slice(0, cilIndex), tazeneKey, ...bezTazene.slice(cilIndex)];
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
        <nav className="app-sidebar-nav">
          {poradi.map((key) => {
            const item = NAV_BY_KEY.get(key);
            if (!item) return null;
            const disabled = (item.needsRoute && !routeId) || (item.needsEvent && !eventId);
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
                ) : (
                  <Link
                    to={item.href(routeId, eventId)}
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
          <button className="app-nav-link" onClick={odhlasit}>
            Odhlásit se
          </button>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
