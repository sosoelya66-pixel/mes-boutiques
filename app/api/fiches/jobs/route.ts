// Lance la préparation d'une fiche en arrière-plan et répond tout de suite.
import { after } from "next/server";
import { userOk } from "@/lib/auth-server";
import { createJob } from "@/lib/fiches/job";
import { PHOTO_TYPES, type PhotoType } from "@/lib/fiches/photoTypes";
import { triggerStep } from "@/lib/fiches/trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALIDES = new Set(PHOTO_TYPES.map((t) => t.value));
/** Liste des types de photos (4 max) ; à défaut, le nombre de photos demandé. */
function typesOf(raw: unknown, nb: number) {
  const types = (Array.isArray(raw) ? raw : []).filter((t): t is PhotoType => typeof t === "string" && VALIDES.has(t as PhotoType)).slice(0, 4);
  return types.length ? { nb_photos: types.length, photos_types: types } : { nb_photos: Math.max(0, Math.min(4, nb)) };
}

export async function POST(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Clé ANTHROPIC_API_KEY manquante dans Vercel." }, { status: 500 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const lien = typeof b.lien === "string" && b.lien.trim() ? b.lien.trim() : null;
  const produit = (Array.isArray(b.produit) ? b.produit : []).filter((u): u is string => typeof u === "string" && u.startsWith("https://")).slice(0, 6);
  if (!b.shop_id || typeof b.shop_id !== "string") return Response.json({ error: "Choisis une boutique." }, { status: 400 });
  if (!lien && !produit.length) return Response.json({ error: "Donne un lien produit ou au moins une photo." }, { status: 400 });
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  try {
    const id = await createJob({
      shop_id: b.shop_id,
      lien,
      produit,
      marque: str(b.marque),
      etat: str(b.etat),
      prix_achat: typeof b.prix_achat === "number" && Number.isFinite(b.prix_achat) ? b.prix_achat : null,
      notes: str(b.notes),
      ...typesOf(b.photos_types, Number(b.nb_photos ?? 0)),
    });
    const origin = new URL(req.url).origin;
    after(() => triggerStep(origin, { id, step: "texte" }));
    return Response.json({ id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
