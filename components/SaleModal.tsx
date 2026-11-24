"use client";

import { useEffect } from "react";
import { Dot } from "@/components/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Thumb } from "@/components/ui/Thumb";
import { useAppState } from "@/components/AppState";
import { euros, signe } from "@/lib/format";
import { benefice, type Sale } from "@/lib/types";

export function SaleModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { shopById } = useAppState();
  const shop = shopById(sale.shop_id);
  const b = benefice(sale);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-line bg-card p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <Thumb src={sale.photo_url} size={72} alt={sale.titre} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">{sale.titre}</div>
            <div className="mt-1 text-sm text-muted">@{sale.acheteur}</div>
            <div className="mt-2">
              <StatusBadge statut={sale.statut} />
            </div>
          </div>
          <button onClick={onClose} className="self-start text-xl leading-none text-muted hover:text-white" aria-label="Fermer">
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
          {row(
            "Date",
            new Date(sale.date_vente).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
          )}
          {row("Prix", euros(sale.prix))}
          {row("Prix d'achat", euros(sale.prix_achat))}
          {row("Frais", euros(sale.frais))}
          {row("Bénéfice", <span className="font-semibold text-profit">{signe(b)}</span>)}
          {row("Suivi", sale.suivi ?? "—")}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button disabled className="rounded-xl border border-line px-3 py-2.5 text-sm text-muted opacity-60" title="Disponible à l'étape 2">
            Bordereau
          </button>
          <button disabled className="rounded-xl border border-line px-3 py-2.5 text-sm text-muted opacity-60" title="Disponible à l'étape 2">
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}
