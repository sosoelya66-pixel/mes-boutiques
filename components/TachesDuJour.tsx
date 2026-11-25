"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/AppState";
import { deleteTache, insertTaches, loadSyncInfo, loadTaches, setTacheFaite } from "@/lib/data";
import { aVerifier, buildTaches, jourParis, resolue, type Tache } from "@/lib/taches";

/** Liste des tâches du jour, à cocher. Recréée chaque matin à partir des données. */
export function TachesDuJour() {
  const { allShops, allSales, allListings, objectifGlobal, ready } = useAppState();
  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nouvelle, setNouvelle] = useState("");
  const [voirFaites, setVoirFaites] = useState(true);
  const emails = useRef(0);
  const jour = jourParis();

  const sync = useCallback(async () => {
    try {
      emails.current = await loadSyncInfo().then((r) => aVerifier(r.log)).catch(() => 0);
      const data = { shops: allShops.filter((s) => s.actif), sales: allSales, listings: allListings, emailsAVerifier: emails.current, objectifGlobal };
      await insertTaches(jour, buildTaches(data));
      let list = await loadTaches(jour);
      // Cochage automatique de ce qui est déjà fait (colis envoyé, fiche publiée…)
      const done = list.filter((t) => !t.fait && resolue(t.cle, data));
      if (done.length) {
        await Promise.all(done.map((t) => setTacheFaite(t.id, true, true)));
        list = await loadTaches(jour);
      }
      setTaches(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [allShops, allSales, allListings, objectifGlobal, jour]);

  useEffect(() => {
    if (ready) sync();
  }, [ready, sync]);

  async function toggle(t: Tache) {
    setTaches((l) => l?.map((x) => (x.id === t.id ? { ...x, fait: !x.fait, auto: false } : x)) ?? null);
    await setTacheFaite(t.id, !t.fait);
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const titre = nouvelle.trim();
    if (!titre) return;
    setNouvelle("");
    await insertTaches(jour, [{ cle: `perso:${crypto.randomUUID()}`, type: "perso", titre, detail: null, lien: null, ordre: 200 }]);
    setTaches(await loadTaches(jour));
  }

  if (error)
    return (
      <section className="rise glass rounded-2xl p-5 text-sm text-alert">
        Tâches du jour indisponibles : {error}
        <div className="mt-1 text-xs text-muted">Vérifie que le script supabase/correctif-10-taches.sql a été lancé dans Supabase.</div>
      </section>
    );
  if (!taches) return <section className="h-40 animate-pulse rounded-2xl glass" />;

  const faites = taches.filter((t) => t.fait).length;
  const pct = taches.length ? (faites / taches.length) * 100 : 0;
  const shown = voirFaites ? taches : taches.filter((t) => !t.fait);

  return (
    <section className="rise glass glow-corner rounded-2xl p-4 sm:p-5" style={{ ["--glow" as string]: "#8b7cf6" }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">📋 Tes tâches du jour</h3>
        <span className={`text-sm font-semibold ${faites === taches.length && taches.length ? "text-profit" : "text-muted"}`}>
          {faites}/{taches.length}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-line">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#8b7cf6,#4fd18b)", boxShadow: "0 0 10px rgba(139,124,246,.6)" }}
        />
      </div>
      {faites === taches.length && taches.length > 0 && <p className="mt-3 text-sm text-profit">🎉 Tout est fait pour aujourd&apos;hui. Bravo !</p>}

      <ul className="mt-3 divide-y divide-line">
        {shown.map((t) => (
          <li key={t.id} className="flex items-start gap-3 py-2.5">
            <button
              onClick={() => toggle(t)}
              aria-label={t.fait ? "Décocher" : "Cocher"}
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors ${
                t.fait ? "border-profit bg-profit text-night" : "border-white/25 hover:border-white/60"
              }`}
            >
              {t.fait ? "✓" : ""}
            </button>
            <div className="min-w-0 flex-1">
              <div className={`text-sm ${t.fait ? "text-muted line-through" : "font-medium"}`}>{t.titre}</div>
              {(t.detail || t.auto) && (
                <div className="mt-0.5 text-xs text-muted">
                  {t.detail}
                  {t.auto && <span className="text-profit">{t.detail ? " · " : ""}fait automatiquement ✓</span>}
                </div>
              )}
            </div>
            {t.lien && !t.fait && (
              <Link href={t.lien} className="shrink-0 rounded-lg border border-line px-2 py-1 text-xs text-muted hover:text-white">
                Ouvrir
              </Link>
            )}
            {t.type === "perso" && (
              <button
                onClick={async () => {
                  await deleteTache(t.id);
                  setTaches((l) => l?.filter((x) => x.id !== t.id) ?? null);
                }}
                className="shrink-0 px-1 text-muted hover:text-white"
                aria-label="Supprimer"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={ajouter} className="mt-3 flex gap-2">
        <input className="input py-2" placeholder="+ Ajouter une tâche" value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} />
        <button className="btn shrink-0" disabled={!nouvelle.trim()}>
          Ajouter
        </button>
      </form>
      {faites > 0 && (
        <button onClick={() => setVoirFaites(!voirFaites)} className="mt-2 text-xs text-muted hover:text-white">
          {voirFaites ? "Masquer les tâches faites" : `Afficher les tâches faites (${faites})`}
        </button>
      )}
    </section>
  );
}
