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
  // Plusieurs boutiques possibles : une fiche par boutique cochée
  const [choix, setChoix] = useState<string[]>(v.shop_id ? [v.shop_id] : []);
  const selection = shops.filter((s) => choix.includes(s.id));
  const avecStyle = (s: (typeof shops)[number]) => !!(s.avatar_url || s.style_avatar);
  const hasStyle = selection.some(avecStyle);
  const toggleShop = (id: string) => setChoix((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

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
    if (!selection.length) return setError("Coche au moins une boutique.");
    if (!v.lien.trim() && !produit.length) return setError("Colle un lien produit ou ajoute au moins une photo du produit.");
    setSending(true);
    try {
      const prixAchat = parseFloat(v.prix_achat.replace(",", "."));
      let premier = "";
      // Une fiche par boutique, chacune avec sa taille et sa carte d'identité
      for (const shop of selection) {
        const r = await post<{ id: string }>("/api/fiches/jobs", {
          shop_id: shop.id,
          lien: v.lien.trim() || undefined,
          produit,
          marque: v.marque,
          etat: v.etat,
          prix_achat: Number.isFinite(prixAchat) ? prixAchat : null,
          notes: [v.notes, selection.length > 1 ? "Rédige un titre et une description différents des autres boutiques (même produit publié sur plusieurs comptes)." : ""]
            .filter(Boolean)
            .join(" "),
          nb_photos: avecStyle(shop) ? nbPhotos : 0,
        });
        premier ||= r.id;
      }
      await refresh();
      onStarted(premier);
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
          <div className="label sm:col-span-2">
            Boutiques <span className="text-xs">· coche une ou plusieurs (une fiche par boutique)</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {shops.map((s) => {
                const on = choix.includes(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleShop(s.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on ? "pill-active text-white" : "border-line bg-card text-muted hover:text-white"
                    }`}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${on ? "border-white bg-white text-night" : "border-white/30"}`}>
                      {on ? "✓" : ""}
                    </span>
                    <span className="h-2 w-2 rounded-full" style={{ background: s.couleur }} />
                    {s.nom}
                    {s.taille && <span className="text-xs opacity-70">· {s.taille}</span>}
                  </button>
                );
              })}
              {shops.length > 2 && (
                <button type="button" onClick={() => setChoix(choix.length === shops.length ? [] : shops.map((s) => s.id))} className="px-2 text-xs text-revenue hover:underline">
                  {choix.length === shops.length ? "Tout décocher" : "Tout cocher"}
                </button>
              )}
            </div>
          </div>
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
                  {!selection.length
                    ? "Coche au moins une boutique."
                    : !hasStyle
                      ? "Carte d'identité sans avatar (Boutiques → Carte d'identité) : pas de photos portées."
                      : selection.map((s) => `${s.nom} : ${!avecStyle(s) ? "pas d'avatar, sans photos" : styleComplet(s) ? "avatar, fond et sol ✓" : `${stylePhotos(s)}/3 photos`}`).join(" · ")}
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
              {sending ? "Envoi…" : selection.length > 1 ? `✨ Créer ${selection.length} fiches` : "✨ Créer la fiche"}
            </button>
          </div>
        </div>
    </Modal>
  );
}
