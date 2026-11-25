"use client";
/* eslint-disable @next/next/no-img-element */

import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { photoPrompt } from "@/lib/prompt";
import type { Shop } from "@/lib/types";

/** Carte d'identité d'une boutique : tout ce qu'il faut pour des photos toujours cohérentes. */
export function ShopIdCard({ shop, onClose, onEdit }: { shop: Shop; onClose: () => void; onEdit: () => void }) {
  const prompt = photoPrompt(shop);
  const section = (label: string, text: string | null) => (
    <div className="border-b border-line py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        {text && <CopyButton text={text} />}
      </div>
      <div className="mt-1 text-sm">{text || <span className="text-alert">à définir</span>}</div>
    </div>
  );

  return (
    <Modal onClose={onClose} wide>
      {/* En-tête façon carte */}
      <div
        className="glow-corner -mx-6 -mt-6 rounded-t-2xl px-6 pb-5 pt-6"
        style={{ ["--glow" as string]: shop.couleur, background: `linear-gradient(135deg, ${shop.couleur}33, transparent 70%)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Carte d&apos;identité</div>
          <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-white" aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="mt-3 flex items-center gap-4">
          {shop.avatar_url ? (
            <img
              src={shop.avatar_url}
              alt={`Avatar de ${shop.nom}`}
              className="h-24 w-24 rounded-2xl object-cover ring-2"
              style={{ ["--tw-ring-color" as string]: shop.couleur }}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-line text-xs text-muted">
              pas d&apos;avatar
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-2xl font-bold">{shop.nom}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              <span>
                Taille <span className="text-white">{shop.taille || "—"}</span>
              </span>
              <span className="truncate">{shop.alias_email || "pas d'alias e-mail"}</span>
            </div>
            {shop.avatar_url && (
              <a href={shop.avatar_url} download target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-revenue hover:underline">
                ⬇ Ouvrir la photo de l&apos;avatar (à joindre dans ChatGPT)
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Prompt photo */}
      <div className="mt-5 rounded-xl border border-revenue/40 bg-revenue/[0.07] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Prompt photo {shop.prompt_photo ? "" : <span className="text-xs font-normal text-muted">(créé automatiquement)</span>}</div>
          <CopyButton text={prompt} label="📋 Copier le prompt photo" className="!rounded-xl !border-transparent !bg-white !px-3.5 !py-2 !text-sm !text-night" />
        </div>
        <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted">{prompt}</pre>
        <p className="mt-2 text-xs text-muted">
          Dans ChatGPT : joins la photo de l&apos;avatar et celle du produit, colle le prompt, et remplace la mention de l&apos;article si besoin. Depuis
          une fiche, le bouton « Prompt photo » insère l&apos;article tout seul.
        </p>
      </div>

      {/* Détails */}
      <div className="mt-4">
        {section("Avatar", shop.style_avatar)}
        {section("Décor", shop.style_fond)}
        {section("Sol", shop.style_sol)}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onEdit}>
          Modifier la carte
        </button>
      </div>
    </Modal>
  );
}
