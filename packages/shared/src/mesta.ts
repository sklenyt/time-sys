/**
 * Města pro umístění referencí na mapě — pořadatel zadá jen název místa,
 * souřadnice se dohledají odsud (žádná externí geokódovací služba).
 * Souřadnice jsou přibližné středy měst (stupně, WGS84).
 */
export interface Misto {
  nazev: string;
  lat: number;
  lon: number;
}

export const MESTA: Misto[] = [
  { nazev: "Praha", lat: 50.08, lon: 14.43 },
  { nazev: "Brno", lat: 49.2, lon: 16.61 },
  { nazev: "Ostrava", lat: 49.83, lon: 18.29 },
  { nazev: "Plzeň", lat: 49.75, lon: 13.38 },
  { nazev: "Liberec", lat: 50.77, lon: 15.06 },
  { nazev: "Olomouc", lat: 49.59, lon: 17.25 },
  { nazev: "České Budějovice", lat: 48.97, lon: 14.47 },
  { nazev: "Hradec Králové", lat: 50.21, lon: 15.83 },
  { nazev: "Ústí nad Labem", lat: 50.66, lon: 14.04 },
  { nazev: "Pardubice", lat: 50.04, lon: 15.78 },
  { nazev: "Zlín", lat: 49.22, lon: 17.67 },
  { nazev: "Havlíčkův Brod", lat: 49.61, lon: 15.58 },
  { nazev: "Kladno", lat: 50.14, lon: 14.1 },
  { nazev: "Most", lat: 50.5, lon: 13.64 },
  { nazev: "Opava", lat: 49.94, lon: 17.9 },
  { nazev: "Frýdek-Místek", lat: 49.68, lon: 18.35 },
  { nazev: "Karviná", lat: 49.85, lon: 18.54 },
  { nazev: "Jihlava", lat: 49.4, lon: 15.59 },
  { nazev: "Teplice", lat: 50.64, lon: 13.82 },
  { nazev: "Děčín", lat: 50.78, lon: 14.21 },
  { nazev: "Karlovy Vary", lat: 50.23, lon: 12.87 },
  { nazev: "Chomutov", lat: 50.46, lon: 13.42 },
  { nazev: "Jablonec nad Nisou", lat: 50.72, lon: 15.17 },
  { nazev: "Mladá Boleslav", lat: 50.41, lon: 14.9 },
  { nazev: "Prostějov", lat: 49.47, lon: 17.11 },
  { nazev: "Přerov", lat: 49.46, lon: 17.45 },
  { nazev: "Česká Lípa", lat: 50.69, lon: 14.54 },
  { nazev: "Třebíč", lat: 49.21, lon: 15.88 },
  { nazev: "Třinec", lat: 49.68, lon: 18.67 },
  { nazev: "Tábor", lat: 49.41, lon: 14.66 },
  { nazev: "Znojmo", lat: 48.86, lon: 16.05 },
  { nazev: "Příbram", lat: 49.69, lon: 14.01 },
  { nazev: "Cheb", lat: 50.08, lon: 12.37 },
  { nazev: "Kolín", lat: 50.03, lon: 15.2 },
  { nazev: "Trutnov", lat: 50.56, lon: 15.91 },
  { nazev: "Písek", lat: 49.31, lon: 14.15 },
  { nazev: "Kroměříž", lat: 49.3, lon: 17.39 },
  { nazev: "Šumperk", lat: 49.97, lon: 16.97 },
  { nazev: "Vsetín", lat: 49.34, lon: 17.99 },
  { nazev: "Valašské Meziříčí", lat: 49.47, lon: 17.97 },
  { nazev: "Uherské Hradiště", lat: 49.07, lon: 17.46 },
  { nazev: "Hodonín", lat: 48.85, lon: 17.13 },
  { nazev: "Český Krumlov", lat: 48.81, lon: 14.32 },
  { nazev: "Litoměřice", lat: 50.53, lon: 14.13 },
  { nazev: "Nový Jičín", lat: 49.59, lon: 18.01 },
  { nazev: "Jindřichův Hradec", lat: 49.14, lon: 15.0 },
  { nazev: "Chrudim", lat: 49.95, lon: 15.79 },
  { nazev: "Strakonice", lat: 49.26, lon: 13.9 },
  { nazev: "Klatovy", lat: 49.4, lon: 13.29 },
  { nazev: "Mělník", lat: 50.35, lon: 14.47 },
  { nazev: "Beroun", lat: 49.96, lon: 14.07 },
  { nazev: "Rakovník", lat: 50.1, lon: 13.73 },
  { nazev: "Kutná Hora", lat: 49.95, lon: 15.27 },
  { nazev: "Náchod", lat: 50.42, lon: 16.16 },
  { nazev: "Svitavy", lat: 49.76, lon: 16.47 },
  { nazev: "Žďár nad Sázavou", lat: 49.56, lon: 15.94 },
  { nazev: "Blansko", lat: 49.36, lon: 16.64 },
  { nazev: "Břeclav", lat: 48.76, lon: 16.88 },
  { nazev: "Vyškov", lat: 49.28, lon: 16.99 },
  { nazev: "Prachatice", lat: 49.01, lon: 13.99 },
  { nazev: "Domažlice", lat: 49.44, lon: 12.93 },
  { nazev: "Tachov", lat: 49.8, lon: 12.63 },
  { nazev: "Rokycany", lat: 49.74, lon: 13.59 },
  { nazev: "Sokolov", lat: 50.18, lon: 12.64 },
  { nazev: "Semily", lat: 50.6, lon: 15.33 },
  { nazev: "Rychnov nad Kněžnou", lat: 50.16, lon: 16.28 },
  { nazev: "Ústí nad Orlicí", lat: 49.97, lon: 16.4 },
  { nazev: "Poděbrady", lat: 50.14, lon: 15.12 },
  { nazev: "Nymburk", lat: 50.19, lon: 15.04 },
  { nazev: "Benešov", lat: 49.78, lon: 14.69 },
  { nazev: "Louny", lat: 50.36, lon: 13.8 },
  { nazev: "Žatec", lat: 50.33, lon: 13.55 },
  { nazev: "Turnov", lat: 50.59, lon: 15.16 },
  { nazev: "Špindlerův Mlýn", lat: 50.73, lon: 15.61 },
  { nazev: "Harrachov", lat: 50.77, lon: 15.43 },
  { nazev: "Nové Město na Moravě", lat: 49.56, lon: 16.07 },
  { nazev: "Rožnov pod Radhoštěm", lat: 49.46, lon: 18.14 },
  { nazev: "Frenštát pod Radhoštěm", lat: 49.55, lon: 18.21 },
  { nazev: "Pelhřimov", lat: 49.43, lon: 15.22 },
  { nazev: "Kadaň", lat: 50.38, lon: 13.27 },
  { nazev: "Bruntál", lat: 49.99, lon: 17.46 },
  { nazev: "Jeseník", lat: 50.23, lon: 17.2 },
  { nazev: "Humpolec", lat: 49.54, lon: 15.36 },
  { nazev: "Dvůr Králové nad Labem", lat: 50.43, lon: 15.81 },
  { nazev: "Slaný", lat: 50.23, lon: 14.09 },
  { nazev: "Kralupy nad Vltavou", lat: 50.24, lon: 14.31 },
  { nazev: "Říčany", lat: 49.99, lon: 14.66 },
];

function normalizovat(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Najde město podle názvu (bez ohledu na diakritiku a velikost písmen) — null, pokud není v seznamu. */
export function najdiMisto(nazev: string | null | undefined): Misto | null {
  if (!nazev) return null;
  const hledane = normalizovat(nazev);
  return MESTA.find((m) => normalizovat(m.nazev) === hledane) ?? null;
}
