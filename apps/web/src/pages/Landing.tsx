import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--navy-800)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <img src="/favicon.svg" alt="Depo" width={64} height={64} />
      <h1 style={{ fontSize: "clamp(28px, 6vw, 48px)", fontWeight: 800, margin: 0, maxWidth: 640 }}>
        Zadej číslo. Stiskni Enter. Máš výsledky.
      </h1>
      <p style={{ color: "var(--steel-400)", maxWidth: 480, margin: 0 }}>
        Depo měří na telefonu i iPadu, funguje bez signálu a výsledky posílá na váš web hned po
        doběhu.
      </p>
      <Link
        to="/dashboard"
        style={{
          background: "var(--tape-500)",
          color: "#fff",
          padding: "14px 28px",
          borderRadius: 12,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Přehled akcí
      </Link>
    </div>
  );
}
