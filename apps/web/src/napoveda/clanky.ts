export const SEKCE = [
  "Začínáme",
  "Příprava závodu",
  "Den závodu",
  "Výsledky",
  "Správa a bezpečnost",
  "Časté otázky",
] as const;

export type Sekce = (typeof SEKCE)[number];

export interface Clanek {
  slug: string;
  titulek: string;
  sekce: Sekce;
  poradi: number;
  popis: string;
  /** Synonyma a hovorové výrazy, které v textu nejsou, ale lidé je hledají („stopky“, „číslo“…). */
  klicovaSlova: string;
  obsah: string;
}

const soubory = import.meta.glob("./clanky/*.md", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

function nacistClanek(cesta: string, surovy: string): Clanek {
  const slug = cesta.replace(/^.*\//, "").replace(/\.md$/, "");
  const shoda = surovy.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!shoda) throw new Error(`Článek nápovědy ${slug} nemá hlavičku`);
  const meta: Record<string, string> = {};
  for (const radek of shoda[1].split("\n")) {
    const i = radek.indexOf(":");
    if (i > 0) meta[radek.slice(0, i).trim()] = radek.slice(i + 1).trim();
  }
  if (!SEKCE.includes(meta.sekce as Sekce)) throw new Error(`Článek nápovědy ${slug} má neznámou sekci „${meta.sekce}“`);
  return {
    slug,
    titulek: meta.titulek,
    sekce: meta.sekce as Sekce,
    poradi: Number(meta.poradi) || 99,
    popis: meta.popis ?? "",
    klicovaSlova: meta.klicova ?? "",
    obsah: surovy.slice(shoda[0].length).trim(),
  };
}

export const CLANKY: Clanek[] = Object.entries(soubory)
  .map(([cesta, obsah]) => nacistClanek(cesta, obsah))
  .sort((a, b) => SEKCE.indexOf(a.sekce) - SEKCE.indexOf(b.sekce) || a.poradi - b.poradi);

export const CLANEK_PODLE_SLUGU = new Map(CLANKY.map((c) => [c.slug, c]));

/** Bez diakritiky a malými písmeny — „Měření“ i „mereni“ tak najdou totéž. */
export function normalizovat(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function kotva(nadpis: string): string {
  return normalizovat(nadpis)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
