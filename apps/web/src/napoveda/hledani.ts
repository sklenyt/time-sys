import MiniSearch from "minisearch";
import { CLANKY, kotva, normalizovat, type Sekce } from "./clanky";

interface Oddil {
  id: string;
  slug: string;
  kotva: string;
  titulek: string;
  nadpis: string;
  sekce: Sekce;
  text: string;
  klicova: string;
}

export interface Vysledek {
  id: string;
  slug: string;
  kotva: string;
  titulek: string;
  nadpis: string;
  sekce: Sekce;
  text: string;
  terms: string[];
}

const STOP_SLOVA = new Set(
  "a i o u v k s z na do se si je to ze za pro po od jak co kdy kde ten ta te ty by byt jsou jste mate muzete nebo ale aby jen uz jiz ktery ktera ktere".split(
    " "
  )
);

function zpracovatTerm(term: string): string | null {
  const t = normalizovat(term);
  return t.length < 2 || STOP_SLOVA.has(t) ? null : t;
}

/** Markdown → čistý text pro index a úryvky (bez hvězdiček, odkazů a značek). */
export function bezZnacek(md: string): string {
  return md
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|\*/g, "")
    .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Každý článek se rozdělí podle nadpisů „##“, aby výsledek hledání vedl přímo na správné místo v článku. */
function naOddily(): Oddil[] {
  const oddily: Oddil[] = [];
  for (const c of CLANKY) {
    const casti = c.obsah.split(/^## /m);
    casti.forEach((cast, i) => {
      const [prvniRadek, ...zbytek] = cast.split("\n");
      const nadpis = i === 0 ? "" : prvniRadek.trim();
      const telo = i === 0 ? cast : zbytek.join("\n");
      oddily.push({
        id: `${c.slug}#${i}`,
        slug: c.slug,
        kotva: nadpis ? kotva(nadpis) : "",
        titulek: c.titulek,
        nadpis,
        sekce: c.sekce,
        text: bezZnacek(i === 0 ? `${c.popis} ${telo}` : telo),
        klicova: i === 0 ? c.klicovaSlova : "",
      });
    });
  }
  return oddily;
}

const index = new MiniSearch<Oddil>({
  fields: ["titulek", "nadpis", "klicova", "text"],
  storeFields: ["slug", "kotva", "titulek", "nadpis", "sekce", "text"],
  processTerm: zpracovatTerm,
  searchOptions: {
    boost: { titulek: 3, nadpis: 2.5, klicova: 2 },
    prefix: true,
    fuzzy: (term) => (term.length > 4 ? 0.2 : 0),
  },
});
index.addAll(naOddily());

export function hledat(dotaz: string): Vysledek[] {
  const q = dotaz.trim();
  if (!q) return [];
  // Nejdřív oddíly se všemi slovy dotazu; když žádný není, stačí kterékoli slovo.
  let vysledky = index.search(q, { combineWith: "AND" });
  if (vysledky.length === 0) vysledky = index.search(q, { combineWith: "OR" });
  return vysledky.slice(0, 30).map((v) => ({
    id: String(v.id),
    slug: v.slug,
    kotva: v.kotva,
    titulek: v.titulek,
    nadpis: v.nadpis,
    sekce: v.sekce,
    text: v.text,
    terms: v.terms,
  }));
}

export interface UsekUryvku {
  text: string;
  zvyraznit: boolean;
}

/**
 * Úryvek kolem prvního nalezeného slova se zvýrazněnými shodami. Hledá se
 * v textu bez diakritiky, ale vrací se původní text — normalizace mění
 * délku jen u složených znaků, proto se mapuje znak po znaku.
 */
export function uryvek(text: string, terms: string[], delka = 170): UsekUryvku[] {
  const norm = Array.from(text, (ch) => normalizovat(ch)[0] ?? ch).join("");
  const shody: [number, number][] = [];
  for (const term of terms) {
    const re = new RegExp(`(^|[^a-z0-9])(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm))) {
      const zacatek = m.index + m[1].length;
      let konec = zacatek + m[2].length;
      while (konec < norm.length && /[a-z0-9]/.test(norm[konec])) konec++;
      shody.push([zacatek, konec]);
    }
  }
  shody.sort((a, b) => a[0] - b[0]);

  const stred = shody[0]?.[0] ?? 0;
  let od = Math.max(0, stred - Math.floor(delka / 3));
  if (od > 0) {
    const mezera = text.indexOf(" ", od);
    if (mezera !== -1 && mezera < stred) od = mezera + 1;
  }
  let doPozice = Math.min(text.length, od + delka);
  if (doPozice < text.length) {
    const mezera = text.lastIndexOf(" ", doPozice);
    if (mezera > stred) doPozice = mezera;
  }

  const useky: UsekUryvku[] = [];
  if (od > 0) useky.push({ text: "…", zvyraznit: false });
  let kurzor = od;
  for (const [z, k] of shody) {
    if (k <= kurzor || z >= doPozice) continue;
    const zz = Math.max(z, kurzor);
    if (zz > kurzor) useky.push({ text: text.slice(kurzor, zz), zvyraznit: false });
    const kk = Math.min(k, doPozice);
    useky.push({ text: text.slice(zz, kk), zvyraznit: true });
    kurzor = kk;
  }
  if (kurzor < doPozice) useky.push({ text: text.slice(kurzor, doPozice), zvyraznit: false });
  if (doPozice < text.length) useky.push({ text: "…", zvyraznit: false });
  return useky;
}
