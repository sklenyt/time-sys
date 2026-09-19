import type { VysledkyResponseDto } from "@depo/shared";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Statická HTML stránka výsledků pro FTP/SFTP export (F34, F36) — stejná
 * data jako GET /routes/:id/results, jiný výstupní formát. Volitelná
 * hlavička organizátora (html_sablona / udalost.html_hlavicka) se vkládá
 * beze změny, aby exportovaná stránka ladila s webem klubu.
 */
export function renderResultsHtml(
  trasaNazev: string,
  vysledky: VysledkyResponseDto,
  hlavicka?: string | null
): string {
  const radky = vysledky.klasifikovani
    .map(
      (p) => `<tr>
        <td>${p.poradiCelkove}</td>
        <td>${p.poradiKategorie}</td>
        <td>${p.startovniCislo}</td>
        <td>${escapeHtml(p.prijmeni)} ${escapeHtml(p.jmeno)}</td>
        <td>${escapeHtml(p.kategorieKod)}</td>
        <td>${p.casCelkem}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>Výsledky — ${escapeHtml(trasaNazev)}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #121b2c; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #dde0e6; }
  th { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; color: #56606e; }
  td:first-child, td:nth-child(2), td:nth-child(3) { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
${hlavicka ?? ""}
<h1>Výsledky — ${escapeHtml(trasaNazev)}</h1>
<table>
  <thead><tr><th>Celk.</th><th>Kat.</th><th>Č.</th><th>Jméno</th><th>Kategorie</th><th>Čas</th></tr></thead>
  <tbody>
${radky}
  </tbody>
</table>
</body>
</html>
`;
}
