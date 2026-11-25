"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Dot } from "@/components/Header";
import { Modal, ModalTitle } from "@/components/ui/Modal";
import { NotificationsCard } from "@/components/NotificationsCard";
import { ObjectifsCard } from "@/components/ObjectifsCard";
import { SyncPanel } from "@/components/SyncPanel";
import { Thumb } from "@/components/ui/Thumb";
import { createShop, deleteShop, updateShop, uploadPhoto } from "@/lib/data";
import { defaultPhotoPrompt } from "@/lib/prompt";
import { styleComplet, stylePhotos, type Shop } from "@/lib/types";
import { ShopIdCard } from "@/components/ShopIdCard";

const COLORS = ["#8b7cf6", "#f0a04d", "#4d8af0", "#4fd18b", "#ff6f59", "#e86bc3", "#40c9c9", "#e8d44d", "#a0a3ff", "#9a9cb0"];

export default function BoutiquesPage() {
  const { allShops, allSales, ready, error, refresh } = useAppState();
  const [form, setForm] = useState<Shop | "new" | null>(null);
  const [idCard, setIdCard] = useState<Shop | null>(null);
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
        <p className="rounded-2xl glass p-8 text-center text-sm text-muted">
          Aucune boutique pour l&apos;instant.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {active.map((s) => (
          <section key={s.id} className="rounded-2xl glass p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <button className="flex items-center gap-3 text-left" onClick={() => setIdCard(s)}>
                {s.avatar_url ? (
                  <img loading="lazy" decoding="async" src={s.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-2" style={{ ["--tw-ring-color" as string]: s.couleur }} />
                ) : (
                  <Dot color={s.couleur} size={14} />
                )}
                <div>
                  <div className="font-semibold">{s.nom}</div>
                  <div className="text-sm text-muted">Taille {s.taille || "—"}</div>
                </div>
              </button>
              <div className="flex flex-wrap justify-end gap-2">
                <button className="btn-primary px-3 py-1.5" onClick={() => setIdCard(s)}>
                  🪪 Carte d&apos;identité
                </button>
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
                  styleComplet(s) ? (
                    <span className="text-profit">✓ 3 photos</span>
                  ) : (
                    <span className="text-alert">{stylePhotos(s)}/3 photos</span>
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

      <ObjectifsCard />

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
      {idCard && (
        <ShopIdCard
          shop={allShops.find((x) => x.id === idCard.id) ?? idCard}
          onClose={() => setIdCard(null)}
          onEdit={() => {
            setForm(allShops.find((x) => x.id === idCard.id) ?? idCard);
            setIdCard(null);
          }}
        />
      )}
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
    fond_url: shop?.fond_url ?? "",
    sol_url: shop?.sol_url ?? "",
    style_avatar: shop?.style_avatar ?? "",
    style_fond: shop?.style_fond ?? "",
    style_sol: shop?.style_sol ?? "",
    prompt_photo: shop?.prompt_photo ?? "",
  });
  const [uploading, setUploading] = useState<string | null>(null);
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
      fond_url: v.fond_url || null,
      sol_url: v.sol_url || null,
      style_avatar: v.style_avatar.trim() || null,
      style_fond: v.style_fond.trim() || null,
      style_sol: v.style_sol.trim() || null,
      prompt_photo: v.prompt_photo.trim() || null,
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
          <div className="text-sm font-semibold">Carte d&apos;identité photo</div>
          <p className="mt-0.5 text-xs text-muted">
            Les 3 photos de référence, toujours les mêmes, pour que toutes les photos de la boutique se ressemblent. Les descriptions
            complètent les photos.
          </p>
          {(
            [
              ["avatar_url", "style_avatar", "1. Avatar", "Femme 25 ans, cheveux châtains mi-longs, silhouette fine…"],
              ["fond_url", "style_fond", "2. Fond / décor", "Chambre beige, grand miroir en bois, plante verte à gauche…"],
              ["sol_url", "style_sol", "3. Sol", "Parquet chêne clair, petit tapis écru…"],
            ] as const
          ).map(([urlKey, textKey, label, ph]) => (
            <div key={urlKey} className="mt-4 rounded-lg border border-line p-3">
              <div className="flex items-center gap-3">
                <Thumb src={v[urlKey] || null} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {label} {!v[urlKey] && <span className="text-xs font-normal text-alert">· photo à ajouter</span>}
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <label className="btn cursor-pointer px-2.5 py-1 text-xs">
                      {uploading === urlKey ? "Envoi…" : v[urlKey] ? "Changer la photo" : "Ajouter la photo"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploading(urlKey);
                          try {
                            const url = await uploadPhoto(f);
                            setV((x) => ({ ...x, [urlKey]: url }));
                          } catch (err) {
                            setError((err as Error).message);
                          } finally {
                            setUploading(null);
                          }
                        }}
                      />
                    </label>
                    {v[urlKey] && (
                      <button type="button" className="text-xs text-muted hover:text-white" onClick={() => setV({ ...v, [urlKey]: "" })}>
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <textarea
                className="input mt-2.5"
                rows={2}
                placeholder={ph}
                value={v[textKey]}
                onChange={(e) => setV({ ...v, [textKey]: e.target.value })}
              />
            </div>
          ))}
          <label className="label mt-3">
            <span className="flex items-center justify-between gap-2">
              Prompt ChatGPT
              <button
                type="button"
                className="text-xs text-revenue hover:underline"
                onClick={() => setV({ ...v, prompt_photo: defaultPhotoPrompt({ ...v, nom: v.nom, taille: v.taille || null, prompt_photo: null }) })}
              >
                Créer à partir des champs ci-dessus
              </button>
            </span>
            <textarea
              className="input mt-1.5 font-mono text-xs"
              rows={7}
              placeholder="Colle ici ton prompt ChatGPT habituel. Écris {article} à l'endroit où mettre l'article à porter."
              value={v.prompt_photo}
              onChange={(e) => setV({ ...v, prompt_photo: e.target.value })}
            />
            <span className="mt-1 block text-xs">
              Vide = prompt créé automatiquement. <code>{"{article}"}</code> sera remplacé par l&apos;article de la fiche.
            </span>
          </label>
        </div>
        {error && <p className="text-sm text-alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" disabled={busy || !!uploading}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
