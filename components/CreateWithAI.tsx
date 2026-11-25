"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { Modal, ModalTitle } from "@/components/ui/Modal";
import { createListing, updateListing, uploadPhoto } from "@/lib/data";

/* eslint-disable @next/next/no-img-element */

const ETATS = ["", "Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état", "Satisfaisant"];

type Step = { label: string; status: "wait" | "run" | "ok" | "error"; detail?: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json as T;
}

type Fiche = {
  titre: string;
  description: string;
  marque: string | null;
  categorie: string;
  couleur: string;
  matiere: string | null;
  etat: string;
  prix_conseille: number;
  prix_achat_trouve: number | null;
  conseil: string;
};

export function CreateWithAI({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { shops, shopId, refresh } = useAppState();
  const [v, setV] = useState({
    shop_id: shopId !== "all" ? shopId : shops[0]?.id ?? "",
    lien: "",
    prix_achat: "",
    marque: "",
    etat: "",
    notes: "",
  });
  const [produit, setProduit] = useState<string[]>([]);
  const [nbPhotos, setNbPhotos] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const shop = shops.find((s) => s.id === v.shop_id);
  const hasStyle = !!(shop?.avatar_url || shop?.style_avatar);
  const running = steps?.some((s) => s.status === "run");

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
    const wantPhotos = hasStyle && nbPhotos > 0;
    const list: Step[] = [
      { label: "Claude lit le produit et rédige la fiche", status: "run" },
      ...(wantPhotos ? Array.from({ length: nbPhotos }, (_, i) => ({ label: `Photo portée ${i + 1}/${nbPhotos}`, status: "wait" as const })) : []),
    ];
    setSteps([...list]);
    const set = (i: number, s: Partial<Step>) => {
      list[i] = { ...list[i], ...s };
      setSteps([...list]);
    };

    // 1. Texte
    let ficheId: string;
    let refImages = produit;
    try {
      const prixAchat = parseFloat(v.prix_achat.replace(",", "."));
      const r = await post<{ fiche: Fiche; page_lue: boolean; photo_fournisseur: string | null }>("/api/fiches/generer", {
        shop_id: v.shop_id,
        lien: v.lien.trim() || undefined,
        photos: produit,
        marque: v.marque,
        etat: v.etat,
        prix_achat: Number.isFinite(prixAchat) ? prixAchat : null,
        notes: v.notes,
      });
      const f = r.fiche;
      if (!refImages.length && r.photo_fournisseur) refImages = [r.photo_fournisseur];
      const created = await createListing({
        shop_id: v.shop_id,
        photos: produit,
        titre: f.titre,
        description: f.description,
        marque: f.marque,
        categorie: f.categorie,
        couleur: f.couleur,
        matiere: f.matiere,
        etat: f.etat,
        prix: f.prix_conseille,
        prix_achat: Number.isFinite(prixAchat) ? prixAchat : f.prix_achat_trouve ?? 0,
        liens_produit: v.lien.trim() ? [v.lien.trim()] : [],
        vinted_url: null,
        notes: `💡 ${f.conseil}`,
        statut: "brouillon",
      });
      ficheId = created.id;
      set(0, { status: "ok", detail: r.page_lue ? "page produit lue ✓" : v.lien ? "page produit illisible : fiche faite d'après les photos" : undefined });
    } catch (e) {
      set(0, { status: "error", detail: (e as Error).message });
      return;
    }

    // 2. Photos portées, une par une ; la première devient la photo principale
    const worn: string[] = [];
    for (let i = 0; i < (wantPhotos ? nbPhotos : 0); i++) {
      set(i + 1, { status: "run" });
      if (!refImages.length) {
        set(i + 1, { status: "error", detail: "Aucune photo du produit : ajoute-en une pour générer les photos portées." });
        continue;
      }
      try {
        const r = await post<{ url: string }>("/api/fiches/photo", { shop_id: v.shop_id, produit: refImages, pose: i, article: v.lien });
        worn.push(r.url);
        await updateListing(ficheId, { photos: [...worn, ...produit] });
        set(i + 1, { status: "ok" });
      } catch (e) {
        set(i + 1, { status: "error", detail: (e as Error).message });
      }
    }

    await refresh();
    // Tout s'est bien passé : on ouvre directement la fiche ; sinon on laisse voir les erreurs
    if (list.every((s) => s.status === "ok")) onCreated(ficheId);
    else setDoneId(ficheId);
  }

  const field = (k: keyof typeof v, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="label">
      {label}
      <input className="input mt-1.5" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...extra} />
    </label>
  );

  return (
    <Modal onClose={running ? () => {} : onClose} wide>
      <ModalTitle onClose={running ? () => {} : onClose}>✨ Créer une fiche avec Claude</ModalTitle>

      {steps ? (
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 w-5 text-center">
                {s.status === "ok" ? "✅" : s.status === "error" ? "⚠️" : s.status === "run" ? <span className="inline-block animate-spin">⟳</span> : "·"}
              </span>
              <div>
                <div className={s.status === "wait" ? "text-muted" : ""}>{s.label}</div>
                {s.detail && <div className={`text-xs ${s.status === "error" ? "text-alert" : "text-muted"}`}>{s.detail}</div>}
              </div>
            </div>
          ))}
          {running && <p className="pt-2 text-xs text-muted">Une photo prend environ 30 secondes à 1 minute. Garde cette page ouverte.</p>}
          {!running && (
            <div className="flex justify-end gap-2 pt-3">
              <button className="btn" onClick={onClose}>
                Fermer
              </button>
              {doneId && (
                <button className="btn-primary" onClick={() => onCreated(doneId)}>
                  Ouvrir la fiche
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
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
                  <img src={p} alt="" className="h-20 w-20 rounded-lg object-cover" />
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
                  {hasStyle
                    ? "Générées avec l'avatar, le fond et le sol de la boutique."
                    : "Style photo de la boutique non défini (Boutiques → Modifier) : pas de photos portées."}
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

          {error && <p className="text-sm text-alert sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button className="btn" onClick={onClose}>
              Annuler
            </button>
            <button className="btn-primary" onClick={run} disabled={uploading}>
              ✨ Créer la fiche
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
