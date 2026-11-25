// Photos portées générées par le moteur d'images d'OpenAI (le même que ChatGPT),
// à partir de l'avatar de la boutique et de la photo du produit.
import "server-only";
import OpenAI, { toFile } from "openai";
import { imagesOrder, photoPrompt } from "@/lib/prompt";
import { prepareImage } from "./images";
import { admin, getOwnerId } from "@/lib/supabase/admin";

export const POSES = [
  "debout face au miroir, une main tient l'iPhone devant le visage, l'autre le long du corps, tenue vue en entier",
  "de trois-quarts face au miroir, légère inclinaison des hanches, on voit bien la coupe et le tombé du vêtement",
  "de profil ou de dos tourné vers le miroir, la tête légèrement tournée, pour montrer l'arrière du vêtement",
  "photo rapprochée au miroir, cadrage du buste à la taille, on voit les détails : matière, coutures, boutons ou motifs",
];

type ShopStyle = {
  nom: string;
  taille: string | null;
  prompt_photo: string | null;
  avatar_url: string | null;
  fond_url: string | null;
  sol_url: string | null;
  style_avatar: string | null;
  style_fond: string | null;
  style_sol: string | null;
};

async function download(url: string, name: string) {
  const img = await prepareImage(url);
  if (!img) throw new Error(`Image illisible (format non pris en charge) : ${name}. Utilise une photo JPEG ou PNG.`);
  const ext = img.media_type.split("/")[1].replace("jpeg", "jpg");
  return toFile(img.data, `${name}.${ext}`, { type: img.media_type });
}

let client: OpenAI | null = null;

/** Génère une photo portée et l'enregistre dans le stockage. Renvoie son lien public. */
export async function generateWornPhoto(input: {
  shopId: string;
  productImages: string[];
  pose: number;
  article: string | null;
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error("Clé OPENAI_API_KEY manquante dans Vercel.");
  if (!input.productImages.length) throw new Error("Il faut au moins une photo du produit.");
  client ??= new OpenAI();
  const owner = await getOwnerId();
  const { data: shop, error } = await admin()
    .from("shops")
    .select("nom, taille, prompt_photo, avatar_url, fond_url, sol_url, style_avatar, style_fond, style_sol")
    .eq("id", input.shopId)
    .eq("owner_id", owner)
    .maybeSingle<ShopStyle>();
  if (error || !shop) throw new Error("Boutique introuvable.");
  if (!shop.avatar_url && !shop.style_avatar)
    throw new Error("Style photo de la boutique non défini : ajoute l'avatar dans Boutiques → Modifier.");

  const files = [
    ...(shop.avatar_url ? [await download(shop.avatar_url, "avatar")] : []),
    ...(shop.fond_url ? [await download(shop.fond_url, "fond")] : []),
    ...(shop.sol_url ? [await download(shop.sol_url, "sol")] : []),
    ...(await Promise.all(input.productImages.slice(0, 3).map((u, i) => download(u, `produit-${i + 1}`).catch(() => null)))).filter(
      (x): x is NonNullable<typeof x> => !!x
    ),
  ];
  const nbRefs = [shop.avatar_url, shop.fond_url, shop.sol_url].filter(Boolean).length;
  if (files.length <= nbRefs) throw new Error("Aucune photo du produit lisible (format non pris en charge). Ajoute une photo JPEG ou PNG.");
  // Même prompt que celui copié depuis la carte d'identité (ou ton prompt personnalisé), plus la pose
  const base = photoPrompt(shop, input.article);
  const prompt = `${shop.prompt_photo?.trim() ? `${imagesOrder(shop)}\n` : ""}${base}\nPose : ${POSES[input.pose % POSES.length]}.`;

  const result = await client.images.edit({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    image: files,
    prompt,
    size: "1024x1536",
    // JPEG compressé : ~10 fois plus léger qu'un PNG, chargement rapide sur téléphone
    output_format: "jpeg",
    output_compression: 85,
    quality: (process.env.OPENAI_IMAGE_QUALITY as "low" | "medium" | "high" | undefined) || "medium",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Aucune image renvoyée par le générateur.");

  const path = `${owner}/${crypto.randomUUID()}.jpg`;
  const up = await admin().storage.from("photos").upload(path, Buffer.from(b64, "base64"), { contentType: "image/jpeg" });
  if (up.error) throw new Error(up.error.message);
  return admin().storage.from("photos").getPublicUrl(path).data.publicUrl;
}
