// Photos portées générées par le moteur d'images d'OpenAI (le même que ChatGPT),
// à partir de l'avatar de la boutique et de la photo du produit.
import "server-only";
import OpenAI, { toFile } from "openai";
import { photoPrompt } from "@/lib/prompt";
import { prepareImage } from "./images";
import { admin, getOwnerId } from "@/lib/supabase/admin";

// 4 poses nettement différentes (une par photo)
export const POSES = [
  "FRONT VIEW: standing straight facing the mirror, full body visible head to toe, one hand holding the iPhone in front of the face, other arm relaxed",
  "THREE-QUARTER VIEW: body turned about 45 degrees to the side, weight on one leg, free hand on the hip, full body visible — clearly different angle from a front view",
  "BACK VIEW: back turned to the mirror, looking over the shoulder at the phone, showing the BACK of the item, full body visible",
  "CLOSE-UP: framed from shoulders to hips, slightly turned, free hand touching the item to show fabric, closures and pockets in sharp detail",
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
  tenue?: string | null;
};

async function download(url: string, name: string) {
  const img = await prepareImage(url);
  if (!img) throw new Error(`Image illisible (format non pris en charge) : ${name}. Utilise une photo JPEG ou PNG.`);
  const ext = img.media_type.split("/")[1].replace("jpeg", "jpg");
  return toFile(img.data, `${name}.${ext}`, { type: img.media_type });
}

let client: OpenAI | null = null;

/** Génère une photo portée (sans l'enregistrer). */
export async function generateWornPhoto(input: {
  shopId: string;
  productImages: string[];
  pose: number;
  article: string | null;
  /** Brief précis de l'article (en anglais) écrit par Claude */
  brief?: string | null;
  /** Correction demandée après une vérification ratée */
  correction?: string | null;
}): Promise<Buffer> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Clé OPENAI_API_KEY manquante dans Vercel.");
  if (!input.productImages.length) throw new Error("Il faut au moins une photo du produit.");
  client ??= new OpenAI();
  const owner = await getOwnerId();
  const { data: shop, error } = await admin()
    .from("shops")
    .select("*")
    .eq("id", input.shopId)
    .eq("owner_id", owner)
    .maybeSingle<ShopStyle>();
  if (error || !shop) throw new Error("Boutique introuvable.");
  if (!shop.avatar_url && !shop.style_avatar)
    throw new Error("Style photo de la boutique non défini : ajoute l'avatar dans Boutiques → Modifier.");

  // Ordre : le PRODUIT d'abord (le générateur suit au plus près la première image), puis avatar, fond, sol
  const produits = (
    await Promise.all(input.productImages.slice(0, 3).map((u, i) => download(u, `produit-${i + 1}`).catch(() => null)))
  ).filter((x): x is NonNullable<typeof x> => !!x);
  if (!produits.length) throw new Error("Aucune photo du produit lisible. Ajoute une capture d'écran du produit (PNG ou JPEG).");
  const refs = [
    shop.avatar_url ? { label: "the AVATAR (the person to show)", file: await download(shop.avatar_url, "avatar") } : null,
    shop.fond_url ? { label: "the BACKGROUND / room to reproduce", file: await download(shop.fond_url, "fond") } : null,
    shop.sol_url ? { label: "the FLOOR to reproduce", file: await download(shop.sol_url, "sol") } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);
  const files = [...produits, ...refs.map((r) => r.file)];
  const ordre = [
    ...produits.map((_, i) => `Image ${i + 1}: the GARMENT/ITEM to wear (product reference${produits.length > 1 ? `, view ${i + 1}` : ""}).`),
    ...refs.map((r, i) => `Image ${produits.length + i + 1}: ${r.label}.`),
  ].join("\n");

  // Consignes de fidélité (en anglais : le générateur les suit mieux), puis le style de la boutique
  const fidelite = [
    "TASK: Realistic mirror selfie for a Vinted listing. The person from the avatar image wears the EXACT item from the product image(s).",
    ordre,
    "ITEM FIDELITY (most important): copy the item from the product image(s) exactly — same colour and shade, same length, same cut and fit, same collar/neckline, same sleeves, same zips/buttons/closures and their colour, same pockets, same seams, same pattern/print, same fabric texture and sheen. Do NOT add, remove or invent any detail, logo or text. Do not change the item's colour because of the lighting.",
    input.brief ? `EXACT ITEM SPECIFICATION (follow strictly, counts are exact): ${input.brief}` : "",
    input.article ? `Item description: ${input.article}` : "",
    input.correction ? `CORRECTION FROM PREVIOUS ATTEMPT (must fix): ${input.correction}` : "",
    shop.tenue ? `REST OF THE OUTFIT (always the same for this shop): ${shop.tenue}. Nothing else.` : "Rest of the outfit: simple, neutral, does not distract from the item.",
    shop.taille ? `The item is worn in size ${shop.taille}, with a natural, realistic fit.` : "",
    "PERSON: keep the avatar's face, hair, skin tone and body shape identical. The phone may partially hide the face.",
    shop.fond_url || shop.style_fond ? "SETTING: reproduce the background/room exactly as in its reference image (walls, mirror, furniture, plants, light)." : "",
    shop.sol_url || shop.style_sol ? "FLOOR: reproduce the floor exactly as in its reference image." : "",
    `POSE: ${POSES[input.pose % POSES.length]}. The whole item must be clearly visible.`,
    "STYLE: natural daylight, authentic iPhone photo, slightly imperfect, no filter, no text, no watermark, portrait format.",
  ]
    .filter(Boolean)
    .join("\n");
  // Le prompt de la carte d'identité (ou ton prompt perso) est ajouté comme précisions de style
  // (sans la ligne « Images jointes dans l'ordre… », l'ordre ici est différent)
  const notes = photoPrompt(shop, input.article)
    .split("\n")
    .filter((l) => !l.startsWith("Images jointes"))
    .join("\n");
  const prompt = `${fidelite}\n\nStyle notes from the shop (French):\n${notes}`.slice(0, 31000);

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const result = await client.images.edit({
    model,
    image: files,
    prompt,
    size: "1024x1536",
    // JPEG compressé : ~10 fois plus léger qu'un PNG, chargement rapide sur téléphone
    output_format: "jpeg",
    output_compression: 85,
    quality: (process.env.OPENAI_IMAGE_QUALITY as "low" | "medium" | "high" | undefined) || "high",
    // Haute fidélité aux images fournies (option prise en charge par gpt-image-1.5 uniquement)
    ...(model.startsWith("gpt-image-1.5") ? { input_fidelity: "high" as const } : {}),
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Aucune image renvoyée par le générateur.");
  return Buffer.from(b64, "base64");
}

/** Enregistre une photo générée dans le stockage et renvoie son lien public. */
export async function saveWornPhoto(data: Buffer) {
  const owner = await getOwnerId();
  const path = `${owner}/${crypto.randomUUID()}.jpg`;
  const up = await admin().storage.from("photos").upload(path, data, { contentType: "image/jpeg" });
  if (up.error) throw new Error(up.error.message);
  return admin().storage.from("photos").getPublicUrl(path).data.publicUrl;
}
