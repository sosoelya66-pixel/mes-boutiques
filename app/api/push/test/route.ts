// Envoie une notification de test à tous les appareils inscrits.
import { userOk } from "@/lib/auth-server";
import { BRAND } from "@/lib/brand";
import { sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const sent = await sendPush({ title: BRAND.name, body: "Les notifications fonctionnent ✓", url: "/aujourdhui", tag: "test" });
    return Response.json({ sent });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
