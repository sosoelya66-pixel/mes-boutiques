"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { Modal, ModalTitle } from "@/components/ui/Modal";
import { createListing, deleteListing, updateListing, uploadPhoto } from "@/lib/data";
import { LISTING_STATUTS, type Listing, type ListingStatus } from "@/lib/types";

/* eslint-disable @next/next/no-img-element */

export function ListingForm({ listing, onClose }: { listing?: Listing; onClose: () => void }) {
  const { shops, shopId, allShops, refresh } = useAppState();
  const [v, setV] = useState({
    shop_id: listing?.shop_id ?? (shopId !== "all" ? shopId : shops[0]?.id ?? ""),
    titre: listing?.titre ?? "",
    description: listing?.description ?? "",
    prix: listing ? String(listing.prix) : "",
    prix_achat: listing ? String(listing.prix_achat) : "",
    marque: listing?.marque ?? "",
    categorie: listing?.categorie ?? "",
    couleur: listing?.couleur ?? "",
    matiere: listing?.matiere ?? "",
    etat: listing?.etat ?? "",
    liens: (listing?.liens_produit ?? []).join("\n"),
    vinted_url: listing?.vinted_url ?? "",
    notes: listing?.notes ?? "",
    statut: (listing?.statut ?? "brouillon") as ListingStatus,
  });
  const [photos, setPhotos] = useState<string[]>(listing?.photos ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const toNum = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const shopOptions = allShops.filter((s) => s.actif || s.id === v.shop_id);
  const taille = allShops.find((s) => s.id === v.shop_id)?.taille;

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setBusy("photo");
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadPhoto(f));
      setPhotos((p) => [...p, ...urls]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError(null);
    const payload = {
      shop_id: v.shop_id || null,
      titre: v.titre.trim(),
      description: v.description.trim(),
      prix: toNum(v.prix),
      prix_achat: toNum(v.prix_achat),
      marque: v.marque.trim() || null,
      categorie: v.categorie.trim() || null,
      couleur: v.couleur.trim() || null,
      matiere: v.matiere.trim() || null,
      etat: v.etat.trim() || null,
      liens_produit: v.liens
        .split(/\s+/)
        .map((x) => x.trim())
        .filter(Boolean),
      vinted_url: v.vinted_url.trim() || null,
      notes: v.notes.trim() || null,
      statut: v.statut,
      photos,
    };
    try {
      if (listing) await updateListing(listing.id, payload);
      else await createListing(payload);
      await refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function remove() {
    if (!listing || !confirm("Supprimer cette fiche ?")) return;
    setBusy("delete");
    try {
      await deleteListing(listing.id);
      await refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const field = (k: keyof typeof v, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="label">
      {label}
      <input className="input mt-1.5" value={v[k]} onChange={set(k)} {...extra} />
    </label>
  );

  return (
    <Modal onClose={onClose} wide>
      <ModalTitle onClose={onClose}>{listing ? "Modifier la fiche" : "Nouvelle fiche"}</ModalTitle>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Boutique {taille && <span className="text-xs">· taille {taille}</span>}
          <select className="input mt-1.5" value={v.shop_id} onChange={set("shop_id")}>
            <option value="">— Aucune —</option>
            {shopOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Statut
          <select className="input mt-1.5" value={v.statut} onChange={set("statut")}>
            {LISTING_STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="label sm:col-span-2">
          Lien(s) produit — un par ligne
          <textarea
            className="input mt-1.5"
            rows={2}
            value={v.liens}
            onChange={set("liens")}
            placeholder="https://fr.aliexpress.com/item/…"
          />
        </label>

        <div className="sm:col-span-2">
          <div className="label">Photos</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={p} className="relative">
                <img src={p} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-night text-xs text-muted ring-1 ring-line hover:text-white"
                  aria-label="Retirer la photo"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-center text-xs text-muted hover:text-white">
              {busy === "photo" ? "Envoi…" : "+ Photos"}
              <input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
            </label>
          </div>
        </div>

        <label className="label sm:col-span-2">
          Titre <span className="text-xs">({v.titre.length}/50)</span>
          <input className="input mt-1.5" value={v.titre} onChange={set("titre")} />
        </label>
        <label className="label sm:col-span-2">
          Description
          <textarea className="input mt-1.5" rows={5} value={v.description} onChange={set("description")} />
        </label>
        {field("prix", "Prix de vente (€)", { inputMode: "decimal" })}
        {field("prix_achat", "Prix d'achat (€)", { inputMode: "decimal" })}
        {field("marque", "Marque")}
        {field("etat", "État")}
        {field("categorie", "Catégorie")}
        {field("couleur", "Couleur")}
        {field("matiere", "Matière")}
        {field("vinted_url", "Lien de l'annonce Vinted", { placeholder: "https://www.vinted.fr/items/…" })}
        <label className="label sm:col-span-2">
          Notes
          <textarea className="input mt-1.5" rows={2} value={v.notes} onChange={set("notes")} />
        </label>

        {error && <p className="text-sm text-alert sm:col-span-2">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          {listing ? (
            <button type="button" className="btn-danger" onClick={remove} disabled={!!busy}>
              Supprimer
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Annuler
            </button>
            <button className="btn-primary" disabled={!!busy}>
              {busy === "save" ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
