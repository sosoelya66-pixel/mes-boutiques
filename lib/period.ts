// Périodes du tableau de bord et « période d'avant, même heure ».

export type PeriodKey = "today" | "yesterday" | "7d" | "30d" | "month" | "lastMonth";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "yesterday", label: "Hier" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "month", label: "Ce mois" },
  { key: "lastMonth", label: "Mois dernier" },
];

export type Range = { start: Date; end: Date };
export type Period = {
  key: PeriodKey;
  current: Range;
  previous: Range;
  /** true pour Aujourd'hui / Hier : les graphiques passent à l'heure */
  hourly: boolean;
};

const sod = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** Même jour/heure le mois précédent (borné au dernier jour du mois). */
const sameMomentPrevMonth = (d: Date) => {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() - 1);
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, last));
  return x;
};
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export function getPeriod(key: PeriodKey, now = new Date()): Period {
  const today = sod(now);
  switch (key) {
    case "today":
      return {
        key,
        hourly: true,
        current: { start: today, end: now },
        previous: { start: addDays(today, -1), end: addDays(now, -1) },
      };
    case "yesterday":
      return {
        key,
        hourly: true,
        current: { start: addDays(today, -1), end: today },
        previous: { start: addDays(today, -2), end: addDays(today, -1) },
      };
    case "7d":
    case "30d": {
      const n = key === "7d" ? 7 : 30;
      const start = addDays(today, -(n - 1));
      return {
        key,
        hourly: false,
        current: { start, end: now },
        previous: { start: addDays(start, -n), end: addDays(now, -n) },
      };
    }
    case "month": {
      const start = firstOfMonth(now);
      return {
        key,
        hourly: false,
        current: { start, end: now },
        previous: { start: firstOfMonth(sameMomentPrevMonth(now)), end: sameMomentPrevMonth(now) },
      };
    }
    case "lastMonth": {
      const end = firstOfMonth(now);
      const start = firstOfMonth(sameMomentPrevMonth(now));
      return {
        key,
        hourly: false,
        current: { start, end },
        previous: { start: firstOfMonth(sameMomentPrevMonth(start)), end: start },
      };
    }
  }
}

export const inRange = (iso: string, r: Range) => {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
};

/** Découpe la période en jours (ou en heures pour Aujourd'hui / Hier). */
export function buckets(p: Period): Date[] {
  const out: Date[] = [];
  if (p.hourly) {
    const lastHour = p.key === "today" ? p.current.end.getHours() : 23;
    for (let h = 0; h <= lastHour; h++) {
      const d = new Date(p.current.start);
      d.setHours(h);
      out.push(d);
    }
  } else {
    for (let d = sod(p.current.start); d < p.current.end; d = addDays(d, 1)) out.push(d);
  }
  return out;
}
