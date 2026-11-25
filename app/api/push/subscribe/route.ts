// Inscrit (POST) ou désinscrit (DELETE) un appareil aux notifications.
import { userOk } from "@/lib/auth-server";
import { admin, getOwnerId } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; appareil?: string };

export async function POST(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return Response.json({ error: "Inscription invalide" }, { status: 400 });
  const { error } = await admin()
    .from("push_subscriptions")
    .upsert(
      { owner_id: await getOwnerId(), endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, appareil: body.appareil?.slice(0, 120) ?? null },
      { onConflict: "endpoint" }
    );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;
  if (body.subscription?.endpoint) await admin().from("push_subscriptions").delete().eq("endpoint", body.subscription.endpoint);
  return Response.json({ ok: true });
}
