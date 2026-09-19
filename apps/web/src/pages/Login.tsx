import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthTokensDto } from "@depo/shared";
import { api, setTokens } from "../lib/api";

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
    } catch {
      setError(mode === "login" ? "Nesprávný e-mail nebo heslo" : "Registrace se nezdařila");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1 style={{ fontWeight: 800, marginBottom: 24 }}>Depo</h1>
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
        {error && <p style={{ color: "var(--color-danger)", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {mode === "login" ? "Přihlásit se" : "Registrovat"}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        style={{ marginTop: 16, background: "none", border: "none", color: "var(--navy-800)", cursor: "pointer" }}
      >
        {mode === "login" ? "Nemáte účet? Registrovat se" : "Už máte účet? Přihlásit se"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  background: "var(--navy-800)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  cursor: "pointer",
};
