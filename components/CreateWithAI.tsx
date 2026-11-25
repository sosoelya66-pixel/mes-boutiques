"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { Modal, ModalTitle } from "@/components/ui/Modal";
import { uploadPhoto } from "@/lib/data";
import { styleComplet, stylePhotos } from "@/lib/types";

/* eslint-disable @next/next/no-img-element */

const ETATS = ["", "Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état", "Satisfaisant"];

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json as T;
}

export function CreateWithAI({
  onClose,
  onStarted,
  initial,
}: {
  onClose: () => void;
  onStarted: (id: string) => void;
  /** Pré-remplissage (ex. depuis le Radar) */
  initial?: { shop_id?: string | null; lien?: string; prix_achat?: number; photo?: string | null; notes?: string };
}) {
  const { shops, shopId, refresh } = useAppState();
  const [v, setV] = useState({
    shop_id: initial?.shop_id ?? (shopId !== "all" ? shopId : shops[0]?.id ?? ""),
    lien: initial?.lien ?? "",
    prix_achat: initial?.prix_achat != null ? String(initial.prix_achat) : "",
    marque: "",
    etat: initial ? "Neuf sans étiquette" : "",
    notes: initial?.notes ?? "",
  });
  const [produit, setProduit] = useState<string[]>(initial?.photo ? [initial.photo] : []);
  const [nbPhotos, setNbPhotos] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shop = shops.find((s) => s.id === v.shop_id);
  const hasStyle = !!(shop?.avatar_url || shop?.style_avatar);

  async function addProductPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadPhoto(f));
      setProduit((p) => [...p, ...urls].slice(0, 6));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function run() {
    setError(null);
    if (!v.shop_id) return setError("Choisis une boutique.");
    if (!v.lien.trim() && !produit.length) return setError("Colle un lien produit ou ajoute au moins une photo du produit.");
    setSending(true);
    try {
      const prixAchat = parseFloat(v.prix_achat.replace(",", "."));
      const r = await post<{ id: string }>("/api/fiches/jobs", {
        shop_id: v.shop_id,
        lien: v.lien.trim() || undefined,
        produit,
        marque: v.marque,
        etat: v.etat,
        prix_achat: Number.isFinite(prixAchat) ? prixAchat : null,
        notes: v.notes,
        nb_photos: hasStyle ? nbPhotos : 0,
      });
      await refresh();
      onStarted(r.id);
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  }

  const field = (k: keyof typeof v, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="label">
      {label}
      <input className="input mt-1.5" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...extra} />
    </label>
  );

  return (
    <Modal onClose={onClose} wide>
      <ModalTitle onClose={onClose}>✨ Créer une fiche avec Claude</ModalTitle>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Boutique {shop?.taille && <span className="text-xs">· taille {shop.taille}</span>}
            <select className="input mt-1.5" value={v.shop_id} onChange={(e) => setV({ ...v, shop_id: e.target.value })}>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </label>
          {field("prix_achat", "Prix d'achat (€, facultatif)", { inputMode: "decimal" })}
          <label className="label sm:col-span-2">
            Lien produit
            <input
              className="input mt-1.5"
              value={v.lien}
              onChange={(e) => setV({ ...v, lien: e.target.value })}
              placeholder="https://fr.aliexpress.com/item/…"
            />
          </label>

          <div className="sm:col-span-2">
            <div className="label">Photos du produit (conseillé : 1 à 3 photos nettes de l&apos;article seul)</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {produit.map((p, i) => (
                <div key={p} className="relative">
                  <img loading="lazy" decoding="async" src={p} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setProduit(produit.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-night text-xs text-muted ring-1 ring-line"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-center text-xs text-muted hover:text-white">
                {uploading ? "Envoi…" : "+ Photos"}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => addProductPhotos(e.target.files)} />
              </label>
            </div>
          </div>

          {field("marque", "Marque (facultatif)")}
          <label className="label">
            État (facultatif)
            <select className="input mt-1.5" value={v.etat} onChange={(e) => setV({ ...v, etat: e.target.value })}>
              {ETATS.map((e) => (
                <option key={e} value={e}>
                  {e || "— Laisser Claude choisir —"}
                </option>
              ))}
            </select>
          </label>
          <label className="label sm:col-span-2">
            Notes pour Claude (facultatif)
            <input
              className="input mt-1.5"
              value={v.notes}
              onChange={(e) => setV({ ...v, notes: e.target.value })}
              placeholder="ex. taille un peu grand, coupe oversize, porté une fois…"
            />
          </label>

          <div className="rounded-xl border border-line p-4 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Photos portées</div>
                <div className="text-xs text-muted">
                  {!hasStyle
                    ? "Carte d'identité de la boutique sans avatar (Boutiques → Carte d'identité) : pas de photos portées."
                    : shop && styleComplet(shop)
                      ? "Générées avec l'avatar, le fond et le sol de la carte d'identité."
                      : `Carte d'identité incomplète (${shop ? stylePhotos(shop) : 0}/3 photos) : ajoute le fond et le sol pour des photos plus cohérentes.`}
                </div>
              </div>
              <select
                className="input w-auto"
                value={hasStyle ? nbPhotos : 0}
                disabled={!hasStyle}
                onChange={(e) => setNbPhotos(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "Aucune" : `${n} photo${n > 1 ? "s" : ""}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-muted sm:col-span-2">
            La fiche se prépare en arrière-plan : tu peux fermer l&apos;appli, tu recevras une notification quand elle sera prête.
          </p>
          {error && <p className="text-sm text-alert sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button className="btn" onClick={onClose}>
              Annuler
            </button>
            <button className="btn-primary" onClick={run} disabled={uploading || sending}>
              {sending ? "Envoi…" : "✨ Créer la fiche"}
            </button>
          </div>
        </div>
    </Modal>
  );
}
