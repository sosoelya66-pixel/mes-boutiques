import type { Sale } from "@/lib/types";

/** Petit repère quand le prix n'est pas sûr. */
export function PriceBadge({ sale }: { sale: Pick<Sale, "prix_source"> }) {
  if (sale.prix_source === "aucun")
    return (
      <span className="rounded-full bg-alert/15 px-2 py-0.5 text-[11px] font-medium text-alert" title="Prix absent de l'e-mail : à saisir">
        prix à compléter
      </span>
    );
  if (sale.prix_source === "fiche")
    return (
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-muted" title="Prix repris de la fiche, en attente de l'e-mail de paiement">
        provisoire
      </span>
    );
  return null;
}
