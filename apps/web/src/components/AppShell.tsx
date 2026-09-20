import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUserDto } from "@depo/shared";
import { api, clearTokens } from "../lib/api";

export type NavKey =
  | "prehled"
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
  { key: "mereni", label: "Měření", needsRoute: true, href: (routeId) => `/mereni/${routeId}` },
  { key: "listina", label: "Startovní listina", needsRoute: true, href: (routeId) => `/startovni-listina/${routeId}` },
  { key: "bezi", label: "Kdo ještě běží", needsRoute: true, href: (routeId) => `/kdo-bezi/${routeId}` },
  { key: "vysledky", label: "Výsledky", needsRoute: true, href: (routeId) => `/vysledky/${routeId}` },
  { key: "kolize", label: "Kolize", needsRoute: true, href: (routeId) => `/konflikty/${routeId}` },
  { key: "audit", label: "Audit log", needsRoute: true, href: (routeId) => `/audit/${routeId}` },
  { key: "publikace", label: "Publikace", needsEvent: true, href: (_r, eventId) => `/publikace/${eventId}` },
  { key: "reporty", label: "Reporty", href: () => "/reporty" },
];

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

  useEffect(() => {
    api
      .get<AuthUserDto>("/auth/me")
      .then(setUser)
      .catch(() => {
        // Sidebar funguje i bez znalosti jména přihlášeného uživatele.
      });
  }, []);

  function odhlasit() {
    clearTokens();
    navigate("/login");
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
          <img src="/favicon.svg" alt="" width={26} height={26} />
          <span className="app-sidebar-brand-name">Depo</span>
        </div>
        <nav className="app-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const disabled = (item.needsRoute && !routeId) || (item.needsEvent && !eventId);
            if (disabled) {
              return (
                <span key={item.key} className="app-nav-link disabled">
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.key}
                to={item.href(routeId, eventId)}
                className={`app-nav-link${active === item.key ? " active" : ""}`}
              >
                {item.label}
              </Link>
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
