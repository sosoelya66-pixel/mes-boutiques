// Lecture / écriture dans Supabase.
import { supabase } from "./supabase/client";
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
  return {
    shops: shops.reverse(), // plus ancienne boutique en premier
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
export async function uploadPhoto(file: File) {
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
export async function runSyncNow(): Promise<{ message: string }> {
  const res = await fetch("/api/sync", { method: "POST" });
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
