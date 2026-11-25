// Photos portées générées par le moteur d'images d'OpenAI (le même que ChatGPT),
// à partir de l'avatar de la boutique et de la photo du produit.
import "server-only";
import OpenAI, { toFile } from "openai";
import { photoPrompt } from "@/lib/prompt";
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
  style_avatar: string | null;
  style_fond: string | null;
  style_sol: string | null;
};

async function download(url: string, name: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Image inaccessible (${res.status}) : ${url.slice(0, 80)}`);
  const type = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
  if (!type.startsWith("image/")) throw new Error("Un des liens ne pointe pas vers une image.");
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  return toFile(Buffer.from(await res.arrayBuffer()), `${name}.${ext}`, { type });
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
    .select("nom, taille, prompt_photo, avatar_url, style_avatar, style_fond, style_sol")
    .eq("id", input.shopId)
    .eq("owner_id", owner)
    .maybeSingle<ShopStyle>();
  if (error || !shop) throw new Error("Boutique introuvable.");
  if (!shop.avatar_url && !shop.style_avatar)
    throw new Error("Style photo de la boutique non défini : ajoute l'avatar dans Boutiques → Modifier.");

  const files = [
    ...(shop.avatar_url ? [await download(shop.avatar_url, "avatar")] : []),
    ...(await Promise.all(input.productImages.slice(0, 3).map((u, i) => download(u, `produit-${i + 1}`)))),
  ];
  const avatarRef = shop.avatar_url
    ? "La personne est EXACTEMENT celle de la première image (même visage, mêmes cheveux, même silhouette, même teint)."
    : "";
  // Prompt personnalisé de la carte d'identité si elle en a un, sinon prompt construit à partir des champs
  const prompt = shop.prompt_photo?.trim()
    ? `${photoPrompt(shop, input.article)}\nPose : ${POSES[input.pose % POSES.length]}.`
    : [
    "Photo réaliste pour une annonce Vinted, prise par la personne elle-même devant un miroir avec un iPhone.",
    avatarRef,
    shop.style_avatar ? `Personne : ${shop.style_avatar}` : "",
    `Elle porte EXACTEMENT l'article des photos produit${input.article ? ` (${input.article})` : ""} : même couleur, même coupe, même matière, mêmes détails, sans rien inventer ni ajouter de logo.`,
    shop.style_fond ? `Décor : ${shop.style_fond}` : "",
    shop.style_sol ? `Sol : ${shop.style_sol}` : "",
    `Pose : ${POSES[input.pose % POSES.length]}.`,
    "Lumière naturelle, rendu authentique de photo de téléphone, légèrement imparfait, sans filtre, sans texte, sans filigrane. Format portrait.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await client.images.edit({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    image: files,
    prompt,
    size: "1024x1536",
    quality: (process.env.OPENAI_IMAGE_QUALITY as "low" | "medium" | "high" | undefined) || "medium",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Aucune image renvoyée par le générateur.");

  const path = `${owner}/${crypto.randomUUID()}.png`;
  const up = await admin().storage.from("photos").upload(path, Buffer.from(b64, "base64"), { contentType: "image/png" });
  if (up.error) throw new Error(up.error.message);
  return admin().storage.from("photos").getPublicUrl(path).data.publicUrl;
}
