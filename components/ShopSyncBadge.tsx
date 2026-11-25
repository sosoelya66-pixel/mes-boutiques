"use client";

import type { Shop } from "@/lib/types";

/** Statut de synchro d'une boutique : reconnue (un e-mail Vinted lui a été attribué) ou en attente. */
export function ShopSyncBadge({ shop, last }: { shop: Shop; last: string | undefined }) {
  if (last)
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-profit/30 bg-profit/[0.07] px-3 py-2 text-sm">
        <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-profit opacity-60 shadow-[0_0_8px_#4fd18b]" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
        </span>
        <span>
          <span className="font-medium text-profit">Synchronisée</span>
          <span className="block text-xs text-muted">
            Dernier e-mail reconnu le {new Date(last).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </span>
      </div>
    );
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-alert/40 bg-alert/[0.07] px-3 py-2 text-sm">
      <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-alert" />
      </span>
      <span>
        <span className="font-medium text-alert">Pas encore synchronisée</span>
        <span className="block text-xs text-muted">
          {shop.alias_email
            ? "En attente d'un premier e-mail Vinted. Pour tester : demande un code de vérification dans l'app Vinted de cette boutique, puis touche « Synchroniser »."
            : "Ajoute l'alias e-mail de la boutique (Modifier) pour que ses e-mails soient reconnus."}
        </span>
      </span>
    </div>
  );
}
