"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { forecastMonth } from "@/lib/forecast";
import { Card } from "@/components/ui/Card";
import { Dot } from "@/components/Header";
import { euros, eurosRond } from "@/lib/format";
import type { Shop } from "@/lib/types";

const VISIBLE = 6;

export function AccountsRanking({
  rows,
  periodLabel,
}: {
  rows: { shop: Shop; ca: number }[];
  periodLabel: string;
}) {
  const [all, setAll] = useState(false);
  const { allSales, loadedAt } = useAppState();
  // Prévision de fin de mois, boutique par boutique
  const prev = useMemo(() => {
    const now = loadedAt ?? new Date();
    return new Map(rows.map((r) => [r.shop.id, forecastMonth(allSales.filter((x) => x.shop_id === r.shop.id), now)]));
  }, [rows, allSales, loadedAt]);
  const max = Math.max(1, ...rows.map((r) => r.ca));
  const shown = all ? rows : rows.slice(0, VISIBLE);
  const hidden = rows.length - VISIBLE;

  return (
    <Card title={`Les comptes · ${periodLabel}`} right="par chiffre d'affaires">
      <ol className="space-y-4">
        {shown.map((r, i) => (
          <li key={r.shop.id} className="flex items-center gap-3">
            <span className="w-5 text-sm font-semibold text-muted">{i + 1}</span>
            <Dot color={r.shop.couleur} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium">{r.shop.nom}</span>
                <span className="text-sm font-semibold text-revenue">{euros(r.ca)}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-line">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(r.ca / max) * 100}%`, background: r.shop.couleur }}
                />
              </div>
              {(() => {
                const f = prev.get(r.shop.id);
                if (!f) return null;
                const goal = r.shop.objectif_mensuel;
                return (
                  <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
                    <span>
                      Prévu fin {f.mois} : <span className="text-profit">{eurosRond(f.benefice.prevu)}</span> de bénéfice
                    </span>
                    {goal ? (
                      <span className={f.benefice.prevu >= goal ? "text-up" : "text-down"}>
                        {f.benefice.prevu >= goal ? "▲" : "▼"} objectif {eurosRond(goal)}
                      </span>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <button onClick={() => setAll((a) => !a)} className="mt-5 text-sm font-medium text-muted hover:text-white">
          {all ? "Réduire" : `Voir les ${hidden} autres comptes`}
        </button>
      )}
    </Card>
  );
}
