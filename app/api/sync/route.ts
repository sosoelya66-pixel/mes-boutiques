// Lance la synchro des e-mails. Deux façons d'y accéder :
//  - la tâche planifiée (toutes les 15 min) avec l'en-tête Authorization: Bearer <MCP_TOKEN>
//  - le bouton « Synchroniser » de l'appli (utilisateur connecté)
import { bearerOk, userOk } from "@/lib/auth-server";
import { sendReminderIfDue } from "@/lib/push";
import { runSync } from "@/lib/sync/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!bearerOk(req) && !(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const rescan = Math.min(60, Math.max(0, Number(new URL(req.url).searchParams.get("relire") ?? 0)));
    const summary = await runSync(rescan);
    // Rappel quotidien des colis en attente (au plus une fois par jour, à partir de 9 h)
    await sendReminderIfDue().catch(() => {});
    return Response.json(summary);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
