/** Brand lišta pro veřejné, nepřihlášené stránky (výsledky, registrace, osobní výsledek) — odkazuje zpátky na hlavní web. */
export function PublicHeader({ tagline }: { tagline?: string }) {
  return (
    <a
      href="https://depotime.cz"
      style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, textDecoration: "none", color: "inherit", width: "fit-content" }}
    >
      <img src="/depo-mark.svg" alt="" width={36} height={36} />
      <span>
        <span style={{ display: "block", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--navy-800)" }}>Depo</span>
        {tagline && (
          <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginTop: -2 }}>{tagline}</span>
        )}
      </span>
    </a>
  );
}
