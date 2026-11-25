"use client";

// Écran affiché si une page plante, au lieu d'une page blanche.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rise glass mx-auto max-w-lg rounded-2xl p-8 text-center">
      <div className="text-3xl">😕</div>
      <h2 className="mt-3 text-lg font-semibold">Oups, cette page a rencontré un problème</h2>
      <p className="mt-2 text-sm text-muted">{error.message || "Erreur inconnue."}</p>
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn" onClick={() => (window.location.href = "/aujourdhui")}>
          Retour à l&apos;accueil
        </button>
        <button className="btn-primary" onClick={reset}>
          Réessayer
        </button>
      </div>
    </div>
  );
}
