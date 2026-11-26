// Retire une fiche « À générer » (seulement si elle n'a pas encore été lancée).
import { userOk } from "@/lib/auth-server";
import { admin, getOwnerId } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const owner = await getOwnerId();
  const { error } = await admin()
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("owner_id", owner)
    .eq("generation->>statut", "en_attente");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
