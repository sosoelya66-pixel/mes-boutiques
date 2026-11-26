"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Dot } from "@/components/Header";
import { CreateWithAI } from "@/components/CreateWithAI";
import { ListingForm } from "@/components/ListingForm";
import { ListingModal } from "@/components/ListingModal";
import { ListingBadge } from "@/components/ui/ListingBadge";
import { euros } from "@/lib/format";
import { LISTING_STATUTS, type Listing, type ListingStatus } from "@/lib/types";

/* eslint-disable @next/next/no-img-element */

export function ListingsPage() {
  const { listings, shops, shopId, setShopId, shopById, ready, error, refresh } = useAppState();
  const generating = listings.some((l) => l.generation?.statut === "en_cours");

  // Tant qu'une fiche se prépare, on rafraîchit toutes les 5 secondes
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => refresh(), 5000);
    return () => clearInterval(t);
  }, [generating, refresh]);
  const params = useSearchParams();
  const [statut, setStatut] = useState<ListingStatus | "">("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingAI, setCreatingAI] = useState(false);
  const [started, setStarted] = useState(false);
  const [draft, setDraft] = useState<Listing | null>(null);
  const attente = listings.filter((l) => l.generation?.statut === "en_attente");

  // Lien direct depuis Cowork : /fiches?fiche=<id>
  useEffect(() => {
    const id = params.get("fiche");
    if (id) setOpenId(id);
  }, [params]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return listings.filter(
      (l) =>
        l.generation?.statut !== "en_attente" &&
        (!statut || l.statut === statut) &&
        (!t ||
          l.titre.toLowerCase().includes(t) ||
          (l.marque ?? "").toLowerCase().includes(t) ||
          l.liens_produit.some((u) => u.toLowerCase().includes(t)))
    );
  }, [listings, statut, q]);

  const open: Listing | undefined = listings.find((l) => l.id === openId);
  // Lien vers une fiche « À générer » : on ouvre directement le formulaire de génération
  const enCours = draft ?? (open?.generation?.statut === "en_attente" ? open : null);
  const count = (s: ListingStatus) => listings.filter((l) => l.statut === s).length;

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={() => setCreatingAI(true)} disabled={!shops.length}>
          ✨ Créer avec Claude
        </button>
        <button className="btn" onClick={() => setCreating(true)}>
          + Fiche à la main
        </button>
        <span className="text-sm text-muted">Les fiches créées par Cowork arrivent aussi ici automatiquement.</span>
      </div>

      {started && (
        <div className="rise flex items-start justify-between gap-3 rounded-2xl border border-revenue/40 bg-revenue/10 px-5 py-3 text-sm">
          <span>
            ✨ Fiche en préparation. Tu peux fermer l&apos;appli : tu recevras une notification quand elle sera prête
            {generating ? "." : " (c'est fait !)."}
          </span>
          <button className="text-muted hover:text-white" onClick={() => setStarted(false)} aria-label="Fermer">
            ×
          </button>
        </div>
      )}

      <AGenerer attente={attente} onOpen={setDraft} />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="input"
          placeholder="Rechercher un titre, une marque ou un lien produit…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input sm:w-48" value={shopId} onChange={(e) => setShopId(e.target.value)}>
          <option value="all">Toutes les boutiques</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[{ value: "" as const, label: `Toutes (${listings.length})` }, ...LISTING_STATUTS.map((s) => ({ ...s, label: `${s.label} (${count(s.value)})` }))].map(
          (x) => (
            <button
              key={x.value}
              onClick={() => setStatut(x.value)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
                statut === x.value ? "pill-active text-white" : "border-line bg-card text-muted hover:text-white"
              }`}
            >
              {x.label}
            </button>
          )
        )}
      </div>

      {!ready ? (
        <p className="p-8 text-center text-sm text-muted">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl glass p-8 text-center text-sm text-muted">Aucune fiche.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {list.map((l) => {
            const shop = shopById(l.shop_id);
            return (
              <button
                key={l.id}
                onClick={() => setOpenId(l.id)}
                className="overflow-hidden rounded-2xl glass text-left transition-colors hover:border-white/20"
              >
                <div className="relative aspect-[4/5] bg-line">
                  {l.photos[0] && <img loading="lazy" decoding="async" src={l.photos[0]} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute left-2 top-2">
                    {l.generation?.statut === "en_cours" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-revenue/90 px-2.5 py-0.5 text-xs font-medium text-white shadow-[0_0_12px_rgba(139,124,246,.8)]">
                        <span className="inline-block animate-spin">⟳</span> {l.generation.etape}
                      </span>
                    ) : l.generation?.erreurs?.length ? (
                      <span className="rounded-full bg-alert/90 px-2.5 py-0.5 text-xs font-medium text-night">À vérifier</span>
                    ) : (
                      <ListingBadge statut={l.statut} />
                    )}
                  </span>
                  {l.photos.length > 1 && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-night/80 px-2 py-0.5 text-xs">
                      {l.photos.length} 📷
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-medium">{l.titre || "(sans titre)"}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Dot color={shop?.couleur} size={7} />
                    <span className="truncate">{shop?.nom ?? "—"}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{euros(l.prix)}</span>
                    <span className="text-xs text-profit">+{euros(l.prix - l.prix_achat)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && open.generation?.statut !== "en_attente" && <ListingModal listing={open} onClose={() => setOpenId(null)} />}
      {creating && <ListingForm onClose={() => setCreating(false)} />}
      {enCours && (
        <CreateWithAI
          key={enCours.id}
          initial={{
            draftId: enCours.id,
            shop_id: enCours.shop_id,
            lien: enCours.liens_produit[0] ?? "",
            photos: enCours.photos,
            prix_achat: enCours.prix_achat || undefined,
            notes: enCours.notes ?? "",
          }}
          onClose={() => {
            setDraft(null);
            setOpenId(null);
          }}
          onStarted={() => {
            setDraft(null);
            setOpenId(null);
            setStarted(true);
          }}
        />
      )}
      {creatingAI && (
        <CreateWithAI
          onClose={() => setCreatingAI(false)}
          onStarted={() => {
            setCreatingAI(false);
            setStarted(true);
          }}
        />
      )}
    </div>
  );
}

/* ---------- « À générer » : liens mis de côté, rien n'est payé tant qu'on ne lance pas ---------- */

function AGenerer({ attente, onOpen }: { attente: Listing[]; onOpen: (l: Listing) => void }) {
  const { shops, shopById, refresh } = useAppState();
  const [liens, setLiens] = useState("");
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function ajouter() {
    const urls = [...new Set(liens.match(/https?:\/\/[^\s,;]+/g) ?? [])];
    if (!urls.length) return setMsg("Colle au moins un lien (https://…).");
    setBusy(true);
    setMsg(null);
    try {
      for (const lien of urls) {
        const res = await fetch("/api/fiches/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attente: true, shop_id: shop, lien }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Erreur ${res.status}`);
      }
      setLiens("");
      setMsg(`${urls.length} lien${urls.length > 1 ? "s" : ""} ajouté${urls.length > 1 ? "s" : ""}.`);
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function retirer(id: string) {
    if (!confirm("Retirer ce lien de la liste ?")) return;
    await fetch(`/api/fiches/jobs/attente?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <details className="rounded-2xl glass p-4" open={attente.length > 0}>
      <summary className="cursor-pointer text-sm font-medium">
        🕓 À générer {attente.length > 0 && <span className="text-gold">({attente.length})</span>}
        <span className="ml-2 text-xs font-normal text-muted">liens mis de côté · rien n&apos;est payé tant que tu ne lances pas</span>
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <textarea
          className="input min-h-[44px]"
          rows={2}
          placeholder="Colle un ou plusieurs liens produits (un par ligne)…"
          value={liens}
          onChange={(e) => setLiens(e.target.value)}
        />
        <select className="input sm:w-44" value={shop} onChange={(e) => setShop(e.target.value)}>
          <option value="">Boutique : plus tard</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={ajouter} disabled={busy}>
          {busy ? "…" : "Ajouter"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
      {attente.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {attente.map((l) => {
            const s = shopById(l.shop_id);
            const lien = l.liens_produit[0];
            let host = "";
            try {
              host = lien ? new URL(lien).hostname.replace(/^www\.|^fr\./, "") : "";
            } catch {}
            return (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                {l.photos[0] ? (
                  <img src={l.photos[0]} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-line text-lg">🔗</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{host || "Photos seulement"}{l.notes ? ` · ${l.notes}` : ""}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Dot color={s?.couleur} size={7} /> {s?.nom ?? "Boutique à choisir"} · {l.photos.length} capture{l.photos.length > 1 ? "s" : ""}
                    {lien && (
                      <a href={lien} target="_blank" rel="noreferrer" className="ml-1 text-revenue hover:underline">
                        ouvrir
                      </a>
                    )}
                  </div>
                </div>
                <button className="btn-primary shrink-0 !px-3 !py-1.5 !text-xs" onClick={() => onOpen(l)}>
                  ✨ Générer
                </button>
                <button className="shrink-0 px-1 text-lg text-muted hover:text-alert" onClick={() => retirer(l.id)} aria-label="Retirer">
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
