import type { ReactNode } from "react";

/** Společná hlavička organizátorských stránek: název a drobný popis pod ním. */
export function HlavickaStranky({ titulek, popis }: { titulek: string; popis?: ReactNode }) {
  return (
    <div className="dash-header" style={{ marginBottom: 20 }}>
      <div>
        <h1>{titulek}</h1>
        {popis && <div className="meta mono">{popis}</div>}
      </div>
    </div>
  );
}

export interface PolozkaSouhrnu {
  hodnota: ReactNode;
  popisek: string;
  /** Zvýrazní číslo (zelená = v pořádku, oranžová = vyžaduje pozornost). */
  zvyrazneni?: "ok" | "pozor";
}

/** Řada karet s hlavními čísly nad tabulkou. */
export function Souhrn({ polozky }: { polozky: PolozkaSouhrnu[] }) {
  return (
    <div className="sl-souhrn" style={{ gridTemplateColumns: `repeat(${Math.min(polozky.length, 4)}, minmax(0, 1fr))` }}>
      {polozky.map((p) => (
        <div key={p.popisek}>
          <b style={p.zvyrazneni === "ok" ? { color: "var(--color-live-700)" } : p.zvyrazneni === "pozor" ? { color: "var(--color-attention)" } : undefined}>
            {p.hodnota}
          </b>
          <span>{p.popisek}</span>
        </div>
      ))}
    </div>
  );
}

/** Karta s tabulkou ve stejném vzhledu jako Startovní listina. */
export function TabulkaKarta({ children }: { children: ReactNode }) {
  return (
    <div className="sl-karta">
      <div className="table-scroll">
        <table className="sl-tabulka">{children}</table>
      </div>
    </div>
  );
}

/** Prázdný stav uvnitř tabulky. */
export function PrazdnyRadek({ sloupcu, text }: { sloupcu: number; text: string }) {
  return (
    <tr>
      <td colSpan={sloupcu} style={{ padding: "22px 8px", color: "var(--text-secondary)" }}>
        {text}
      </td>
    </tr>
  );
}
