interface BusyOverlayProps {
  active: boolean;
  label?: string;
}

/** Blokující overlay pro akce běžící na pozadí — nejde kliknout na nic pod ním, dokud `active` neskončí. */
export function BusyOverlay({ active, label }: BusyOverlayProps) {
  if (!active) return null;
  return (
    <div className="busy-overlay" role="status" aria-live="polite">
      <div className="busy-overlay-spinner" aria-hidden="true" />
      <span className="busy-overlay-label">{label ?? "Chvilku strpení…"}</span>
    </div>
  );
}
