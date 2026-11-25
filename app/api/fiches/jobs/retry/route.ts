// Relance la préparation d'une fiche qui a échoué.
import { after } from "next/server";
import { userOk } from "@/lib/auth-server";
import { triggerStep } from "@/lib/fiches/trigger";
import { admin, getOwnerId } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return Response.json({ error: "Fiche manquante." }, { status: 400 });
  const owner = await getOwnerId();
  const { data } = await admin().from("listings").select("generation").eq("id", id).eq("owner_id", owner).maybeSingle();
  const g = data?.generation as Record<string, unknown> | null;
  if (!g?.params) return Response.json({ error: "Cette fiche n'a pas été créée avec Claude." }, { status: 400 });
  await admin()
    .from("listings")
    .update({ generation: { ...g, statut: "en_cours", etape: "Claude rédige la fiche", erreurs: [], photos_faites: 0, portees: [] } })
    .eq("id", id);
  const origin = new URL(req.url).origin;
  after(() => triggerStep(origin, { id, step: "texte" }));
  return Response.json({ ok: true });
}
