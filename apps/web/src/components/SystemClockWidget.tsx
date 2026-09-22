import { LiveClock } from "./LiveClock";

/**
 * Vizuálně výrazný widget systémového času — stejné hodiny, podle kterých
 * Depo zapisuje čas při "číslo + Enter" (F06). Funguje na tmavém (Měření)
 * i světlém (Dashboard) pozadí, protože je to vždy tmavá karta.
 */
export function SystemClockWidget() {
  return (
    <div className="clock-widget">
      <div className="clock-widget-label">
        <span className="clock-widget-dot" aria-hidden="true" />
        Živý systémový čas
      </div>
      <LiveClock className="clock-widget-time" />
    </div>
  );
}
