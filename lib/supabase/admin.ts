// Accès « serveur » à Supabase (clé secrète). Utilisé uniquement côté serveur :
// connecteur Cowork aujourd'hui, synchro Gmail plus tard. Jamais envoyé au navigateur.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let ownerId: string | null = null;

export function admin() {
  if (!client) {
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new Error("Variable SUPABASE_SECRET_KEY manquante dans Vercel.");
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** L'id du compte autorisé (ALLOWED_EMAIL) : toutes les données lui appartiennent. */
export async function getOwnerId() {
  if (ownerId) return ownerId;
  const email = (process.env.ALLOWED_EMAIL ?? "").toLowerCase();
  if (!email) throw new Error("Variable ALLOWED_EMAIL manquante dans Vercel.");
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return (ownerId = u.id);
    if (data.users.length < 100) break;
  }
  throw new Error(`Aucun utilisateur Supabase avec l'e-mail ${email}.`);
}
