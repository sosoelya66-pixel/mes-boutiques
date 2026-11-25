// Rédige une fiche Vinted avec Claude (photos + lien produit). Réservé à l'utilisateur connecté.
import { userOk } from "@/lib/auth-server";
import { generateFiche, readProductPage } from "@/lib/fiches/generate";
import { admin, getOwnerId } from "@/lib/supabase/admin";
import { htmlToText } from "@/lib/sync/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  shop_id?: string;
  lien?: string;
  photos?: string[];
  marque?: string;
  etat?: string;
  prix_achat?: number | null;
  notes?: string;
};

export async function POST(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Clé ANTHROPIC_API_KEY manquante dans Vercel." }, { status: 500 });
  const b = (await req.json().catch(() => ({}))) as Body;
  const lien = b.lien?.trim() || null;
  const photos = (b.photos ?? []).filter((u) => /^https:\/\//.test(u)).slice(0, 6);
  if (!lien && !photos.length) return Response.json({ error: "Donne au moins un lien produit ou une photo." }, { status: 400 });

  try {
    let taille: string | null = null;
    if (b.shop_id) {
      const { data } = await admin()
        .from("shops")
        .select("taille")
        .eq("id", b.shop_id)
        .eq("owner_id", await getOwnerId())
        .maybeSingle();
      taille = data?.taille ?? null;
    }
    const page = lien ? await readProductPage(lien, htmlToText) : null;
    const fiche = await generateFiche({
      lien,
      page,
      photos,
      taille,
      marque: b.marque?.trim() || null,
      etat: b.etat?.trim() || null,
      prix_achat: typeof b.prix_achat === "number" ? b.prix_achat : null,
      notes: b.notes?.trim() || null,
    });
    return Response.json({ fiche, page_lue: !!page, photo_fournisseur: !photos.length && page?.images.length ? page.images[0] : null });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
