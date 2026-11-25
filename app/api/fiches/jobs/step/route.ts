// Exécute UNE étape de préparation d'une fiche, puis déclenche la suivante.
// Appelée uniquement par le serveur lui-même (jeton MCP_TOKEN).
import { after } from "next/server";
import { bearerOk } from "@/lib/auth-server";
import { runPhotoStep, runTextStep } from "@/lib/fiches/job";
import { triggerStep, type Step } from "@/lib/fiches/trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!bearerOk(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<Step>;
  if (!b.id || (b.step !== "texte" && b.step !== "photo")) return Response.json({ error: "Requête invalide" }, { status: 400 });
  const origin = new URL(req.url).origin;
  const { id } = b;
  // On répond tout de suite ; le travail continue après la réponse
  after(async () => {
    if (b.step === "texte") {
      if (await runTextStep(id)) await triggerStep(origin, { id, step: "photo", i: 0 });
    } else {
      const i = Number(b.i ?? 0);
      if (await runPhotoStep(id, i)) await triggerStep(origin, { id, step: "photo", i: i + 1 });
    }
  });
  return Response.json({ ok: true }, { status: 202 });
}
