import { benefice, type Listing, type Sale, type Shop } from "./types";
import { buckets, inRange, type Period, type Range } from "./period";

export type Totals = {
  benefice: number;
  ca: number;
  achats: number;
  frais: number;
  commandes: number;
  panierMoyen: number;
};

export function totals(sales: Sale[], r: Range): Totals {
  const list = sales.filter((s) => inRange(s.date_vente, r));
  const ca = list.reduce((a, s) => a + s.prix, 0);
  const achats = list.reduce((a, s) => a + s.prix_achat, 0);
  const frais = list.reduce((a, s) => a + s.frais, 0);
  return {
    benefice: ca - achats - frais,
    ca,
    achats,
    frais,
    commandes: list.length,
    panierMoyen: list.length ? ca / list.length : 0,
  };
}

/** Évolution en % ; null si la période d'avant est vide. */
export const evolution = (cur: number, prev: number) =>
  prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / Math.abs(prev)) * 100;

export type Point = {
  t: number; // timestamp du début du jour / de l'heure
  benefice: number;
  ca: number;
  commandes: number;
  fiches: number;
};

export function series(sales: Sale[], listings: Listing[], p: Period): Point[] {
  const bs = buckets(p);
  const key = (iso: string) => {
    const d = new Date(iso);
    if (p.hourly) d.setMinutes(0, 0, 0);
    else d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const map = new Map<number, Point>(
    bs.map((b) => [b.getTime(), { t: b.getTime(), benefice: 0, ca: 0, commandes: 0, fiches: 0 }])
  );
  for (const s of sales) {
    if (!inRange(s.date_vente, p.current)) continue;
    const pt = map.get(key(s.date_vente));
    if (!pt) continue;
    pt.benefice += benefice(s);
    pt.ca += s.prix;
    pt.commandes += 1;
  }
  for (const l of listings) {
    if (!inRange(l.created_at, p.current)) continue;
    const pt = map.get(key(l.created_at));
    if (pt) pt.fiches += 1;
  }
  return [...map.values()].map((pt) => ({
    ...pt,
    benefice: Math.round(pt.benefice * 100) / 100,
    ca: Math.round(pt.ca * 100) / 100,
  }));
}

export function ranking(sales: Sale[], shops: Shop[], r: Range) {
  return shops
    .map((shop) => ({
      shop,
      ca: sales
        .filter((s) => s.shop_id === shop.id && inRange(s.date_vente, r))
        .reduce((a, s) => a + s.prix, 0),
    }))
    .sort((a, b) => b.ca - a.ca);
}
