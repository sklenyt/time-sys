import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { chybaZeServeru } from "../lib/chyby";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [noveHeslo, setNoveHeslo] = useState("");
  const [potvrzeni, setPotvrzeni] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (noveHeslo !== potvrzeni) {
      setError("Hesla se neshodují");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, noveHeslo });
      navigate("/login");
    } catch (e) {
      setError(chybaZeServeru(e, "Nastavení hesla se nezdařilo"));
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
        {!token ? (
          <p style={{ color: "var(--color-danger)", fontSize: 14, margin: 0 }}>
            Odkaz pro reset hesla chybí nebo je neplatný. Vyžádejte si prosím{" "}
            <Link to="/zapomenute-heslo" style={{ color: "var(--tape-700)" }}>
              nový odkaz
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0 }}>Zadejte nové heslo k účtu.</p>
            <input
              type="password"
              value={noveHeslo}
              onChange={(e) => setNoveHeslo(e.target.value)}
              placeholder="Nové heslo (min. 8 znaků)"
              minLength={8}
              required
              style={inputStyle}
            />
            <input
              type="password"
              value={potvrzeni}
              onChange={(e) => setPotvrzeni(e.target.value)}
              placeholder="Nové heslo znovu"
              minLength={8}
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
              Nastavit nové heslo
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
