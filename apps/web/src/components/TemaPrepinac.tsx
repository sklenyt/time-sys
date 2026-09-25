import type { Tema } from "../lib/tema";

export function TemaPrepinac({ tema, onPrepnout }: { tema: Tema; onPrepnout: () => void }) {
  return (
    <button
      type="button"
      className="tema-prepinac"
      onClick={onPrepnout}
      aria-label={tema === "tmavy" ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
      title={tema === "tmavy" ? "Světlý režim" : "Tmavý režim"}
    >
      {tema === "tmavy" ? "☀" : "☾"}
    </button>
  );
}
