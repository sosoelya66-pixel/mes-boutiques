const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const eur0 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const euros = (n: number) => eur.format(n);
export const eurosRond = (n: number) => eur0.format(n);
export const signe = (n: number) => (n >= 0 ? "+" : "−") + eur.format(Math.abs(n));

export const jourMois = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

export const dateLongue = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export const pourcent = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.abs(n)) + " %";
