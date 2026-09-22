import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [odeslano, setOdeslano] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setOdeslano(true);
    } catch (e) {
      setError(chybaZeServeru(e, "Odeslání se nezdařilo, zkuste to prosím znovu"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 24,
      }}
    >
      <div className="dash-card" style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <img src="/depo-mark.svg" alt="" width={30} height={30} />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Depo</span>
        </div>
        {odeslano ? (
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            Pokud pod tímto e-mailem existuje účet, poslali jsme na něj odkaz pro nastavení nového hesla.
            Zkontrolujte prosím doručenou poštu (i spam).
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0 }}>
              Zadejte e-mail k účtu a pošleme vám odkaz pro nastavení nového hesla.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              style={inputStyle}
            />
            {error && <p style={{ color: "var(--color-danger)", margin: 0, fontSize: 13.5 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-pill primary"
              style={{ padding: "10px 16px", justifyContent: "center" }}
            >
              Odeslat odkaz
            </button>
          </form>
        )}
        <div style={{ marginTop: 16 }}>
          <Link to="/login" style={{ color: "var(--tape-700)", fontSize: 13.5 }}>
            ← Zpět na přihlášení
          </Link>
        </div>
      </div>
      <a href="https://depotime.cz" style={{ color: "var(--text-secondary)", fontSize: 13, textDecoration: "none" }}>
        ← Zpět na depotime.cz
      </a>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};
