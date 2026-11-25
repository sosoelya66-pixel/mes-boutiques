"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { CreateWithAI } from "@/components/CreateWithAI";
import { CopyButton } from "@/components/ui/CopyButton";
import { euros } from "@/lib/format";
import { deleteRadar, loadRadar } from "@/lib/data";
import type { RadarProduit, RadarRecherche } from "@/lib/radar/types";

const CONF: Record<RadarProduit["confiance"], string> = {
  haute: "bg-profit/15 text-profit",
  moyenne: "bg-orders/15 text-orders",
  faible: "bg-alert/15 text-alert",
};

export default function RadarPage() {
  const { shops, shopId, shopById } = useAppState();
  const [v, setV] = useState({ shop_id: shopId !== "all" ? shopId : "", categorie: "", budget: "", lien: "", prix: "", ville: "Lille" });
  useEffect(() => {
    try {
      const vi = localStorage.getItem("radar_ville");
      if (vi) setV((x) => ({ ...x, ville: vi }));
    } catch {}
  }, []);
  const [mode, setMode] = useState<"chercher" | "lien">("chercher");
  const [list, setList] = useState<RadarRecherche[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [fiche, setFiche] = useState<RadarProduit | null>(null);
  const [started, setStarted] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await loadRadar());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const running = list?.some((r) => r.statut === "en_cours");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [running, load]);

  async function lancer() {
    setError(null);
    try {
      localStorage.setItem("radar_ville", v.ville);
    } catch {}
    setSending(true);
    try {
      const res = await fetch("/api/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "lien"
            ? { shop_id: v.shop_id || null, lien: v.lien, prix: parseFloat(v.prix.replace(",", ".")), ville: v.ville }
            : { shop_id: v.shop_id || null, categorie: v.categorie, budget_max: parseFloat(v.budget.replace(",", ".")), ville: v.ville }
        ),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Erreur ${res.status}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Formulaire */}
      <section className="rise glass glow-corner rounded-2xl p-5 sm:p-6" style={{ ["--glow" as string]: "#8b7cf6" }}>
        <h2 className="text-[15px] font-semibold">🔎 Radar produits Temu · Shein</h2>
        <p className="mt-1 text-sm text-muted">
          Claude cherche des produits, compare le prix d&apos;achat au prix de revente moyen sur Vinted et calcule ton bénéfice.
        </p>
        <div className="mt-4 flex gap-2">
          {(["chercher", "lien"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${mode === m ? "pill-active text-white" : "border-line bg-card text-muted hover:text-white"}`}
            >
              {m === "chercher" ? "Trouver des produits" : "Analyser un lien"}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="label">
            Boutique
            <select className="input mt-1.5" value={v.shop_id} onChange={(e) => setV({ ...v, shop_id: e.target.value })}>
              <option value="">Toutes</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </label>
          {mode === "chercher" ? (
            <>
              <label className="label">
                Catégorie (facultatif)
                <input className="input mt-1.5" placeholder="sacs, robes d'hiver, bijoux…" value={v.categorie} onChange={(e) => setV({ ...v, categorie: e.target.value })} />
              </label>
              <label className="label">
                Prix d&apos;achat max (€)
                <input className="input mt-1.5" inputMode="decimal" placeholder="ex. 15" value={v.budget} onChange={(e) => setV({ ...v, budget: e.target.value })} />
              </label>
            </>
          ) : (
            <>
              <label className="label">
                Lien Temu ou Shein
                <input className="input mt-1.5" placeholder="https://www.temu.com/…" value={v.lien} onChange={(e) => setV({ ...v, lien: e.target.value })} />
              </label>
              <label className="label">
                Prix affiché (€, conseillé)
                <input className="input mt-1.5" inputMode="decimal" placeholder="ex. 8,90" value={v.prix} onChange={(e) => setV({ ...v, prix: e.target.value })} />
              </label>
            </>
          )}
        </div>
        <label className="label mt-3 block max-w-xs">
          Livraison à
          <input className="input mt-1.5" value={v.ville} onChange={(e) => setV({ ...v, ville: e.target.value })} placeholder="Lille" />
        </label>
        <p className="mt-2 text-xs text-muted">Seuls les produits revendables au moins ×2 (revente ≥ 2 × prix d&apos;achat) sont affichés.</p>
        {error && <p className="mt-3 text-sm text-alert">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Environ 1 à 2 minutes · tu peux fermer l&apos;appli, une notification te prévient.</p>
          <button className="btn-primary" onClick={lancer} disabled={sending || running || (mode === "lien" && !v.lien.trim())}>
            {running ? "Recherche en cours…" : sending ? "Envoi…" : mode === "lien" ? "🔎 Analyser" : "🔎 Lancer le radar"}
          </button>
        </div>
      </section>

      {started && (
        <div className="rise rounded-2xl border border-revenue/40 bg-revenue/10 px-5 py-3 text-sm">
          ✨ Fiche en préparation dans l&apos;onglet Fiches. Tu recevras une notification quand elle sera prête.
        </div>
      )}

      {/* Résultats */}
      {list === null ? (
        <div className="h-40 animate-pulse rounded-2xl glass" />
      ) : list.length === 0 ? (
        <p className="glass rounded-2xl p-8 text-center text-sm text-muted">Lance ta première recherche.</p>
      ) : (
        list.map((r) => (
          <section key={r.id} className="rise space-y-3">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h3 className="text-sm font-semibold">
                {r.params.lien ? "Analyse d'un lien" : r.params.categorie || "Recherche libre"}
                {r.params.budget_max ? ` · max ${euros(r.params.budget_max)}` : ""}
                {r.params.shop_id ? ` · ${shopById(r.params.shop_id)?.nom ?? ""}` : ""}
              </h3>
              <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                {r.statut !== "en_cours" && (
                  <button
                    onClick={async () => {
                      await deleteRadar(r.id);
                      load();
                    }}
                    className="hover:text-white"
                    aria-label="Supprimer"
                  >
                    ×
                  </button>
                )}
              </span>
            </div>
            {r.statut === "en_cours" && (
              <div className="glass rounded-2xl p-5 text-sm">
                <span className="inline-block animate-spin">⟳</span> Claude parcourt Temu et Shein… (1 à 2 minutes)
              </div>
            )}
            {r.statut === "erreur" && <div className="rounded-2xl border border-alert/40 bg-alert/10 p-4 text-sm text-alert">⚠️ {r.erreur}</div>}
            {r.statut === "termine" && r.resultats && (
              <>
                {r.resultats.resume && <p className="px-1 text-xs text-muted">{r.resultats.resume}</p>}
                {r.resultats.produits.length === 0 ? (
                  <p className="glass rounded-2xl p-5 text-sm text-muted">Aucun produit fiable trouvé (lien ou prix introuvable). Relance avec une autre catégorie.</p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {r.resultats.produits.map((p) => (
                      <ProduitCard key={p.lien} p={p} onFiche={() => setFiche(p)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        ))
      )}

      <p className="glass rounded-2xl p-4 text-xs text-muted">
        📱 <b className="text-white">Ouvrir dans l&apos;app {"Temu / Shein"}</b> : touche « Copier le lien », puis ouvre l&apos;app Temu (ou Shein) : elle
        propose d&apos;ouvrir le lien copié, sinon colle-le dans sa barre de recherche. « Copier le nom » permet aussi de chercher le produit dans
        l&apos;app.
      </p>
      <p className="text-center text-xs text-muted">
        Le prix de revente est une estimation de Claude (marché de la seconde main + tes ventes), pas un relevé de Vinted. Vérifie la qualité avant d&apos;acheter en quantité.
      </p>

      {fiche && (
        <CreateWithAI
          initial={{
            shop_id: shops.find((s) => s.nom === fiche.boutique_conseillee)?.id ?? (v.shop_id || undefined),
            lien: fiche.lien,
            prix_achat: fiche.prix_achat,
            photo: fiche.image,
            notes: `Prix de revente conseillé : ${fiche.revente_conseillee} €`,
          }}
          onClose={() => setFiche(null)}
          onStarted={() => {
            setFiche(null);
            setStarted(true);
          }}
        />
      )}
    </div>
  );
}

function ProduitCard({ p, onFiche }: { p: RadarProduit; onFiche: () => void }) {
  return (
    <article className="glass flex gap-4 rounded-2xl p-4">
      <a href={p.lien} target="_blank" rel="noreferrer" className="shrink-0">
        {p.image ? (
          <img src={p.image} alt={p.titre} loading="lazy" className="h-32 w-28 rounded-xl object-cover sm:h-36 sm:w-32" />
        ) : (
          <div className="flex h-32 w-28 flex-col items-center justify-center gap-1 rounded-xl bg-line p-2 text-center text-[11px] text-muted sm:h-36 sm:w-32">
            <span className="text-2xl">{p.plateforme === "shein" ? "🛍" : "🧡"}</span>photo non fournie par {p.plateforme === "shein" ? "Shein" : "Temu"}
          </div>
        )}
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-sm font-semibold">{p.titre}</h4>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${CONF[p.confiance]}`}>{p.confiance}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {p.plateforme === "temu" ? "Temu" : p.plateforme === "shein" ? "Shein" : "Fournisseur"} · {p.categorie}
          {p.boutique_conseillee ? ` · pour ${p.boutique_conseillee}` : ""}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/5 px-1 py-1.5">
            <div className="text-[10px] text-muted">Achat{p.prix_source === "estime" ? " (estimé)" : ""}</div>
            <div className="text-sm font-semibold">
              {p.prix_source !== "page" ? "≈ " : ""}
              {euros(p.prix_achat)}
            </div>
          </div>
          <div className="rounded-lg bg-white/5 px-1 py-1.5">
            <div className="text-[10px] text-muted">Revente moy.</div>
            <div className="text-sm font-semibold text-revenue">{euros(p.revente_conseillee)}</div>
          </div>
          <div className="rounded-lg bg-profit/10 px-1 py-1.5">
            <div className="text-[10px] text-muted">Bénéfice</div>
            <div className="text-glow text-sm font-bold text-profit">+{euros(p.marge)}</div>
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-muted">
          revente {euros(p.revente_min)} – {euros(p.revente_max)} · ×{p.multiplicateur.toLocaleString("fr-FR")}
        </div>
        {p.prix_source !== "page" && (
          <p className="mt-1 text-[11px] text-alert/90">Prix d&apos;achat à vérifier sur la page (Temu/Shein masquent leurs prix).</p>
        )}
        <p className="mt-1.5 line-clamp-2 text-xs">{p.pourquoi}</p>
        {p.risques && <p className="mt-0.5 line-clamp-1 text-xs text-alert/90">⚠ {p.risques}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={p.lien} label={`📋 Copier le lien ${p.plateforme === "shein" ? "Shein" : "Temu"}`} className="!rounded-xl !px-3 !py-1.5 !text-xs !text-white" />
          <CopyButton text={p.titre} label="Copier le nom" className="!rounded-xl !px-3 !py-1.5 !text-xs" />
          <a href={p.lien} target="_blank" rel="noreferrer" className="btn !px-3 !py-1.5 !text-xs">
            ↗
          </a>
          <button onClick={onFiche} className="btn-primary !px-3 !py-1.5 !text-xs">
            ✨ Générer la fiche
          </button>
        </div>
      </div>
    </article>
  );
}
