// Lance la synchro des e-mails. Deux façons d'y accéder :
//  - la tâche planifiée (toutes les 15 min) avec l'en-tête Authorization: Bearer <MCP_TOKEN>
//  - le bouton « Synchroniser » de l'appli (utilisateur connecté)
import { timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { runSync } from "@/lib/sync/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bearerOk(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const expected = process.env.MCP_TOKEN ?? "";
  if (expected.length < 24 || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

async function userOk() {
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

export async function POST(req: Request) {
  if (!bearerOk(req) && !(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  try {
    return Response.json(await runSync());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
