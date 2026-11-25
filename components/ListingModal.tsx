"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { Dot } from "@/components/Header";
import { ListingForm } from "@/components/ListingForm";
import { SaleForm } from "@/components/SaleForm";
import { CopyButton } from "@/components/ui/CopyButton";
import { ListingBadge } from "@/components/ui/ListingBadge";
import { Modal } from "@/components/ui/Modal";
import { updateListing } from "@/lib/data";
import { euros } from "@/lib/format";
import { shortUrl } from "@/lib/links";
import { photoPrompt } from "@/lib/prompt";
import type { Listing, Sale } from "@/lib/types";

/* eslint-disable @next/next/no-img-element */

export function ListingModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { shopById, refresh } = useAppState();
  const [mode, setMode] = useState<"view" | "edit" | "sold">("view");
  const [nbGen, setNbGen] = useState(2);
  const [genBusy, setGenBusy] = useState(false);
  async function genererPhotos() {
    setGenBusy(true);
    try {
      const res = await fetch("/api/fiches/jobs/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listing.id, nb: nbGen }),
      });
      if (!res.ok) return alert((await res.json().catch(() => ({}))).error ?? "Erreur");
      await refresh();
      onClose();
    } finally {
      setGenBusy(false);
    }
  }
  const shop = shopById(listing.shop_id);

  if (mode === "edit") return <ListingForm listing={listing} onClose={onClose} />;
  if (mode === "sold")
    return (
      <SaleForm
        prefill={
          {
            shop_id: listing.shop_id ?? undefined,
            listing_id: listing.id,
            titre: listing.titre,
            photo_url: listing.photos[0] ?? null,
            prix: listing.prix,
            prix_achat: listing.prix_achat,
            frais: 0,
            statut: "a_envoyer",
          } as Partial<Sale>
        }
        onSaved={async () => {
          await updateListing(listing.id, { statut: "vendu" });
        }}
        onClose={onClose}
      />
    );

  const details = [
    ["Taille", shop?.taille],
    ["Marque", listing.marque],
    ["État", listing.etat],
    ["Catégorie", listing.categorie],
    ["Couleur", listing.couleur],
    ["Matière", listing.matiere],
  ].filter(([, v]) => v) as [string, string][];

  const all = [
    listing.titre,
    "",
    listing.description,
    "",
    ...details.map(([k, v]) => `${k} : ${v}`),
    `Prix : ${euros(listing.prix)}`,
  ].join("\n");

  const block = (label: string, text: string, multiline = false) => (
    <div className="border-b border-line py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <CopyButton text={text} />
      </div>
      <div className={`mt-1 text-sm ${multiline ? "whitespace-pre-line" : ""}`}>{text || <span className="text-muted">—</span>}</div>
    </div>
  );

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <ListingBadge statut={listing.statut} />
          <span className="inline-flex items-center gap-1.5">
            <Dot color={shop?.couleur} size={8} /> {shop?.nom ?? "Sans boutique"}
          </span>
          <span>· créée le {new Date(listing.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
        <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-white" aria-label="Fermer">
          ×
        </button>
      </div>

      {listing.generation?.statut === "en_cours" && (
        <div className="mt-4 rounded-xl border border-revenue/40 bg-revenue/10 px-4 py-2.5 text-sm">
          <span className="inline-block animate-spin">⟳</span> En préparation : {listing.generation.etape}. Les photos apparaissent au fur et
          à mesure.
        </div>
      )}
      {!!listing.generation?.erreurs?.length && (
        <div className="mt-4 rounded-xl border border-alert/40 bg-alert/10 px-4 py-2.5 text-sm text-alert">
          {listing.generation.erreurs.map((e) => (
            <div key={e}>⚠️ {e}</div>
          ))}
          <button
            className="btn mt-2 !py-1.5 !text-xs"
            onClick={async () => {
              const res = await fetch("/api/fiches/jobs/retry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: listing.id }),
              });
              if (!res.ok) return alert((await res.json().catch(() => ({}))).error ?? "Erreur");
              await refresh();
              onClose();
            }}
          >
            ↻ Relancer la préparation
          </button>
        </div>
      )}

      {listing.photos.length > 0 && (
        <div className="no-scrollbar -mx-6 mt-4 flex gap-2 overflow-x-auto px-6">
          {listing.photos.map((p) => (
            <a key={p} href={p} target="_blank" rel="noreferrer" className="shrink-0">
              <img loading="lazy" decoding="async" src={p} alt="" className="h-36 w-28 rounded-xl object-cover" />
            </a>
          ))}
        </div>
      )}

      {/* Photos portées à la demande */}
      {listing.generation?.statut !== "en_cours" && shop && (shop.avatar_url || shop.style_avatar) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 text-sm">
          <span className="flex-1 text-muted">
            📸 Photos portées avec l&apos;avatar de {shop.nom}
            {!listing.photos.length && <span className="block text-xs text-alert">Ajoute d&apos;abord une photo du produit (Modifier → + Photos).</span>}
          </span>
          <select className="input w-auto !py-1.5" value={nbGen} onChange={(e) => setNbGen(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} photo{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <button className="btn-primary !py-1.5" onClick={genererPhotos} disabled={genBusy || !listing.photos.length}>
            {genBusy ? "…" : "Générer"}
          </button>
        </div>
      )}

      <div className="mt-3">
        {block("Titre", listing.titre)}
        {block("Description", listing.description, true)}
        {block("Prix", listing.prix ? String(listing.prix).replace(".", ",") : "")}
        {details.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 border-b border-line py-3 sm:grid-cols-3">
            {details.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 py-1">
                <span className="min-w-0 text-sm">
                  <span className="text-muted">{k} : </span>
                  {v}
                </span>
                <CopyButton text={v} label="⧉" />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between gap-4 border-b border-line py-3 text-sm">
          <span className="text-muted">Prix d&apos;achat</span>
          <span>
            {euros(listing.prix_achat)} ·{" "}
            <span className="text-profit">marge {euros(listing.prix - listing.prix_achat)}</span>
          </span>
        </div>
        <div className="flex justify-between gap-4 border-b border-line py-3 text-sm">
          <span className="shrink-0 text-muted">Lien produit</span>
          <span className="flex min-w-0 flex-col items-end gap-1">
            {listing.liens_produit.length ? (
              listing.liens_produit.map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="truncate text-orders hover:underline">
                  {shortUrl(u)} ↗
                </a>
              ))
            ) : (
              <span className="text-muted">—</span>
            )}
          </span>
        </div>
        {listing.vinted_url && (
          <div className="flex justify-between gap-4 border-b border-line py-3 text-sm">
            <span className="text-muted">Annonce Vinted</span>
            <a href={listing.vinted_url} target="_blank" rel="noreferrer" className="truncate text-orders hover:underline">
              Ouvrir ↗
            </a>
          </div>
        )}
        {listing.notes && (
          <div className="py-3 text-sm">
            <span className="text-muted">Notes : </span>
            {listing.notes}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <CopyButton text={all} label="Copier tout" className="!rounded-xl !px-3.5 !py-2 !text-sm" />
        {shop && (
          <CopyButton
            text={photoPrompt(shop, [listing.titre, listing.couleur, listing.matiere].filter(Boolean).join(", "))}
            label="📋 Prompt photo"
            className="!rounded-xl !px-3.5 !py-2 !text-sm"
          />
        )}
        <button className="btn" onClick={() => setMode("edit")}>
          Modifier
        </button>
        {listing.statut === "brouillon" && (
          <button
            className="btn"
            onClick={async () => {
              await updateListing(listing.id, { statut: "en_ligne" });
              await refresh();
              onClose();
            }}
          >
            Marquer en ligne
          </button>
        )}
        {listing.statut !== "vendu" && (
          <button className="btn-primary" onClick={() => setMode("sold")} disabled={!listing.shop_id}>
            Vendu
          </button>
        )}
      </div>
    </Modal>
  );
}
