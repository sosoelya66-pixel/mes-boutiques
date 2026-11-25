// Lecture / écriture dans Supabase.
import { compressImage } from "./image";
import { supabase } from "./supabase/client";
import type { Tache, TacheInput } from "./taches";
import type { EmailLog, Listing, Sale, Shop, SyncState } from "./types";

export type ListingInput = Omit<Listing, "id" | "created_at">;

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Supabase renvoie 1000 lignes max par requête : on lit par pages. */
async function fetchAll<T>(table: string, order: string): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(order, { ascending: false })
      .range(from, from + size - 1);
    if (error) throw new Error(`${error.message}${error.code ? ` (code ${error.code})` : ""}`);
    out.push(...(data as T[]));
    if (!data || data.length < size) break;
  }
  return out;
}

export async function loadAll() {
  const [shops, sales, listings] = await Promise.all([
    fetchAll<Shop>("shops", "created_at"),
    fetchAll<Sale>("sales", "date_vente"),
    fetchAll<Listing>("listings", "created_at"),
  ]);
  const reglages = await supabase.from("reglages").select("objectif_mensuel").maybeSingle();
  return {
    objectifGlobal: reglages.data?.objectif_mensuel != null ? Number(reglages.data.objectif_mensuel) : null,
    shops: shops
      .reverse() // plus ancienne boutique en premier
      .map((s) => ({ ...s, objectif_mensuel: s.objectif_mensuel != null ? Number(s.objectif_mensuel) : null })),
    sales: sales.map((s) => ({ ...s, prix: num(s.prix), prix_achat: num(s.prix_achat), frais: num(s.frais) })),
    listings: listings.map((l) => ({ ...l, prix: num(l.prix), prix_achat: num(l.prix_achat) })),
  };
}

function check<T>(r: { data: T; error: { message: string } | null }) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

// --- Boutiques ---
export type ShopInput = Pick<
  Shop,
  "nom" | "taille" | "alias_email" | "couleur" | "avatar_url" | "fond_url" | "sol_url" | "style_avatar" | "style_fond" | "style_sol" | "prompt_photo"
>;
export const createShop = async (v: ShopInput) => check(await supabase.from("shops").insert(v));
export const updateShop = async (id: string, v: Partial<Shop>) =>
  check(await supabase.from("shops").update(v).eq("id", id));
export const deleteShop = async (id: string) => check(await supabase.from("shops").delete().eq("id", id));

// --- Ventes ---
export type SaleInput = Omit<Sale, "id" | "created_at" | "gmail_message_id" | "prix_source" | "ref_vinted"> &
  Partial<Pick<Sale, "prix_source">>;
export const createSale = async (v: SaleInput) => check(await supabase.from("sales").insert(v));
export const updateSale = async (id: string, v: Partial<Sale>) =>
  check(await supabase.from("sales").update(v).eq("id", id));
export const deleteSale = async (id: string) => check(await supabase.from("sales").delete().eq("id", id));

// --- Objectifs ---
export async function saveObjectifs(global: number | null, parBoutique: Record<string, number | null>) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  check(
    await supabase
      .from("reglages")
      .upsert({ owner_id: data.user.id, objectif_mensuel: global, updated_at: new Date().toISOString() })
  );
  for (const [id, v] of Object.entries(parBoutique)) check(await supabase.from("shops").update({ objectif_mensuel: v }).eq("id", id));
}

// --- Fiches ---
export const createListing = async (v: ListingInput) =>
  check(await supabase.from("listings").insert(v).select("id").single()) as { id: string };
export const updateListing = async (id: string, v: Partial<Listing>) =>
  check(await supabase.from("listings").update(v).eq("id", id));
export const deleteListing = async (id: string) => check(await supabase.from("listings").delete().eq("id", id));

// --- Fichiers ---
async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  return data.user.id;
}

const ext = (f: File) => (f.name.split(".").pop() || "bin").toLowerCase();

/** Envoie une photo et renvoie son lien public. */
export async function uploadPhoto(original: File) {
  const file = await compressImage(original);
  const path = `${await uid()}/${crypto.randomUUID()}.${ext(file)}`;
  check(await supabase.storage.from("photos").upload(path, file, { contentType: file.type }));
  return supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
}

/** Envoie un bordereau PDF (privé) et renvoie son chemin dans le stockage. */
export async function uploadBordereau(file: File) {
  const path = `${await uid()}/${crypto.randomUUID()}.${ext(file)}`;
  check(await supabase.storage.from("bordereaux").upload(path, file, { contentType: file.type }));
  return path;
}

/** Donne un lien utilisable pour un bordereau (lien externe ou fichier privé). */
export async function bordereauLink(value: string) {
  if (/^https?:\/\//.test(value)) return value;
  const { data, error } = await supabase.storage.from("bordereaux").createSignedUrl(value, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// --- Synchro des e-mails ---
export async function runSyncNow(relireJours = 0): Promise<{ message: string }> {
  const res = await fetch(`/api/sync${relireJours ? `?relire=${relireJours}` : ""}`, { method: "POST" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json;
}

export async function loadSyncInfo() {
  const [log, state] = await Promise.all([
    supabase.from("email_log").select("*").order("recu_le", { ascending: false }).limit(40),
    supabase.from("sync_state").select("derniere_synchro, derniere_erreur, en_cours_depuis").maybeSingle(),
  ]);
  if (log.error) throw new Error(log.error.message);
  return { log: (log.data ?? []) as EmailLog[], state: (state.data ?? null) as SyncState | null };
}

export const markLogHandled = async (id: string) =>
  check(await supabase.from("email_log").update({ statut: "traite", detail: "Traité à la main" }).eq("id", id));

// --- Tâches du jour ---
export async function loadTaches(jour: string) {
  const r = await supabase.from("taches").select("*").eq("jour", jour).order("ordre").order("created_at");
  if (r.error) throw new Error(r.error.message);
  return r.data as Tache[];
}

/** Ajoute les tâches qui n'existent pas encore pour ce jour (sans toucher aux autres). */
export async function insertTaches(jour: string, list: TacheInput[]) {
  if (!list.length) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  check(
    await supabase
      .from("taches")
      .upsert(list.map((t) => ({ ...t, jour, owner_id: data.user!.id })), { onConflict: "owner_id,jour,cle", ignoreDuplicates: true })
  );
}

export const setTacheFaite = async (id: string, fait: boolean, auto = false) =>
  check(await supabase.from("taches").update({ fait, auto: fait && auto, fait_le: fait ? new Date().toISOString() : null }).eq("id", id));

export const deleteTache = async (id: string) => check(await supabase.from("taches").delete().eq("id", id));

/** Dernier e-mail Vinted reconnu pour chaque boutique (id → date). */
export async function loadShopSync(): Promise<Record<string, string>> {
  const r = await supabase
    .from("email_log")
    .select("shop_id, recu_le")
    .not("shop_id", "is", null)
    .order("recu_le", { ascending: false })
    .limit(1000);
  if (r.error) throw new Error(r.error.message);
  const out: Record<string, string> = {};
  for (const row of r.data as { shop_id: string; recu_le: string }[]) if (!out[row.shop_id]) out[row.shop_id] = row.recu_le;
  return out;
}
