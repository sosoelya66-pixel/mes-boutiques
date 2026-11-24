"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { Modal, ModalTitle } from "@/components/ui/Modal";
import { Thumb } from "@/components/ui/Thumb";
import { createSale, deleteSale, updateSale, uploadBordereau, uploadPhoto } from "@/lib/data";
import { STATUTS, type Sale, type SaleStatus } from "@/lib/types";

/** Pour un <input type="datetime-local"> en heure locale */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function SaleForm({ sale, onClose }: { sale?: Sale; onClose: () => void }) {
  const { shops, shopId, listings, refresh, allShops } = useAppState();
  const defaultShop = sale?.shop_id ?? (shopId !== "all" ? shopId : shops[0]?.id ?? "");
  const [v, setV] = useState({
    shop_id: defaultShop,
    listing_id: sale?.listing_id ?? "",
    titre: sale?.titre ?? "",
    photo_url: sale?.photo_url ?? "",
    prix: String(sale?.prix ?? ""),
    prix_achat: String(sale?.prix_achat ?? ""),
    frais: String(sale?.frais ?? "0"),
    acheteur: sale?.acheteur ?? "",
    date_vente: toLocalInput(sale?.date_vente ?? new Date().toISOString()),
    statut: (sale?.statut ?? "a_envoyer") as SaleStatus,
    suivi: sale?.suivi ?? "",
    bordereau_url: sale?.bordereau_url ?? "",
    notes: sale?.notes ?? "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  // Une boutique retirée reste sélectionnable pour une ancienne vente
  const shopOptions = allShops.filter((s) => s.actif || s.id === v.shop_id);
  const ficheOptions = listings.filter((l) => !v.shop_id || l.shop_id === v.shop_id || l.id === v.listing_id);

  const toNum = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!v.shop_id) return setError("Choisis une boutique (ajoute-en une dans l'onglet Boutiques).");
    setBusy("save");
    setError(null);
    const payload = {
      shop_id: v.shop_id,
      listing_id: v.listing_id || null,
      titre: v.titre.trim(),
      photo_url: v.photo_url || null,
      prix: toNum(v.prix),
      prix_achat: toNum(v.prix_achat),
      frais: toNum(v.frais),
      acheteur: v.acheteur.trim().replace(/^@/, "") || null,
      date_vente: new Date(v.date_vente).toISOString(),
      statut: v.statut,
      suivi: v.suivi.trim() || null,
      bordereau_url: v.bordereau_url || null,
      notes: v.notes.trim() || null,
    };
    try {
      if (sale) await updateSale(sale.id, payload);
      else await createSale(payload);
      await refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function upload(kind: "photo" | "bordereau", file?: File) {
    if (!file) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "photo") setV((x) => ({ ...x, photo_url: "" }));
      const url = kind === "photo" ? await uploadPhoto(file) : await uploadBordereau(file);
      setV((x) => ({ ...x, [kind === "photo" ? "photo_url" : "bordereau_url"]: url }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!sale || !confirm("Supprimer cette vente ?")) return;
    setBusy("delete");
    try {
      await deleteSale(sale.id);
      await refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <ModalTitle onClose={onClose}>{sale ? "Modifier la vente" : "Ajouter une vente"}</ModalTitle>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Boutique
          <select className="input mt-1.5" value={v.shop_id} onChange={set("shop_id")}>
            {shopOptions.length === 0 && <option value="">Aucune boutique</option>}
            {shopOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Fiche produit liée
          <select className="input mt-1.5" value={v.listing_id} onChange={set("listing_id")}>
            <option value="">— Aucune —</option>
            {ficheOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.titre || "(sans titre)"}
              </option>
            ))}
          </select>
        </label>
        <label className="label sm:col-span-2">
          Article
          <input className="input mt-1.5" required value={v.titre} onChange={set("titre")} placeholder="Robe longue fleurie…" />
        </label>

        <div className="flex items-center gap-3 sm:col-span-2">
          <Thumb src={v.photo_url || null} size={56} />
          <label className="btn cursor-pointer">
            {busy === "photo" ? "Envoi…" : v.photo_url ? "Changer la photo" : "Ajouter une photo"}
            <input type="file" accept="image/*" hidden onChange={(e) => upload("photo", e.target.files?.[0])} />
          </label>
          {v.photo_url && (
            <button type="button" className="text-sm text-muted hover:text-white" onClick={() => setV({ ...v, photo_url: "" })}>
              Retirer
            </button>
          )}
        </div>

        <label className="label">
          Prix de vente (€)
          <input className="input mt-1.5" inputMode="decimal" required value={v.prix} onChange={set("prix")} />
        </label>
        <label className="label">
          Prix d&apos;achat (€)
          <input className="input mt-1.5" inputMode="decimal" value={v.prix_achat} onChange={set("prix_achat")} />
        </label>
        <label className="label">
          Frais (€)
          <input className="input mt-1.5" inputMode="decimal" value={v.frais} onChange={set("frais")} />
        </label>
        <label className="label">
          Acheteur (pseudo)
          <input className="input mt-1.5" value={v.acheteur} onChange={set("acheteur")} placeholder="@pseudo" />
        </label>
        <label className="label">
          Date de vente
          <input type="datetime-local" className="input mt-1.5" required value={v.date_vente} onChange={set("date_vente")} />
        </label>
        <label className="label">
          Statut
          <select className="input mt-1.5" value={v.statut} onChange={set("statut")}>
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          N° de suivi
          <input className="input mt-1.5" value={v.suivi} onChange={set("suivi")} />
        </label>
        <div className="label">
          Bordereau (PDF)
          <div className="mt-1.5 flex items-center gap-3">
            <label className="btn cursor-pointer">
              {busy === "bordereau" ? "Envoi…" : v.bordereau_url ? "Remplacer" : "Ajouter le PDF"}
              <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => upload("bordereau", e.target.files?.[0])} />
            </label>
            {v.bordereau_url && <span className="text-xs text-profit">✓ enregistré</span>}
          </div>
        </div>
        <label className="label sm:col-span-2">
          Notes
          <textarea className="input mt-1.5" rows={2} value={v.notes} onChange={set("notes")} />
        </label>

        {error && <p className="text-sm text-alert sm:col-span-2">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          {sale ? (
            <button type="button" className="btn-danger" onClick={remove} disabled={!!busy}>
              Supprimer
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Annuler
            </button>
            <button className="btn-primary" disabled={!!busy}>
              {busy === "save" ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
