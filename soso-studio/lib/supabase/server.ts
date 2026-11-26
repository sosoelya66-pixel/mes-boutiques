// Accès à Supabase depuis le serveur, au nom de l'utilisateur connecté (mêmes droits que dans l'appli).
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function serverSupabase() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
}

/** Renvoie l'utilisateur connecté s'il a le droit d'utiliser l'appli, sinon null. */
export async function allowedUser() {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  const allowed = (process.env.ALLOWED_EMAIL ?? "").toLowerCase();
  const ok = !!data.user && (!allowed || data.user.email?.toLowerCase() === allowed);
  return ok ? { supabase, user: data.user! } : null;
}
