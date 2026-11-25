// Lance une recherche Radar en arrière-plan et répond tout de suite.
import { after } from "next/server";
import { userOk } from "@/lib/auth-server";
import { creerRecherche, executerRecherche } from "@/lib/radar/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Clé ANTHROPIC_API_KEY manquante dans Vercel." }, { status: 500 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null);
  const lien = str(b.lien);
  if (lien && !/^https:\/\/([a-z0-9-]+\.)*(temu|shein)\.com\//i.test(lien))
    return Response.json({ error: "Le lien doit venir de temu.com ou shein.com." }, { status: 400 });
  const budget = Number(b.budget_max);
  const prix = Number(b.prix);
  try {
    const id = await creerRecherche({
      shop_id: str(b.shop_id),
      categorie: str(b.categorie),
      budget_max: Number.isFinite(budget) && budget > 0 ? budget : null,
      lien,
      prix: Number.isFinite(prix) && prix > 0 ? prix : null,
      ville: str(b.ville) ?? "Lille",
    });
    after(() => executerRecherche(id));
    return Response.json({ id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
