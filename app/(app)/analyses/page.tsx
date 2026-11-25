"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppState } from "@/components/AppState";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Dot } from "@/components/Header";
import { ListingModal } from "@/components/ListingModal";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Thumb } from "@/components/ui/Thumb";
import { euros } from "@/lib/format";
import { benefice, type Listing, type Sale } from "@/lib/types";

const DAY = 86400000;
const PERIODS = [
  { key: 30, label: "30 jours" },
  { key: 90, label: "90 jours" },
  { key: 365, label: "12 mois" },
  { key: 0, label: "Tout" },
];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const pct = (n: number) => `${Math.round(n)} %`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function AnalysesPage() {
  const { sales, allSales, listings, shops, shopId, error, ready } = useAppState();
  const [days, setDays] = useState(90);
  const [now, setNow] = useState<Date | null>(null);
  const [goal, setGoal] = useState<number>(0);
  const [openFiche, setOpenFiche] = useState<Listing | null>(null);

  useEffect(() => {
    setNow(new Date());
    try {
      setGoal(Number(localStorage.getItem("objectif_benefice") ?? 0));
    } catch {}
  }, []);

  const saveGoal = (v: number) => {
    setGoal(v);
    try {
      localStorage.setItem("objectif_benefice", String(v));
    } catch {}
  };

  const a = useMemo(() => {
    if (!now) return null;
    const from = days ? now.getTime() - days * DAY : 0;
    const inP = (iso: string) => new Date(iso).getTime() >= from;
    const ps = sales.filter((s) => inP(s.date_vente));
    const byId = new Map(listings.map((l) => [l.id, l]));
    const delay = (s: Sale) => {
      const l = s.listing_id ? byId.get(s.listing_id) : undefined;
      if (!l) return null;
      const d = (new Date(s.date_vente).getTime() - new Date(l.created_at).getTime()) / DAY;
      return d >= 0 ? d : null;
    };
    const ca = ps.reduce((x, s) => x + s.prix, 0);
    const ben = ps.reduce((x, s) => x + benefice(s), 0);
    const delays = ps.map(delay).filter((d): d is number => d !== null);
    const created = listings.filter((l) => inP(l.created_at));
    const soldOfCreated = created.filter((l) => l.statut === "vendu").length;

    const group = (key: (s: Sale) => string) => {
      const m = new Map<string, Sale[]>();
      for (const s of ps) m.set(key(s), [...(m.get(key(s)) ?? []), s]);
      return [...m.entries()]
        .map(([name, list]) => {
          const c = list.reduce((x, s) => x + s.prix, 0);
          const b = list.reduce((x, s) => x + benefice(s), 0);
          return {
            name,
            ventes: list.length,
            ca: c,
            benefice: b,
            marge: c ? (b / c) * 100 : 0,
            delai: avg(list.map(delay).filter((d): d is number => d !== null)),
          };
        })
        .sort((x, y) => y.benefice - x.benefice);
    };

    // Boutiques : toujours toutes, pour pouvoir les comparer
    const shopRows = shops
      .map((shop) => {
        const list = allSales.filter((s) => s.shop_id === shop.id && inP(s.date_vente));
        const c = list.reduce((x, s) => x + s.prix, 0);
        const b = list.reduce((x, s) => x + benefice(s), 0);
        return {
          shop,
          ventes: list.length,
          ca: c,
          benefice: b,
          panier: list.length ? c / list.length : 0,
          marge: c ? (b / c) * 100 : 0,
          enLigne: listings.filter((l) => l.shop_id === shop.id && l.statut === "en_ligne").length,
        };
      })
      .sort((x, y) => y.benefice - x.benefice);

    const weekday = WEEKDAYS.map((label) => ({ label, ventes: 0 }));
    for (const s of ps) weekday[(new Date(s.date_vente).getDay() + 6) % 7].ventes++;

    // Objectif du mois
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProfit = sales.filter((s) => new Date(s.date_vente).getTime() >= monthStart).reduce((x, s) => x + benefice(s), 0);
    const elapsed = Math.max(1, (now.getTime() - monthStart) / DAY);
    const projection = (monthProfit / elapsed) * daysInMonth;

    const sleeping = listings
      .filter((l) => l.statut === "en_ligne" && now.getTime() - new Date(l.created_at).getTime() > 21 * DAY)
      .sort((x, y) => x.created_at.localeCompare(y.created_at));

    return {
      count: ps.length,
      ca,
      ben,
      marge: ca ? (ben / ca) * 100 : null,
      panier: ps.length ? ca / ps.length : null,
      delai: avg(delays),
      taux: created.length ? (soldOfCreated / created.length) * 100 : null,
      created: created.length,
      categories: group((s) => (s.listing_id && byId.get(s.listing_id)?.categorie) || "Sans catégorie"),
      articles: group((s) => s.titre).slice(0, 10),
      shopRows,
      weekday,
      monthProfit,
      projection,
      sleeping,
    };
  }, [now, days, sales, allSales, listings, shops]);

  if (error) return <ErrorBox message={error} />;
  if (!ready || !a || !now) return <Skeleton />;

  const best = a.weekday.reduce((x, y) => (y.ventes > x.ventes ? y : x), a.weekday[0]);
  const goalPct = goal ? Math.min(100, (a.monthProfit / goal) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setDays(p.key)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
              days === p.key ? "pill-active text-white" : "border-line bg-card text-muted hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Objectif du mois */}
      <Card
        className="rise"
        title={`Objectif de ${now.toLocaleDateString("fr-FR", { month: "long" })}`}
        right={
          <label className="flex items-center gap-2">
            bénéfice visé
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={goal || ""}
              placeholder="ex. 500"
              onChange={(e) => saveGoal(Number(e.target.value))}
              className="input w-24 py-1 text-right"
            />
            €
          </label>
        }
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-glow text-[32px] font-bold leading-none text-profit">{euros(a.monthProfit)}</span>
          {goal > 0 && <span className="text-sm text-muted">{pct(goalPct)} de {euros(goal)}</span>}
        </div>
        {goal > 0 && (
          <div className="mt-3 h-2.5 rounded-full bg-line">
            <div className="h-2.5 rounded-full transition-all" style={{ width: `${goalPct}%`, background: "linear-gradient(90deg,#4d8af0,#4fd18b)", boxShadow: "0 0 14px rgba(79,209,139,.6)" }} />
          </div>
        )}
        <p className="mt-3 text-sm text-muted">
          À ce rythme : <span className="text-white">{euros(a.projection)}</span> en fin de mois
          {goal > 0 && (a.projection >= goal ? <span className="text-up"> ▲ objectif atteint</span> : <span className="text-down"> ▼ il manque {euros(goal - a.projection)}</span>)}
          .
        </p>
      </Card>

      {/* Indicateurs */}
      <div className="rise grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        <Kpi label="Marge moyenne" value={a.marge === null ? "—" : pct(a.marge)} hint="bénéfice ÷ chiffre d'affaires" cls="text-profit" />
        <Kpi label="Délai moyen de vente" value={a.delai === null ? "—" : `${a.delai.toFixed(1).replace(".", ",")} j`} hint="de la fiche à la vente" cls="text-orders" />
        <Kpi label="Taux de vente des fiches" value={a.taux === null ? "—" : pct(a.taux)} hint={`${a.created} fiche(s) créée(s)`} cls="text-revenue" />
        <Kpi label="Panier moyen" value={a.panier === null ? "—" : euros(a.panier)} hint={`${a.count} vente(s)`} cls="text-white" />
      </div>

      {/* Boutiques */}
      <Card title="Comparaison des boutiques" className="rise">
        <Table
          head={["Boutique", "Ventes", "CA", "Bénéfice", "Marge", "Panier", "En ligne"]}
          rows={a.shopRows.map((r) => [
            <span key="n" className={`inline-flex items-center gap-2 ${shopId !== "all" && shopId !== r.shop.id ? "opacity-50" : ""}`}>
              <Dot color={r.shop.couleur} /> {r.shop.nom}
            </span>,
            r.ventes,
            euros(r.ca),
            <span key="b" className="text-profit">{euros(r.benefice)}</span>,
            r.ca ? pct(r.marge) : "—",
            r.ventes ? euros(r.panier) : "—",
            r.enLigne,
          ])}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 sm:gap-5">
        {/* Catégories */}
        <Card title="Par catégorie" className="rise">
          <Table
            head={["Catégorie", "Ventes", "Bénéfice", "Marge", "Délai"]}
            rows={a.categories.map((c) => [
              c.name,
              c.ventes,
              <span key="b" className="text-profit">{euros(c.benefice)}</span>,
              pct(c.marge),
              c.delai === null ? "—" : `${Math.round(c.delai)} j`,
            ])}
            empty="Pas encore de ventes sur la période."
          />
          <p className="mt-3 text-xs text-muted">La catégorie vient de la fiche liée à la vente (fiches créées par Cowork).</p>
        </Card>

        {/* Jours de la semaine */}
        <Card title="Ventes par jour de la semaine" right={best.ventes ? `meilleur jour : ${best.label}` : undefined} className="rise">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.weekday} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid vertical={false} stroke="#262838" />
                <XAxis dataKey="label" tick={{ fill: "#9a9cb0", fontSize: 12 }} tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tick={{ fill: "#9a9cb0", fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-xl border border-line bg-night/95 px-3 py-2 text-sm">
                        {payload[0].payload.label} : <span className="text-orders">{payload[0].payload.ventes} vente(s)</span>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="ventes" fill="#4d8af0" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Articles */}
      <Card title="Articles les plus rentables" className="rise">
        <Table
          head={["Article", "Ventes", "CA", "Bénéfice", "Marge"]}
          rows={a.articles.map((c) => [
            <span key="t" className="block max-w-[260px] truncate">{c.name}</span>,
            c.ventes,
            euros(c.ca),
            <span key="b" className="text-profit">{euros(c.benefice)}</span>,
            pct(c.marge),
          ])}
          empty="Pas encore de ventes sur la période."
        />
      </Card>

      {/* Fiches qui dorment */}
      <Card title={`Fiches qui dorment (${a.sleeping.length})`} right="en ligne depuis plus de 3 semaines" className="rise">
        {a.sleeping.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Aucune : tes annonces tournent bien.</p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {a.sleeping.slice(0, 12).map((l) => (
                <li key={l.id}>
                  <button onClick={() => setOpenFiche(l)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <Thumb src={l.photos[0] ?? null} size={40} />
                    <span className="min-w-0 flex-1 truncate text-sm">{l.titre || "(sans titre)"}</span>
                    <span className="text-sm">{euros(l.prix)}</span>
                    <span className="w-16 text-right text-xs text-alert">
                      {Math.floor((now.getTime() - new Date(l.created_at).getTime()) / DAY)} j
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Pistes : baisser légèrement le prix, refaire la première photo, ou republier l&apos;annonce.</p>
          </>
        )}
      </Card>

      {openFiche && <ListingModal listing={openFiche} onClose={() => setOpenFiche(null)} />}
    </div>
  );
}

function Kpi({ label, value, hint, cls }: { label: string; value: string; hint: string; cls: string }) {
  return (
    <div className="rounded-2xl glass p-4 sm:p-5">
      <div className="text-xs text-muted sm:text-sm">{label}</div>
      <div className={`text-glow mt-1.5 text-2xl font-bold sm:text-3xl ${cls}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="py-4 text-center text-sm text-muted">{empty ?? "Aucune donnée."}</p>;
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            {head.map((h, i) => (
              <th key={h} className={`py-2 font-medium ${i === 0 ? "px-5 sm:px-6" : "px-3 text-right"} ${i === head.length - 1 ? "pr-5 sm:pr-6" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {r.map((c, j) => (
                <td key={j} className={`py-2.5 ${j === 0 ? "px-5 sm:px-6" : "px-3 text-right"} ${j === r.length - 1 ? "pr-5 sm:pr-6" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
