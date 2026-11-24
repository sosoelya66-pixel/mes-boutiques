import type { ListingStatus } from "@/lib/types";

const STYLES: Record<ListingStatus, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-white/10 text-muted" },
  en_ligne: { label: "En ligne", cls: "bg-orders/15 text-orders" },
  vendu: { label: "Vendu", cls: "bg-profit/15 text-profit" },
};

export function ListingBadge({ statut }: { statut: ListingStatus }) {
  const s = STYLES[statut];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
