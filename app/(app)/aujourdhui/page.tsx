"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { TachesDuJour } from "@/components/TachesDuJour";
import { Skeleton } from "@/components/ui/Skeleton";
import { Thumb } from "@/components/ui/Thumb";
import { euros, signe } from "@/lib/format";
import { benefice } from "@/lib/types";

const sod = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function TodayPage() {
  const { sales, listings, shopById, ready, error } = useAppState();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const d = useMemo(() => {
    const today = sod(now ?? new Date()).getTime();
    const todaySales = sales.filter((s) => new Date(s.date_vente).getTime() >= today);
    return {
      todaySales,
      todayProfit: todaySales.reduce((a, s) => a + benefice(s), 0),
      fichesToday: listings.filter((l) => new Date(l.created_at).getTime() >= today).length,
    };
  }, [sales, listings, now]);

  if (error) return <ErrorBox message={error} />;
  if (!ready || !now) return <Skeleton />;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rise">
        <div className="text-sm capitalize text-muted">
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="font-display mt-1 text-3xl font-semibold">{greeting(now)} 👋</h2>
      </div>

      {/* Chiffres du jour */}
      <div className="rise grid grid-cols-3 gap-3">
        <Stat label="Ventes du jour" value={String(d.todaySales.length)} cls="text-orders" />
        <Stat label="Bénéfice du jour" value={euros(d.todayProfit)} cls="text-profit" />
        <Stat label="Fiches créées" value={String(d.fichesToday)} cls="text-white" />
      </div>

      {/* Tâches du jour à cocher */}
      <TachesDuJour />

      {/* Ventes du jour */}
      {d.todaySales.length > 0 && (
        <Block title="🎉 Vendu aujourd'hui">
          {d.todaySales.map((s) => (
            <Row key={s.id} photo={s.photo_url} title={s.titre} sub={<>{shopById(s.shop_id)?.nom}</>}>
              <span className="text-sm font-semibold text-profit">{signe(benefice(s))}</span>
            </Row>
          ))}
        </Block>
      )}

    </div>
  );
}

function greeting(d: Date) {
  const h = d.getHours();
  return h < 6 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-2xl glass p-3 sm:p-5">
      <div className="text-[11px] text-muted sm:text-sm">{label}</div>
      <div className={`text-glow mt-1 truncate text-lg font-bold sm:text-3xl ${cls}`}>{value}</div>
    </div>
  );
}

function Block({
  title,
  tone,
  action,
  children,
}: {
  title: string;
  tone?: "alert";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`rise glass rounded-2xl p-4 sm:p-5 ${tone === "alert" ? "!border-alert/40" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className={`text-[15px] font-semibold ${tone === "alert" ? "text-alert" : ""}`}>{title}</h3>
        {action}
      </div>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

function Row({
  photo,
  title,
  sub,
  children,
}: {
  photo: string | null;
  title: string;
  sub: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 sm:flex-nowrap">
      <Thumb src={photo} size={40} alt={title} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted">{sub}</div>
      </div>
      <div className="flex w-full justify-end gap-2 sm:w-auto">{children}</div>
    </li>
  );
}
