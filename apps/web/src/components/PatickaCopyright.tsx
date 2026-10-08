/** Drobná patička s copyrightem pro veřejné stránky i přihlášenou appku. */
export function PatickaCopyright() {
  return (
    <div style={{ marginTop: 32, fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
      © {new Date().getFullYear()} Depo
    </div>
  );
}
