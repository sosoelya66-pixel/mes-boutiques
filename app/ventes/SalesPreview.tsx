"use client";

// Aperçu en lecture seule (étape 1). La vraie page arrive à l'étape 2.
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { Dot } from "@/components/Header";
import { SaleModal } from "@/components/SaleModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Thumb } from "@/components/ui/Thumb";
import { euros, jourMois, signe } from "@/lib/format";
import { benefice, type Sale } from "@/lib/types";

export function SalesPreview() {
  const { sales, shopById } = useAppState();
  const statut = useSearchParams().get("statut");
  const [open, setOpen] = useState<Sale | null>(null);
  const list = statut ? sales.filter((s) => s.statut === statut) : sales;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Aperçu {statut === "a_envoyer" ? "des colis à envoyer" : "des ventes"} ({list.length}) — filtres,
          bordereaux et modification arrivent à l&apos;étape 2.
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-2 sm:p-3">
        {list.map((s) => {
          const shop = shopById(s.shop_id);
          return (
            <button
              key={s.id}
              onClick={() => setOpen(s)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/[0.03] sm:gap-4"
            >
              <Thumb src={s.photo_url} alt={s.titre} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.titre}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  @{s.acheteur} · <Dot color={shop?.couleur} size={7} /> {shop?.nom} · {jourMois(new Date(s.date_vente))}
                </span>
              </span>
              <span className="hidden sm:block">
                <StatusBadge statut={s.statut} />
              </span>
              <span className="flex w-24 shrink-0 flex-col items-end text-sm">
                <span>{euros(s.prix)}</span>
                <span className="font-semibold text-profit">{signe(benefice(s))}</span>
              </span>
            </button>
          );
        })}
      </div>
      {open && <SaleModal sale={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
