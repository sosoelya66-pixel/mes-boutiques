// Génère UNE photo portée (appelé une fois par photo, pour rester sous les délais de Vercel).
import { userOk } from "@/lib/auth-server";
import { generateWornPhoto } from "@/lib/fiches/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    shop_id?: string;
    produit?: string[];
    pose?: number;
    article?: string;
  };
  if (!b.shop_id) return Response.json({ error: "Boutique manquante." }, { status: 400 });
  try {
    const url = await generateWornPhoto({
      shopId: b.shop_id,
      productImages: (b.produit ?? []).filter((u) => /^https:\/\//.test(u)),
      pose: Number(b.pose ?? 0),
      article: b.article ?? null,
    });
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
