"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { euros } from "@/lib/format";
import { getPeriod, inRange, PERIODS, type PeriodKey } from "@/lib/period";
import { evolution, ranking, series, totals } from "@/lib/stats";
import { AccountsRanking } from "./AccountsRanking";
import { ActivityBars } from "./ActivityBars";
import { DailyChart } from "./DailyChart";
import { KpiCard } from "./KpiCard";
import { LatestSales } from "./LatestSales";

export function Dashboard() {
  const { shops, sales, listings, allSales, shopId, ready, error } = useAppState();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30d");
  // « maintenant » est fixé côté navigateur pour éviter un décalage serveur/navigateur
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const view = useMemo(() => {
    if (!now) return null;
    const p = getPeriod(periodKey, now);
    const cur = totals(sales, p.current);
    const prev = totals(sales, p.previous);
    return {
      p,
      cur,
      prev,
      points: series(sales, listings, p),
      // Le classement compare toutes les boutiques (ou seulement celle choisie)
      rank: ranking(allSales, shopId === "all" ? shops : shops.filter((s) => s.id === shopId), p.current),
      latest: sales.filter((s) => inRange(s.date_vente, p.current)),
      toShip: sales.filter((s) => s.statut === "a_envoyer").length,
    };
  }, [now, periodKey, sales, listings, allSales, shops, shopId]);

  const periodLabel = PERIODS.find((x) => x.key === periodKey)!.label.toLowerCase();

  if (error) return <ErrorBox message={error} />;
  if (ready && shops.length === 0)
    return (
      <div className="rounded-2xl border border-line bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Bienvenue 👋</h2>
        <p className="mt-2 text-sm text-muted">Commence par ajouter ta première boutique Vinted.</p>
        <Link href="/boutiques" className="btn-primary mt-5">
          Ajouter une boutique
        </Link>
      </div>
    );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 2. Filtres de période */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {PERIODS.map((x) => (
          <button
            key={x.key}
            onClick={() => setPeriodKey(x.key)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              periodKey === x.key
                ? "border-white bg-white text-night"
                : "border-line bg-card text-muted hover:border-white/25 hover:text-white"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {!view || !ready ? (
        <div className="h-96" />
      ) : (
        <>
          {/* 3. Trois grandes cartes */}
          <div className="grid gap-4 md:grid-cols-3 sm:gap-5">
            <KpiCard
              label="Bénéfice"
              value={euros(view.cur.benefice)}
              valueClass="text-profit"
              evolution={evolution(view.cur.benefice, view.prev.benefice)}
              sub={`achats ${euros(view.cur.achats)} · frais ${euros(view.cur.frais)}`}
              data={view.points}
              dataKey="benefice"
              color="#4fd18b"
            />
            <KpiCard
              label="Chiffre d'affaires"
              value={euros(view.cur.ca)}
              valueClass="text-white"
              evolution={evolution(view.cur.ca, view.prev.ca)}
              sub={`panier moyen ${euros(view.cur.panierMoyen)}`}
              data={view.points}
              dataKey="ca"
              color="#ffffff"
            />
            <KpiCard
              label="Commandes"
              value={String(view.cur.commandes)}
              valueClass="text-white"
              evolution={evolution(view.cur.commandes, view.prev.commandes)}
              data={view.points}
              dataKey="commandes"
              color="#4d8af0"
            />
          </div>

          {/* 4. Bandeau colis à envoyer */}
          <Link
            href="/ventes?statut=a_envoyer"
            className="flex items-center justify-between rounded-2xl border border-alert/30 bg-alert/[0.07] px-5 py-3 text-sm transition-colors hover:bg-alert/[0.12]"
          >
            <span className="flex items-center gap-2.5 font-semibold text-alert">
              <span className="relative flex h-2 w-2">
                {view.toShip > 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert opacity-60" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-alert" />
              </span>
              Colis à envoyer : {view.toShip}
            </span>
            <span className="text-alert/80">Voir →</span>
          </Link>

          {/* 5 & 6. Courbes */}
          <DailyChart
            title={view.p.hourly ? "Bénéfice par heure" : "Bénéfice par jour"}
            data={view.points}
            dataKey="benefice"
            color="#4fd18b"
            hourly={view.p.hourly}
          />
          <DailyChart
            title={view.p.hourly ? "Chiffre d'affaires par heure" : "Chiffre d'affaires par jour"}
            data={view.points}
            dataKey="ca"
            color="#8b7cf6"
            hourly={view.p.hourly}
          />

          {/* 7. Activité + classement */}
          <div className="grid gap-4 lg:grid-cols-2 sm:gap-5">
            <ActivityBars data={view.points} hourly={view.p.hourly} />
            <AccountsRanking rows={view.rank} periodLabel={periodLabel} />
          </div>

          {/* 8. Dernières ventes */}
          <LatestSales sales={view.latest} />
        </>
      )}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-alert/40 bg-alert/[0.07] p-6 text-sm">
      <div className="font-semibold text-alert">Impossible de lire la base de données</div>
      <p className="mt-1 text-muted">{message}</p>
      <p className="mt-2 text-muted">
        Vérifie que le script <code>supabase/schema.sql</code> a bien été exécuté dans Supabase.
      </p>
    </div>
  );
}
