"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/AppState";
import { BordereauButton } from "@/components/BordereauButton";
import { SaleForm } from "@/components/SaleForm";
import { deleteTache, insertTaches, loadSyncInfo, loadTaches, setTacheFaite, updateListing, updateSale } from "@/lib/data";
import type { Sale } from "@/lib/types";
import { aVerifier, buildTaches, jourParis, moment, resolue, type Tache } from "@/lib/taches";

/** Liste des tâches du jour, à cocher. Recréée chaque matin à partir des données. */
export function TachesDuJour() {
  const { allShops, allSales, allListings, objectifGlobal, ready, refresh } = useAppState();
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [printing, setPrinting] = useState(false);
  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nouvelle, setNouvelle] = useState("");
  const [partantes, setPartantes] = useState<string[]>([]); // tâches qui s'effacent (animation)
  const emails = useRef(0);
  const jour = jourParis();

  const sync = useCallback(async () => {
    try {
      emails.current = await loadSyncInfo().then((r) => aVerifier(r.log)).catch(() => 0);
      const hierJour = jourParis(new Date(Date.now() - 86400000));
      const hier = await loadTaches(hierJour).catch(() => []);
      const data = { hier, shops: allShops.filter((s) => s.actif), sales: allSales, listings: allListings, emailsAVerifier: emails.current, objectifGlobal };
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

  const [annuler, setAnnuler] = useState<Tache | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function toggle(t: Tache) {
    // La tâche cochée glisse puis disparaît définitivement
    setPartantes((p) => [...p, t.id]);
    setTimeout(() => {
      setPartantes((p) => p.filter((x) => x !== t.id));
      setTaches((l) => l?.map((x) => (x.id === t.id ? { ...x, fait: true, auto: false } : x)) ?? null);
    }, 450);
    await setTacheFaite(t.id, true);
    // « Annuler » pendant 5 secondes en cas d'erreur
    setAnnuler(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnnuler(null), 5000);
  }

  async function undo() {
    if (!annuler) return;
    const t = annuler;
    setAnnuler(null);
    setTaches((l) => l?.map((x) => (x.id === t.id ? { ...x, fait: false } : x)) ?? null);
    await setTacheFaite(t.id, false);
  }

  // Actions directes depuis la tâche (la tâche se coche ensuite toute seule)
  const idOf = (t: Tache) => t.cle.split(":")[1];
  const saleOf = (t: Tache) => allSales.find((x) => x.id === idOf(t));
  async function act(fn: () => Promise<unknown>) {
    await fn();
    await refresh();
  }

  function actions(t: Tache) {
    if (t.fait) return null;
    const btn = "shrink-0 rounded-lg border border-line px-2 py-1 text-xs text-muted hover:text-white";
    const ok = "btn-primary shrink-0 !px-2.5 !py-1 !text-xs";
    switch (t.type) {
      case "colis": {
        const sale = saleOf(t);
        return sale ? (
          <>
            <BordereauButton value={sale.bordereau_url} className={btn} />
            <button className={ok} onClick={() => act(() => updateSale(sale.id, { statut: "envoye" }))}>
              Envoyé ✓
            </button>
          </>
        ) : null;
      }
      case "prix": {
        const sale = saleOf(t);
        return sale ? (
          <button className={btn} onClick={() => setEditSale(sale)}>
            Saisir le prix
          </button>
        ) : null;
      }
      case "publier":
        return (
          <>
            {t.lien && (
              <Link href={t.lien} className={btn}>
                Ouvrir
              </Link>
            )}
            <button className={ok} onClick={() => act(() => updateListing(idOf(t), { statut: "en_ligne" }))}>
              En ligne ✓
            </button>
          </>
        );
      case "suivi": {
        const sale = saleOf(t);
        return sale ? (
          <button className={ok} onClick={() => act(() => updateSale(sale.id, { statut: "termine" }))}>
            Terminé ✓
          </button>
        ) : null;
      }
      default:
        return t.lien ? (
          <Link href={t.lien} className={btn}>
            Ouvrir
          </Link>
        ) : null;
    }
  }

  // Tous les bordereaux des colis encore à envoyer, en un seul PDF
  const labels = (taches ?? [])
    .filter((t) => t.type === "colis" && !t.fait)
    .map((t) => saleOf(t)?.bordereau_url)
    .filter((u): u is string => !!u);
  async function printAll() {
    const w = window.open("", "_blank");
    setPrinting(true);
    try {
      const { mergeBordereaux } = await import("@/lib/print");
      const r = await mergeBordereaux(labels);
      if (w) w.location.href = r.url;
      else window.location.href = r.url;
    } catch (e) {
      w?.close();
      alert("Erreur : " + (e as Error).message);
    } finally {
      setPrinting(false);
    }
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
  const shown = taches.filter((t) => !t.fait);
  const MOMENTS = [
    { key: "matin", label: "☀️ Matin", aide: "colis, prix, e-mails" },
    { key: "journee", label: "🛍 Journée", aide: "tes boutiques" },
    { key: "soir", label: "🌙 Soir", aide: "publier, contenu" },
  ] as const;

  return (
    <section className="rise glass glow-corner rounded-2xl p-4 sm:p-5" style={{ ["--glow" as string]: "#8b7cf6" }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">📋 Ta journée</h3>
        <span className="flex items-center gap-2">
          {labels.length > 0 && (
            <button className="btn !px-2.5 !py-1 !text-xs" onClick={printAll} disabled={printing} title="Imprimer tous les bordereaux">
              🖨 {printing ? "…" : labels.length}
            </button>
          )}
          <span className={`text-sm font-semibold ${faites === taches.length && taches.length ? "text-profit" : "text-muted"}`}>
            {faites}/{taches.length}
          </span>
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-line">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#8b7cf6,#4fd18b)", boxShadow: "0 0 10px rgba(139,124,246,.6)" }}
        />
      </div>
      {faites === taches.length && taches.length > 0 && <p className="mt-3 text-sm text-profit">🎉 Tout est fait pour aujourd&apos;hui. Bravo !</p>}

      {MOMENTS.map((m) => {
        const list = shown.filter((t) => moment(t.type) === m.key);
        if (!list.length) return null;
        return (
          <div key={m.key} className="mt-4">
            <div className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {m.label} <span className="font-normal normal-case tracking-normal">· {m.aide}</span>
            </div>
            <ul className="mt-1 divide-y divide-line">
            {list.map((t) => (
          <li
            key={t.id}
            className={`flex flex-wrap items-start gap-x-3 gap-y-2 py-2.5 transition-all duration-500 sm:flex-nowrap ${
              partantes.includes(t.id) ? "translate-x-6 opacity-0" : ""
            }`}
          >
            <button
              onClick={() => toggle(t)}
              aria-label={t.fait ? "Décocher" : "Cocher"}
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors ${
                t.fait || partantes.includes(t.id) ? "border-profit bg-profit text-night" : "border-white/25 hover:border-white/60"
              }`}
            >
              {t.fait || partantes.includes(t.id) ? "✓" : ""}
            </button>
            <div className="min-w-0 flex-1 basis-[60%]">
              <div className={`text-sm ${t.fait ? "text-muted line-through" : "font-medium"}`}>{t.titre}</div>
              {(t.detail || t.auto) && (
                <div className="mt-0.5 text-xs text-muted">
                  {t.detail}
                  {t.auto && <span className="text-profit">{t.detail ? " · " : ""}fait automatiquement ✓</span>}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{actions(t)}</div>
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
          </div>
        );
      })}

      <form onSubmit={ajouter} className="mt-3 flex gap-2">
        <input className="input py-2" placeholder="+ Ajouter une tâche" value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} />
        <button className="btn shrink-0" disabled={!nouvelle.trim()}>
          Ajouter
        </button>
      </form>
      {annuler && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-night/70 px-3 py-2 text-sm">
          <span className="truncate text-muted">✓ {annuler.titre}</span>
          <button onClick={undo} className="ml-3 shrink-0 font-medium text-revenue">
            Annuler
          </button>
        </div>
      )}
      {editSale && <SaleForm sale={editSale} onClose={() => setEditSale(null)} />}
    </section>
  );
}
