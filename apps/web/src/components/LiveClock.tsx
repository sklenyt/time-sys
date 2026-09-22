import { useEffect, useState } from "react";

function formatCas(d: Date): string {
  return d.toLocaleTimeString("cs-CZ", { hour12: false });
}

/** Živé digitální hodiny ze systémového času zařízení — stejné hodiny, podle kterých Depo zapisuje čas doběhu. */
export function LiveClock({ className }: { className?: string }) {
  const [cas, setCas] = useState(() => formatCas(new Date()));

  useEffect(() => {
    const id = setInterval(() => setCas(formatCas(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`mono live-clock${className ? ` ${className}` : ""}`} aria-label={`Systémový čas ${cas}`}>
      {cas}
    </span>
  );
}
