// Vérifications d'accès côté serveur (routes /api).
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Jeton secret (tâche planifiée) : en-tête Authorization: Bearer <MCP_TOKEN> */
export function bearerOk(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const expected = process.env.MCP_TOKEN ?? "";
  if (expected.length < 24 || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** Utilisateur connecté à l'appli avec l'adresse autorisée */
export async function userOk() {
  const store = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } }
  );
  const { data } = await supabase.auth.getUser();
  const allowed = (process.env.ALLOWED_EMAIL ?? "").toLowerCase();
  return !!data.user && (!allowed || data.user.email?.toLowerCase() === allowed);
}
