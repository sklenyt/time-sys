/**
 * Z marketingové domény (depotime.cz) musí přihlášení/registrace/správa vést
 * na app.depotime.cz (§App.tsx Home()) — na app./vysledky. subdoméně a v
 * dev/preview prostředí (localhost, *.pages.dev) zůstává odkaz relativní.
 */
export function appHref(path: string) {
  const host = window.location.hostname;
  if (host === "depotime.cz" || host === "www.depotime.cz") {
    return `https://app.depotime.cz${path}`;
  }
  return path;
}

/**
 * Odkaz "Výsledky" z appky (app.depotime.cz) musí vést na veřejnou
 * doménu vysledky.depotime.cz, ne zůstat na interní app. doméně — v
 * dev/preview prostředí zůstává relativní, ať jde appku testovat lokálně.
 */
export function vysledkyHref(path: string) {
  const host = window.location.hostname;
  if (host === "app.depotime.cz" || host === "depotime.cz" || host === "www.depotime.cz") {
    return `https://vysledky.depotime.cz${path}`;
  }
  return path;
}
