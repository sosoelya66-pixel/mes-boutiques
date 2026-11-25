"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Dot } from "@/components/Header";
import { Modal, ModalTitle } from "@/components/ui/Modal";
import { NotificationsCard } from "@/components/NotificationsCard";
import { SyncPanel } from "@/components/SyncPanel";
import { Thumb } from "@/components/ui/Thumb";
import { createShop, deleteShop, updateShop, uploadPhoto } from "@/lib/data";
import type { Shop } from "@/lib/types";

const COLORS = ["#8b7cf6", "#f0a04d", "#4d8af0", "#4fd18b", "#ff6f59", "#e86bc3", "#40c9c9", "#e8d44d", "#a0a3ff", "#9a9cb0"];

export default function BoutiquesPage() {
  const { allShops, allSales, ready, error, refresh } = useAppState();
  const [form, setForm] = useState<Shop | "new" | null>(null);
  const salesCount = (id: string) => allSales.filter((s) => s.shop_id === id).length;

  async function remove(shop: Shop) {
    const n = salesCount(shop.id);
    try {
      if (n > 0) {
        // On garde l'historique : la boutique est seulement retirée (masquée)
        if (!confirm(`« ${shop.nom} » a ${n} vente(s). Elle sera retirée mais ses ventes restent dans la compta. Continuer ?`)) return;
        await updateShop(shop.id, { actif: false });
      } else {
        if (!confirm(`Supprimer « ${shop.nom} » ?`)) return;
        await deleteShop(shop.id);
      }
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (error) return <ErrorBox message={error} />;
  const active = allShops.filter((s) => s.actif);
  const archived = allShops.filter((s) => !s.actif);

  return (
    <div className="space-y-4">
      <button className="btn-primary" onClick={() => setForm("new")}>
        + Ajouter une boutique
      </button>

      {ready && active.length === 0 && (
        <p className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-muted">
          Aucune boutique pour l&apos;instant.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {active.map((s) => (
          <section key={s.id} className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Dot color={s.couleur} size={14} />
                <div>
                  <div className="font-semibold">{s.nom}</div>
                  <div className="text-sm text-muted">Taille {s.taille || "—"}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn px-3 py-1.5" onClick={() => setForm(s)}>
                  Modifier
                </button>
                <button className="btn-danger px-3 py-1.5" onClick={() => remove(s)}>
                  Retirer
                </button>
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <Row k="Alias e-mail" v={s.alias_email || "—"} />
              <Row k="Ventes" v={String(salesCount(s.id))} />
              <Row
                k="Style photo"
                v={
                  s.style_avatar || s.style_fond || s.style_sol || s.avatar_url ? (
                    <span className="text-profit">✓ défini</span>
                  ) : (
                    <span className="text-alert">à définir</span>
                  )
                }
              />
              <Row
                k="Dernière synchro"
                v={s.derniere_synchro ? new Date(s.derniere_synchro).toLocaleString("fr-FR") : "—"}
              />
            </dl>
          </section>
        ))}
      </div>

      <NotificationsCard />

      <SyncPanel />

      {archived.length > 0 && (
        <div className="rounded-2xl border border-line p-5 text-sm">
          <div className="mb-3 text-muted">Boutiques retirées</div>
          {archived.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2">
                <Dot color={s.couleur} /> {s.nom}
              </span>
              <button
                className="text-muted hover:text-white"
                onClick={async () => {
                  await updateShop(s.id, { actif: true });
                  await refresh();
                }}
              >
                Réactiver
              </button>
            </div>
          ))}
        </div>
      )}

      {form && <ShopForm shop={form === "new" ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="truncate text-right">{v}</dd>
    </div>
  );
}

function ShopForm({ shop, onClose }: { shop?: Shop; onClose: () => void }) {
  const { refresh, allShops } = useAppState();
  const [v, setV] = useState({
    nom: shop?.nom ?? "",
    taille: shop?.taille ?? "",
    alias_email: shop?.alias_email ?? "",
    couleur: shop?.couleur ?? COLORS[allShops.length % COLORS.length],
    avatar_url: shop?.avatar_url ?? "",
    style_avatar: shop?.style_avatar ?? "",
    style_fond: shop?.style_fond ?? "",
    style_sol: shop?.style_sol ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      nom: v.nom.trim(),
      taille: v.taille.trim() || null,
      alias_email: v.alias_email.trim().toLowerCase() || null,
      couleur: v.couleur,
      avatar_url: v.avatar_url || null,
      style_avatar: v.style_avatar.trim() || null,
      style_fond: v.style_fond.trim() || null,
      style_sol: v.style_sol.trim() || null,
    };
    try {
      if (shop) await updateShop(shop.id, payload);
      else await createShop(payload);
      await refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalTitle onClose={onClose}>{shop ? "Modifier la boutique" : "Ajouter une boutique"}</ModalTitle>
      <form onSubmit={save} className="space-y-4">
        <label className="label">
          Nom du compte Vinted
          <input className="input mt-1.5" required value={v.nom} onChange={(e) => setV({ ...v, nom: e.target.value })} />
        </label>
        <label className="label">
          Taille
          <input
            className="input mt-1.5"
            placeholder="S, M, 38…"
            value={v.taille}
            onChange={(e) => setV({ ...v, taille: e.target.value })}
          />
        </label>
        <label className="label">
          Alias e-mail
          <input
            type="email"
            className="input mt-1.5"
            placeholder="moi+boutiqueA@gmail.com"
            value={v.alias_email}
            onChange={(e) => setV({ ...v, alias_email: e.target.value })}
          />
          <span className="mt-1 block text-xs">L&apos;adresse utilisée par ce compte Vinted : elle sert à reconnaître ses e-mails.</span>
        </label>
        <div className="label">
          Couleur
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setV({ ...v, couleur: c })}
                className={`h-8 w-8 rounded-full border-2 ${v.couleur === c ? "border-white" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line p-4">
          <div className="text-sm font-semibold">Style photo</div>
          <p className="mt-0.5 text-xs text-muted">
            Repris automatiquement par Cowork pour les photos portées de cette boutique.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Thumb src={v.avatar_url || null} size={56} />
            <label className="btn cursor-pointer">
              {uploading ? "Envoi…" : v.avatar_url ? "Changer la photo de l'avatar" : "Photo de référence de l'avatar"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    const url = await uploadPhoto(f);
                    setV((x) => ({ ...x, avatar_url: url }));
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>
          {(
            [
              ["style_avatar", "Avatar", "Femme 25 ans, cheveux châtains mi-longs, silhouette fine…"],
              ["style_fond", "Fond / décor", "Mur blanc cassé, plante verte à gauche, lumière naturelle…"],
              ["style_sol", "Sol", "Parquet chêne clair…"],
            ] as const
          ).map(([k, label, ph]) => (
            <label key={k} className="label mt-3">
              {label}
              <textarea
                className="input mt-1.5"
                rows={2}
                placeholder={ph}
                value={v[k]}
                onChange={(e) => setV({ ...v, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" disabled={busy || uploading}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
