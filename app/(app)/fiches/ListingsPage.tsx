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
  const { listings, shops, shopId, setShopId, shopById, ready, error } = useAppState();
  const params = useSearchParams();
  const [statut, setStatut] = useState<ListingStatus | "">("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingAI, setCreatingAI] = useState(false);

  // Lien direct depuis Cowork : /fiches?fiche=<id>
  useEffect(() => {
    const id = params.get("fiche");
    if (id) setOpenId(id);
  }, [params]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return listings.filter(
      (l) =>
        (!statut || l.statut === statut) &&
        (!t ||
          l.titre.toLowerCase().includes(t) ||
          (l.marque ?? "").toLowerCase().includes(t) ||
          l.liens_produit.some((u) => u.toLowerCase().includes(t)))
    );
  }, [listings, statut, q]);

  const open: Listing | undefined = listings.find((l) => l.id === openId);
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
                statut === x.value ? "border-white bg-white text-night" : "border-line bg-card text-muted hover:text-white"
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
        <p className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-muted">Aucune fiche.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {list.map((l) => {
            const shop = shopById(l.shop_id);
            return (
              <button
                key={l.id}
                onClick={() => setOpenId(l.id)}
                className="overflow-hidden rounded-2xl border border-line bg-card text-left transition-colors hover:border-white/20"
              >
                <div className="relative aspect-[4/5] bg-line">
                  {l.photos[0] && <img src={l.photos[0]} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute left-2 top-2">
                    <ListingBadge statut={l.statut} />
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

      {open && <ListingModal listing={open} onClose={() => setOpenId(null)} />}
      {creating && <ListingForm onClose={() => setCreating(false)} />}
      {creatingAI && (
        <CreateWithAI
          onClose={() => setCreatingAI(false)}
          onCreated={(id) => {
            setCreatingAI(false);
            setOpenId(id);
          }}
        />
      )}
    </div>
  );
}
