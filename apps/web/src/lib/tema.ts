import { useState } from "react";

export type Tema = "tmavy" | "svetly";

export function nactiTema(klic: string): Tema {
  try {
    return localStorage.getItem(klic) === "svetly" ? "svetly" : "tmavy";
  } catch {
    return "tmavy";
  }
}

/** Světlý/tmavý režim obrazovky zapamatovaný v prohlížeči pod `klic` — každé zařízení si ho nastaví jednou. */
export function useTema(klic: string): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() => nactiTema(klic));

  function prepnout() {
    const nove: Tema = tema === "tmavy" ? "svetly" : "tmavy";
    setTema(nove);
    try {
      localStorage.setItem(klic, nove);
    } catch {
      // soukromé okno apod. — volba prostě nepřežije reload
    }
  }

  return [tema, prepnout];
}
