"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refused = typeof window !== "undefined" && window.location.search.includes("refuse=1");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou mot de passe incorrect.");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Halo de couleur discret derrière la carte */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #8b7cf6 0%, #4d8af0 35%, #4fd18b 60%, transparent 70%)" }}
      />
      <form onSubmit={submit} className="rise relative w-full max-w-sm rounded-2xl border border-line bg-card/90 p-7 backdrop-blur">
        <Logo size={48} />
        <h1 className="mt-5 text-2xl font-bold">Mes boutiques</h1>
        <p className="mt-1 text-sm text-muted">Toutes tes boutiques Vinted, au même endroit.</p>
        <label className="mt-6 block text-sm text-muted">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1.5"
          />
        </label>
        <label className="mt-4 block text-sm text-muted">
          Mot de passe
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1.5"
          />
        </label>
        {(error || refused) && (
          <p className="mt-4 text-sm text-alert">{error ?? "Ce compte n'a pas accès à l'application."}</p>
        )}
        <button disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
