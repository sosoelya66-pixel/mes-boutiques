"use client";

import { useState } from "react";
import { bordereauLink } from "@/lib/data";

export function BordereauButton({ value, className = "btn" }: { value: string | null; className?: string }) {
  const [busy, setBusy] = useState(false);
  if (!value)
    return (
      <button disabled className={className} title="Aucun bordereau pour cette vente">
        Bordereau
      </button>
    );
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation();
        // On ouvre l'onglet tout de suite (sinon le téléphone bloque la fenêtre)
        const w = window.open("", "_blank");
        setBusy(true);
        try {
          const url = await bordereauLink(value);
          if (w) w.location.href = url;
          else window.location.href = url;
        } catch (err) {
          w?.close();
          alert("Impossible d'ouvrir le bordereau : " + (err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      Bordereau
    </button>
  );
}
