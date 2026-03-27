"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router   = useRouter();
  const [pwd,    setPwd]    = useState("");
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password: pwd }),
    });

    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Mot de passe incorrect. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display:   "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f5f5f5",
      padding: "16px",
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius:    "16px",
        padding:         "32px 24px",
        width:           "100%",
        maxWidth:        "380px",
        boxShadow:       "0 2px 16px rgba(0,0,0,0.08)",
      }}>
        {/* Logo / titre */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "56px", height: "56px",
            backgroundColor: "#C0392B",
            borderRadius: "50%",
            margin: "0 auto 12px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontSize: "24px" }}>A</span>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
            Espace Anna
          </h1>
          <p style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>
            CNL Sourcing — Accès privé
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#333" }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
            style={{
              width: "100%", padding: "12px 14px",
              border: error ? "2px solid #C0392B" : "1.5px solid #ddd",
              borderRadius: "10px",
              fontSize: "16px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <p style={{ color: "#C0392B", fontSize: "13px", marginTop: "8px" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pwd}
            style={{
              marginTop:       "20px",
              width:           "100%",
              padding:         "14px",
              backgroundColor: loading || !pwd ? "#e0a0a0" : "#C0392B",
              color:           "#fff",
              border:          "none",
              borderRadius:    "10px",
              fontSize:        "16px",
              fontWeight:      700,
              cursor:          loading || !pwd ? "not-allowed" : "pointer",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              gap:             "8px",
            }}
          >
            {loading && (
              <span style={{
                width: "18px", height: "18px",
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }} />
            )}
            {loading ? "Connexion…" : "Accéder au tableau de bord"}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
