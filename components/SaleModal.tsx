"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { BordereauButton } from "@/components/BordereauButton";
import { Dot } from "@/components/Header";
import { SaleForm } from "@/components/SaleForm";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriceBadge } from "@/components/ui/PriceBadge";
import { Thumb } from "@/components/ui/Thumb";
import { updateSale } from "@/lib/data";
import { euros, signe } from "@/lib/format";
import { shortUrl } from "@/lib/links";
import { benefice, type Sale } from "@/lib/types";


export function SaleModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { shopById, listingById, refresh } = useAppState();
  const [editing, setEditing] = useState(false);
  const shop = shopById(sale.shop_id);
  const fiche = listingById(sale.listing_id);
  const b = benefice(sale);

  if (editing) return <SaleForm sale={sale} onClose={onClose} />;

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-muted">{k}</span>
      <span className="min-w-0 text-right">{v}</span>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <div className="flex gap-4">
        <Thumb src={sale.photo_url} size={72} alt={sale.titre} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-snug">{sale.titre}</div>
          {sale.acheteur && <div className="mt-1 text-sm text-muted">@{sale.acheteur}</div>}
          <div className="mt-2">
            <StatusBadge statut={sale.statut} />
          </div>
        </div>
        <button onClick={onClose} className="self-start text-2xl leading-none text-muted hover:text-white" aria-label="Fermer">
          ×
        </button>
      </div>
      <div className="mt-5">
        {row(
          "Boutique",
          <span className="inline-flex items-center gap-2">
            <Dot color={shop?.couleur} /> {shop?.nom}
          </span>
        )}
        {row("Date", new Date(sale.date_vente).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }))}
        {row(
          "Prix",
          <span className="inline-flex items-center gap-2">
            <PriceBadge sale={sale} />
            {euros(sale.prix)}
          </span>
        )}
        {row("Prix d'achat", euros(sale.prix_achat))}
        {row("Frais", euros(sale.frais))}
        {row("Bénéfice", <span className={`font-semibold ${b >= 0 ? "text-profit" : "text-down"}`}>{signe(b)}</span>)}
        {row("Suivi", sale.suivi ?? "—")}
        {row(
          "Lien produit",
          fiche?.liens_produit.length ? (
            <span className="flex flex-col items-end gap-1">
              {fiche.liens_produit.map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="truncate text-orders hover:underline">
                  {shortUrl(u)} ↗
                </a>
              ))}
            </span>
          ) : (
            <span className="text-muted">{fiche ? "aucun lien" : "fiche non reliée"}</span>
          )
        )}
        {sale.notes && row("Notes", sale.notes)}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <BordereauButton value={sale.bordereau_url} />
        <button className="btn" onClick={() => setEditing(true)}>
          Modifier
        </button>
        {sale.statut === "a_envoyer" && (
          <button
            className="btn-primary col-span-2"
            onClick={async () => {
              await updateSale(sale.id, { statut: "envoye" });
              await refresh();
              onClose();
            }}
          >
            Marquer envoyé
          </button>
        )}
      </div>
    </Modal>
  );
}
