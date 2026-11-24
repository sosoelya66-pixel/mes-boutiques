import { benefice, type Sale, type Shop } from "./types";

export type MonthRow = {
  key: string; // "2026-11"
  label: string; // "novembre 2026"
  ventes: number;
  ca: number;
  achats: number;
  frais: number;
  benefice: number;
};

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const monthLabel = (key: string) =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

/** Lignes mois par mois, du plus récent au plus ancien (12 mois minimum). */
export function monthlyRows(sales: Sale[], now = new Date()): MonthRow[] {
  let first = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  for (const s of sales) {
    const d = new Date(s.date_vente);
    if (d < first) first = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const rows = new Map<string, MonthRow>();
  for (let d = new Date(first); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const key = keyOf(d);
    rows.set(key, { key, label: monthLabel(key), ventes: 0, ca: 0, achats: 0, frais: 0, benefice: 0 });
  }
  for (const s of sales) {
    const r = rows.get(keyOf(new Date(s.date_vente)));
    if (!r) continue;
    r.ventes += 1;
    r.ca += s.prix;
    r.achats += s.prix_achat;
    r.frais += s.frais;
    r.benefice += benefice(s);
  }
  return [...rows.values()].reverse();
}

export function sumRows(rows: MonthRow[]) {
  return rows.reduce(
    (a, r) => ({
      ventes: a.ventes + r.ventes,
      ca: a.ca + r.ca,
      achats: a.achats + r.achats,
      frais: a.frais + r.frais,
      benefice: a.benefice + r.benefice,
    }),
    { ventes: 0, ca: 0, achats: 0, frais: 0, benefice: 0 }
  );
}

const n2 = (n: number) => n.toFixed(2).replace(".", ",");

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** CSV lisible par Excel en français (séparateur « ; », virgule décimale). */
export function exportCsv(rows: MonthRow[], suffix: string) {
  const lines = [
    "Mois;Ventes;Chiffre d'affaires;Achats;Frais;Bénéfice",
    ...rows.map((r) => [r.label, r.ventes, n2(r.ca), n2(r.achats), n2(r.frais), n2(r.benefice)].join(";")),
  ];
  const t = sumRows(rows);
  lines.push(["Total", t.ventes, n2(t.ca), n2(t.achats), n2(t.frais), n2(t.benefice)].join(";"));
  download(`compta-${suffix}.csv`, new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
}

/** PDF du mois : la liste des ventes et les totaux. */
export async function exportMonthPdf(monthKey: string, sales: Sale[], shops: Shop[], scope: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const list = sales
    .filter((s) => keyOf(new Date(s.date_vente)) === monthKey)
    .sort((a, b) => a.date_vente.localeCompare(b.date_vente));
  const eur = (n: number) => n2(n) + " EUR";
  const shopName = (id: string) => shops.find((s) => s.id === id)?.nom ?? "";

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Compta - ${monthLabel(monthKey)}`, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${scope} · édité le ${new Date().toLocaleDateString("fr-FR")}`, 14, 25);

  const t = list.reduce(
    (a, s) => ({ ca: a.ca + s.prix, achats: a.achats + s.prix_achat, frais: a.frais + s.frais }),
    { ca: 0, achats: 0, frais: 0 }
  );
  autoTable(doc, {
    startY: 32,
    head: [["Date", "Article", "Boutique", "Prix", "Achat", "Frais", "Bénéfice"]],
    body: list.map((s) => [
      new Date(s.date_vente).toLocaleDateString("fr-FR"),
      s.titre.slice(0, 40),
      shopName(s.shop_id),
      eur(s.prix),
      eur(s.prix_achat),
      eur(s.frais),
      eur(benefice(s)),
    ]),
    foot: [[`${list.length} ventes`, "", "", eur(t.ca), eur(t.achats), eur(t.frais), eur(t.ca - t.achats - t.frais)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 26, 43] },
    footStyles: { fillColor: [240, 240, 245], textColor: 20, fontStyle: "bold" },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
  });
  doc.save(`compta-${monthKey}.pdf`);
}
