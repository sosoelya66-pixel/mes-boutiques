// Génère (ou régénère) les photos portées d'une fiche existante, à partir de ses photos produit.
import { after } from "next/server";
import { userOk } from "@/lib/auth-server";
import { imagesFromLink } from "@/lib/fiches/imagesFromLink";
import { triggerStep } from "@/lib/fiches/trigger";
import { admin, getOwnerId } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; nb?: number };
  const nb = Math.max(1, Math.min(4, Number(b.nb ?? 2)));
  if (!b.id) return Response.json({ error: "Fiche manquante." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Clé OPENAI_API_KEY manquante dans Vercel." }, { status: 500 });
  const owner = await getOwnerId();
  const { data: l } = await admin()
    .from("listings")
    .select("id, shop_id, photos, prix_achat, liens_produit, generation")
    .eq("id", b.id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (!l) return Response.json({ error: "Fiche introuvable." }, { status: 404 });
  if (!l.shop_id) return Response.json({ error: "Choisis d'abord une boutique pour cette fiche (Modifier)." }, { status: 400 });
  const g = (l.generation ?? {}) as Record<string, unknown>;
  const dejaPortees = new Set([...((g.portees as string[] | undefined) ?? []), ...((g.anciennes as string[] | undefined) ?? [])]);
  // Photos produit = photos de la fiche qui ne sont pas des photos portées déjà générées
  let produit = ((l.photos as string[]) ?? []).filter((u) => !dejaPortees.has(u)).slice(0, 3);
  // Pas de photo produit : Claude essaie de les lire sur le lien produit
  const lien = ((l.liens_produit as string[]) ?? [])[0];
  if (!produit.length && lien) produit = await imagesFromLink(lien);
  if (!produit.length)
    return Response.json({ error: "Impossible de lire les photos sur le lien. Ajoute une capture du produit (Modifier → + Photos), puis réessaie." }, { status: 400 });
  const params = { ...((g.params as Record<string, unknown>) ?? {}), shop_id: l.shop_id, produit, nb_photos: nb };
  await admin()
    .from("listings")
    .update({
      // Les anciennes photos portées sont gardées ; les nouvelles passent devant
      photos: l.photos,
      generation: {
        statut: "en_cours",
        etape: `Photo 1/${nb}`,
        photos_prevues: nb,
        photos_faites: 0,
        erreurs: [],
        params,
        ref_images: produit,
        portees: [],
        // photos portées précédentes, gardées à la fin
        anciennes: ((l.photos as string[]) ?? []).filter((u) => dejaPortees.has(u)),
      },
    })
    .eq("id", l.id);
  const origin = new URL(req.url).origin;
  after(() => triggerStep(origin, { id: l.id, step: "photo", i: 0 }));
  return Response.json({ ok: true });
}
