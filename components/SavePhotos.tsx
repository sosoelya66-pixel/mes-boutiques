"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Enregistre toutes les photos d'une fiche dans la galerie en un seul toucher.
 * iPhone : feuille de partage → « Enregistrer N images » (dans l'ordre).
 * Ordinateur : téléchargement des fichiers.
 */
export function SavePhotos({ photos, titre, className = "" }: { photos: string[]; titre: string; className?: string }) {
  const files = useRef<File[] | null>(null);
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur" | "fait">("chargement");

  // Les photos sont téléchargées à l'avance : le partage doit partir tout de suite au toucher (exigence de l'iPhone)
  useEffect(() => {
    let annule = false;
    setEtat("chargement");
    (async () => {
      try {
        const list = await Promise.all(
          photos.map(async (url, i) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
            return new File([blob], `${String(i + 1).padStart(2, "0")}-${titre.slice(0, 30).replace(/[^\w-]+/g, "-")}.${ext}`, {
              type: blob.type || "image/jpeg",
            });
          })
        );
        if (!annule) {
          files.current = list;
          setEtat("pret");
        }
      } catch {
        if (!annule) setEtat("erreur");
      }
    })();
    return () => {
      annule = true;
    };
  }, [photos, titre]);

  async function enregistrer() {
    const list = files.current;
    if (!list?.length) return;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: list })) {
      try {
        await navigator.share({ files: list });
        setEtat("fait");
      } catch {
        // partage annulé : rien à faire
      }
      return;
    }
    // Ordinateur : téléchargement de chaque photo
    for (const f of list) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      await new Promise((r) => setTimeout(r, 250));
    }
    setEtat("fait");
  }

  if (!photos.length) return null;
  return (
    <button className={className || "btn"} onClick={enregistrer} disabled={etat === "chargement" || etat === "erreur"}>
      {etat === "chargement"
        ? "Préparation des photos…"
        : etat === "erreur"
          ? "Photos indisponibles"
          : etat === "fait"
            ? `✓ ${photos.length} photo${photos.length > 1 ? "s" : ""} enregistrée${photos.length > 1 ? "s" : ""}`
            : `📲 Enregistrer les ${photos.length} photo${photos.length > 1 ? "s" : ""}`}
    </button>
  );
}
