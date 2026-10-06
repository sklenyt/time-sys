import { useEffect, useRef, useState } from "react";

export interface PolozkaMenu {
  popisek: string;
  akce: () => void;
  nebezpecna?: boolean;
}

interface RozbalovaciMenuProps {
  popisek: string;
  polozky: PolozkaMenu[];
}

/** Tlačítko s rozbalovací nabídkou — zavírá se klikem mimo a klávesou Escape. */
export function RozbalovaciMenu({ popisek, polozky }: RozbalovaciMenuProps) {
  const [otevrene, setOtevrene] = useState(false);
  const korenRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!otevrene) return;
    const zavrit = (e: MouseEvent) => {
      if (!korenRef.current?.contains(e.target as Node)) setOtevrene(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOtevrene(false);
    document.addEventListener("mousedown", zavrit);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", zavrit);
      document.removeEventListener("keydown", esc);
    };
  }, [otevrene]);

  return (
    <span ref={korenRef} style={{ position: "relative", display: "inline-block" }}>
      <button className="btn-pill" aria-haspopup="menu" aria-expanded={otevrene} onClick={() => setOtevrene((o) => !o)}>
        {popisek} ▾
      </button>
      {otevrene && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 20,
            minWidth: 220,
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 4,
            boxShadow: "0 6px 18px rgba(11,18,32,0.14)",
          }}
        >
          {polozky.map((p, i) => (
            <button
              key={p.popisek}
              role="menuitem"
              onClick={() => {
                setOtevrene(false);
                p.akce();
              }}
              style={{
                all: "unset",
                display: "block",
                boxSizing: "border-box",
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                cursor: "pointer",
                borderRadius: 6,
                color: p.nebezpecna ? "var(--color-danger)" : "var(--navy-800)",
                borderTop: p.nebezpecna && i > 0 ? "1px solid var(--line)" : undefined,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {p.popisek}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
