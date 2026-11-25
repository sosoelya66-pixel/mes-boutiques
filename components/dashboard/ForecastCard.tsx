"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppState } from "@/components/AppState";
import { euros, eurosRond } from "@/lib/format";
import { forecastMonth, shopRates } from "@/lib/forecast";

const MIN_VENTES = 5; // en dessous, pas de phrase d'action chiffrée

export function ForecastCard() {
  const { sales, allSales, allListings, shops, shopId, objectifGlobal, shopById, loadedAt } = useAppState();
  const now = loadedAt ?? new Date();

  const f = useMemo(() => forecastMonth(sales, now), [sales, now]);
  const shop = shopId !== "all" ? shopById(shopId) : undefined;
  const goal = shop ? shop.objectif_mensuel ?? null : objectifGlobal;
  const pct = goal ? Math.min(100, (f.benefice.realise / goal) * 100) : 0;
  const pctPrevu = goal ? Math.min(100, (f.benefice.prevu / goal) * 100) : 0;

  // Phrase d'action : combien de ventes / fiches pour combler l'écart
  const action = useMemo(() => {
    if (!goal) return null;
    const manque = goal - f.benefice.prevu;
    if (manque <= 0) return { ok: true, text: `Objectif en vue : environ ${eurosRond(-manque)} d'avance à ce rythme. Continue comme ça !` };
    // Boutique où une fiche rapporte le plus (bénéfice moyen × taux de vente)
    const candidates = (shop ? [shop] : shops)
      .map((s) => {
        const r = shopRates(
          allSales.filter((x) => x.shop_id === s.id),
          allListings.filter((x) => x.shop_id === s.id),
          now
        );
        return { s, r, parFiche: r.beneficeMoyen && r.tauxVente ? r.beneficeMoyen * r.tauxVente : 0 };
      })
      .filter((c) => c.r.ventes >= MIN_VENTES && c.r.beneficeMoyen && c.r.beneficeMoyen > 0)
      .sort((a, b) => b.parFiche - a.parFiche);
    const best = candidates[0];
    if (!best)
      return { ok: false, text: `Il te manque ~${eurosRond(manque)}. Pas encore assez de ventes (${MIN_VENTES} minimum par boutique) pour estimer le nombre de fiches à créer.` };
    const ventes = Math.ceil(manque / best.r.beneficeMoyen!);
    const fiches = best.r.tauxVente ? Math.ceil(ventes / best.r.tauxVente) : null;
    return {
      ok: false,
      text:
        `Il te manque ~${eurosRond(manque)} → environ ${ventes} vente${ventes > 1 ? "s" : ""}` +
        (fiches ? `, soit ~${fiches} fiche${fiches > 1 ? "s" : ""} de plus sur ${best.s.nom}` : ` sur ${best.s.nom}`) +
        ".",
    };
  }, [goal, f, shop, shops, allSales, allListings, now]);

  const mois = f.mois;
  return (
    <section className="rise glass glow-corner rounded-2xl p-5 sm:p-6" style={{ ["--glow" as string]: "#4fd18b" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Prévision du mois{shop ? ` · ${shop.nom}` : ""}</h2>
        <span className="text-xs text-muted">
          {f.pondere ? "pondérée par jour de la semaine" : "rythme des 14 derniers jours"} · mis à jour à{" "}
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-lg leading-snug">
            À ce rythme :{" "}
            <span className="text-glow text-[28px] font-bold text-profit sm:text-[32px]">{eurosRond(f.benefice.prevu)}</span> de bénéfice fin {mois}
          </p>
          <p className="mt-1 text-sm text-muted">
            fourchette {eurosRond(f.benefice.bas)} – {eurosRond(f.benefice.haut)} · déjà réalisé{" "}
            <span className="text-white">{euros(f.benefice.realise)}</span> · {f.joursRestants} jour{f.joursRestants > 1 ? "s" : ""} restant
            {f.joursRestants > 1 ? "s" : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span>
              CA prévu <span className="font-semibold text-revenue">{eurosRond(f.ca.prevu)}</span>
            </span>
            <span>
              Commandes prévues <span className="font-semibold text-orders">{Math.round(f.commandes.prevu)}</span>
            </span>
          </div>

          {/* Objectif */}
          {goal ? (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted">
                <span>
                  Objectif {euros(goal)} · {Math.round(pct)} % atteint
                </span>
                <span>prévu {Math.round((f.benefice.prevu / goal) * 100)} %</span>
              </div>
              <div className="relative mt-1.5 h-2.5 rounded-full bg-line">
                <div className="absolute inset-y-0 left-0 rounded-full bg-profit/25" style={{ width: `${pctPrevu}%` }} />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4d8af0,#4fd18b)", boxShadow: "0 0 12px rgba(79,209,139,.6)" }}
                />
              </div>
              {action && <p className={`mt-3 text-sm ${action.ok ? "text-profit" : "text-white"}`}>👉 {action.text}</p>}
            </div>
          ) : (
            <Link href="/boutiques#objectifs" className="mt-4 inline-block text-sm text-revenue hover:underline">
              Fixer un objectif {shop ? `pour ${shop.nom}` : "mensuel"} →
            </Link>
          )}
        </div>

        {/* Courbe réelle + projection */}
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={f.courbe} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="fc-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4fd18b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4fd18b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="jour" tick={{ fill: "#9a9cb0", fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tickFormatter={(v) => eurosRond(v)} tick={{ fill: "#9a9cb0", fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
              {goal ? <ReferenceLine y={goal} stroke="#9a9cb0" strokeDasharray="3 4" strokeOpacity={0.6} /> : null}
              <Tooltip
                cursor={{ stroke: "#9a9cb0", strokeOpacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { jour: number; reel: number | null; projection: number | null };
                  return (
                    <div className="rounded-xl border border-line bg-night/95 px-3 py-2 text-sm">
                      <div className="text-muted">
                        {p.jour} {mois}
                      </div>
                      {p.reel != null && <div className="text-profit">Réel : {euros(p.reel)}</div>}
                      {p.projection != null && p.reel == null && <div className="text-muted">Prévu : {euros(p.projection)}</div>}
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="reel" stroke="#4fd18b" strokeWidth={2.5} fill="url(#fc-fill)" isAnimationActive={false} connectNulls={false} />
              <Line type="monotone" dataKey="projection" stroke="#4fd18b" strokeWidth={2} strokeDasharray="5 5" strokeOpacity={0.8} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
