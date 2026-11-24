import type { SaleStatus } from "@/lib/types";

const STYLES: Record<SaleStatus, { label: string; cls: string }> = {
  a_envoyer: { label: "À envoyer", cls: "bg-alert/15 text-alert" },
  envoye: { label: "Envoyé", cls: "bg-orders/15 text-orders" },
  termine: { label: "Terminé", cls: "bg-profit/15 text-profit" },
};

export function StatusBadge({ statut }: { statut: SaleStatus }) {
  const s = STYLES[statut];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
