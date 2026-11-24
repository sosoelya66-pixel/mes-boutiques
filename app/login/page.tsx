"use client";

import { useState } from "react";
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-card p-7">
        <h1 className="text-2xl font-bold">Mes boutiques</h1>
        <p className="mt-1 text-sm text-muted">Connecte-toi pour accéder au tableau de bord.</p>
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
