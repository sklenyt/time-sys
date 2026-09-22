import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthTokensDto } from "@depo/shared";
import { api, setTokens } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens =
        mode === "login"
          ? await api.post<AuthTokensDto>("/auth/login", { email, heslo })
          : await api.post<AuthTokensDto>("/auth/register", { email, heslo, jmeno });
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate("/dashboard");
    } catch (e) {
      setError(chybaZeServeru(e, mode === "login" ? "Nesprávný e-mail nebo heslo" : "Registrace se nezdařila"));
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
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <input
              value={jmeno}
              onChange={(e) => setJmeno(e.target.value)}
              placeholder="Jméno"
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            style={inputStyle}
          />
          <input
            type="password"
            value={heslo}
            onChange={(e) => setHeslo(e.target.value)}
            placeholder="Heslo (min. 8 znaků)"
            minLength={8}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: "var(--color-danger)", margin: 0, fontSize: 13.5 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-pill primary" style={{ padding: "10px 16px", justifyContent: "center" }}>
            {mode === "login" ? "Přihlásit se" : "Registrovat"}
          </button>
        </form>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            style={{ background: "none", border: "none", color: "var(--tape-700)", cursor: "pointer", fontSize: 13.5, padding: 0, textAlign: "left" }}
          >
            {mode === "login" ? "Nemáte účet? Registrovat se" : "Už máte účet? Přihlásit se"}
          </button>
          {mode === "login" && (
            <Link to="/zapomenute-heslo" style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
              Zapomenuté heslo?
            </Link>
          )}
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
