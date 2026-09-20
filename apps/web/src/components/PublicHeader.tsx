/** Malá brand lišta pro veřejné, nepřihlášené stránky (registrace, osobní výsledek). */
export function PublicHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <img src="/depo-mark.svg" alt="" width={22} height={22} />
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Depo</span>
    </div>
  );
}
