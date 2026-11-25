// Prévision de fin de mois : rythme des 14 derniers jours × jours restants + déjà réalisé.
// Avec plus de 30 jours d'historique, chaque jour restant est pondéré par son jour de la semaine.
import { benefice, type Listing, type Sale } from "./types";

const DAY = 86400000;
type Metric = "benefice" | "ca" | "commandes";
const value = (s: Sale, m: Metric) => (m === "benefice" ? benefice(s) : m === "ca" ? s.prix : 1);
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export type MetricForecast = {
  realise: number; // déjà fait ce mois-ci
  prevu: number; // total prévu en fin de mois
  bas: number; // fourchette basse
  haut: number; // fourchette haute
};

export type Forecast = {
  mois: string; // « novembre »
  joursRestants: number;
  pondere: boolean; // pondération par jour de la semaine utilisée ?
  benefice: MetricForecast;
  ca: MetricForecast;
  commandes: MetricForecast;
  /** Courbe du bénéfice cumulé : réel jusqu'à aujourd'hui, puis projection */
  courbe: { jour: number; reel: number | null; projection: number | null }[];
};

/** Somme par jour (clé = début du jour en ms) */
function dailySums(sales: Sale[], m: Metric, from: number, to: number) {
  const map = new Map<number, number>();
  for (const s of sales) {
    const t = new Date(s.date_vente).getTime();
    if (t < from || t >= to) continue;
    const k = sod(new Date(t)).getTime();
    map.set(k, (map.get(k) ?? 0) + value(s, m));
  }
  return map;
}

export function forecastMonth(sales: Sale[], now = new Date()): Forecast {
  const today = sod(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / DAY);
  // Jours restants : aujourd'hui compte pour la part de journée restante
  const dayFraction = (now.getTime() - today.getTime()) / DAY;
  const remainingDays: { date: Date; part: number }[] = [{ date: today, part: 1 - dayFraction }];
  for (let d = new Date(today.getTime() + DAY); d < monthEnd; d = new Date(d.getTime() + DAY)) remainingDays.push({ date: d, part: 1 });

  const first = sales.reduce((min, s) => Math.min(min, new Date(s.date_vente).getTime()), now.getTime());
  const historyDays = (now.getTime() - first) / DAY;
  const pondere = historyDays > 30;

  const compute = (m: Metric): MetricForecast & { perDay: (d: Date) => number } => {
    const realise = sales
      .filter((s) => {
        const t = new Date(s.date_vente).getTime();
        return t >= monthStart.getTime() && t <= now.getTime();
      })
      .reduce((a, s) => a + value(s, m), 0);

    // Rythme des 14 derniers jours (jusqu'à maintenant)
    const from14 = now.getTime() - 14 * DAY;
    const d14 = dailySums(sales, m, from14, now.getTime() + 1);
    const daily14: number[] = [];
    for (let i = 13; i >= 0; i--) daily14.push(d14.get(sod(new Date(now.getTime() - i * DAY)).getTime()) ?? 0);
    const rate = daily14.reduce((a, b) => a + b, 0) / 14;

    // Pondération par jour de la semaine (historique jusqu'à 90 jours)
    let factor = (_d: Date) => 1;
    if (pondere) {
      const from = now.getTime() - 90 * DAY;
      const dd = dailySums(sales, m, from, now.getTime() + 1);
      const sums = Array(7).fill(0);
      const counts = Array(7).fill(0);
      for (let t = sod(new Date(from)).getTime(); t <= today.getTime(); t += DAY) {
        const w = new Date(t).getDay();
        sums[w] += dd.get(t) ?? 0;
        counts[w]++;
      }
      const avgW = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
      const mean = avgW.reduce((a, b) => a + b, 0) / 7;
      if (mean > 0) factor = (d: Date) => avgW[d.getDay()] / mean;
    }
    const perDay = (d: Date) => rate * factor(d);
    const reste = remainingDays.reduce((a, r) => a + perDay(r.date) * r.part, 0);

    // Fourchette : variabilité des 14 derniers jours (± 1 écart-type sur la période restante)
    const variance = daily14.reduce((a, x) => a + (x - rate) ** 2, 0) / 14;
    const n = remainingDays.reduce((a, r) => a + r.part, 0);
    const spread = Math.sqrt(variance) * Math.sqrt(n);
    const prevu = realise + reste;
    return { realise, prevu, bas: realise + Math.max(0, reste - spread), haut: prevu + spread, perDay };
  };

  const b = compute("benefice");
  const ca = compute("ca");
  const cmd = compute("commandes");

  // Courbe du bénéfice cumulé
  const courbe: Forecast["courbe"] = [];
  let cumul = 0;
  let proj = 0;
  const byDay = dailySums(sales, "benefice", monthStart.getTime(), now.getTime() + 1);
  for (let i = 0; i < daysInMonth; i++) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
    const t = d.getTime();
    if (t < today.getTime()) {
      cumul += byDay.get(t) ?? 0;
      courbe.push({ jour: i + 1, reel: round(cumul), projection: null });
    } else if (t === today.getTime()) {
      cumul += byDay.get(t) ?? 0;
      proj = cumul + b.perDay(d) * (1 - dayFraction);
      courbe.push({ jour: i + 1, reel: round(cumul), projection: round(cumul) });
    } else {
      proj += b.perDay(d);
      courbe.push({ jour: i + 1, reel: null, projection: round(proj) });
    }
  }
  if (courbe.length) courbe[courbe.length - 1].projection = round(b.prevu);

  const strip = ({ realise, prevu, bas, haut }: MetricForecast) => ({ realise, prevu, bas, haut });
  return {
    mois: now.toLocaleDateString("fr-FR", { month: "long" }),
    joursRestants: Math.ceil(remainingDays.reduce((a, r) => a + r.part, 0)),
    pondere,
    benefice: strip(b),
    ca: strip(ca),
    commandes: strip(cmd),
    courbe,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

export type ShopRates = {
  ventes: number; // ventes sur 60 jours
  beneficeMoyen: number | null; // bénéfice moyen par vente
  tauxVente: number | null; // part des fiches créées qui se sont vendues (60 jours)
};

/** Bénéfice moyen par vente et taux de vente des fiches, sur 60 jours. */
export function shopRates(sales: Sale[], listings: Listing[], now = new Date()): ShopRates {
  const from = now.getTime() - 60 * DAY;
  const s = sales.filter((x) => new Date(x.date_vente).getTime() >= from);
  const l = listings.filter((x) => new Date(x.created_at).getTime() >= from);
  return {
    ventes: s.length,
    beneficeMoyen: s.length ? s.reduce((a, x) => a + benefice(x), 0) / s.length : null,
    tauxVente: l.length >= 5 ? l.filter((x) => x.statut === "vendu").length / l.length : null,
  };
}
