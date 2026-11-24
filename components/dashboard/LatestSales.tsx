"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Thumb } from "@/components/ui/Thumb";
import { SaleModal } from "@/components/SaleModal";
import { euros, jourMois, signe } from "@/lib/format";
import { benefice, type Sale } from "@/lib/types";

export function LatestSales({ sales }: { sales: Sale[] }) {
  const [open, setOpen] = useState<Sale | null>(null);
  return (
    <Card title="Dernières ventes" right={`${sales.length} sur la période`}>
      {sales.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Aucune vente sur cette période.</p>
      ) : (
        <ul className="-mx-2">
          {sales.slice(0, 8).map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setOpen(s)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/[0.03] sm:gap-4"
              >
                <span className="w-11 shrink-0 text-sm text-muted">{jourMois(new Date(s.date_vente))}</span>
                <Thumb src={s.photo_url} alt={s.titre} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.titre}</span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-6">
                  <span className="text-sm sm:w-20 sm:text-right">{euros(s.prix)}</span>
                  <span className="text-sm font-semibold text-profit sm:w-24 sm:text-right">{signe(benefice(s))}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <SaleModal sale={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}
