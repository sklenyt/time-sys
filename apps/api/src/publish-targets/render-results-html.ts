import type { VysledkyResponseDto } from "@depo/shared";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function vykreslitRadky(vysledky: VysledkyResponseDto): string {
  return vysledky.klasifikovani
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
}

function vykreslitTabulku(radky: string): string {
  return `<table>
  <thead><tr><th>Celk.</th><th>Kat.</th><th>Č.</th><th>Jméno</th><th>Kategorie</th><th>Čas</th></tr></thead>
  <tbody>
${radky}
  </tbody>
</table>`;
}

const ZNACKY_SABLONY = ["{{NAZEV_TRASY}}", "{{TABULKA_VYSLEDKU}}", "{{RADKY_VYSLEDKU}}", "{{POCET_KLASIFIKOVANYCH}}", "{{AKTUALIZOVANO}}"];

/**
 * Vlastní HTML šablona (F37) — pokud `sablona` obsahuje aspoň jednu ze
 * značek výše, bere se jako CELÁ stránka (organizátor si řídí vlastní
 * <head>/CSS/branding) a značky se nahradí. Jinak (zpětná kompatibilita
 * s F34) se `sablona`/`udalost.htmlHlavicka` chová jako dřív — vloží se
 * jako hlavička před výchozí tabulku.
 */
function nahraditZnacky(sablona: string, trasaNazev: string, vysledky: VysledkyResponseDto): string {
  const radky = vykreslitRadky(vysledky);
  return sablona
    .replaceAll("{{NAZEV_TRASY}}", escapeHtml(trasaNazev))
    .replaceAll("{{TABULKA_VYSLEDKU}}", vykreslitTabulku(radky))
    .replaceAll("{{RADKY_VYSLEDKU}}", radky)
    .replaceAll("{{POCET_KLASIFIKOVANYCH}}", String(vysledky.klasifikovani.length))
    .replaceAll("{{AKTUALIZOVANO}}", new Date().toLocaleString("cs-CZ"));
}

/**
 * Statická HTML stránka výsledků pro FTP/SFTP export (F34, F36, F37) —
 * stejná data jako GET /routes/:id/results, jiný výstupní formát.
 */
export function renderResultsHtml(
  trasaNazev: string,
  vysledky: VysledkyResponseDto,
  hlavickaNeboSablona?: string | null
): string {
  if (hlavickaNeboSablona && ZNACKY_SABLONY.some((znacka) => hlavickaNeboSablona.includes(znacka))) {
    return nahraditZnacky(hlavickaNeboSablona, trasaNazev, vysledky);
  }

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
${hlavickaNeboSablona ?? ""}
<h1>Výsledky — ${escapeHtml(trasaNazev)}</h1>
${vykreslitTabulku(vykreslitRadky(vysledky))}
</body>
</html>
`;
}
