// Prompt photo d'une boutique, pour garder des photos cohérentes (ChatGPT, générateur de l'appli, Cowork).
import type { Shop } from "./types";

type StyleFields = Pick<Shop, "nom" | "taille" | "style_avatar" | "style_fond" | "style_sol" | "prompt_photo"> &
  Partial<Pick<Shop, "avatar_url" | "fond_url" | "sol_url">>;

/** Ordre des images à joindre (avatar, fond, sol, puis le produit). */
export function imagesOrder(shop: StyleFields) {
  // Si les photos ne sont pas connues ici, on suppose les trois présentes
  const known = "avatar_url" in shop || "fond_url" in shop || "sol_url" in shop;
  const refs = [
    !known || shop.avatar_url ? "l'avatar" : "",
    !known || shop.fond_url ? "le fond (décor)" : "",
    !known || shop.sol_url ? "le sol" : "",
  ].filter(Boolean);
  return `Images jointes, dans l'ordre : ${[...refs, "puis les photos de l'article"].map((x, i) => (i < refs.length ? `${i + 1}. ${x}` : x)).join(", ")}.`;
}

/** Prompt construit automatiquement à partir de l'avatar, du décor et du sol. */
export function defaultPhotoPrompt(shop: StyleFields) {
  return [
    "Crée une photo réaliste pour une annonce Vinted, prise par la personne elle-même devant un miroir avec un iPhone.",
    imagesOrder(shop),
    "La personne est EXACTEMENT celle de la photo de l'avatar : même visage, mêmes cheveux, même silhouette, même teint.",
    shop.style_avatar ? `Personne : ${shop.style_avatar}` : "",
    "Elle porte {article}. Respecte exactement la couleur, la coupe, la matière et les détails, sans rien inventer ni ajouter de logo.",
    shop.taille ? `Taille portée : ${shop.taille}.` : "",
    `Décor : reproduis EXACTEMENT le décor de la photo du fond (mêmes murs, meubles, objets, lumière)${shop.style_fond ? ` : ${shop.style_fond}` : "."}`,
    `Sol : reproduis EXACTEMENT le sol de la photo du sol${shop.style_sol ? ` : ${shop.style_sol}` : "."}`,
    "Lumière naturelle, rendu authentique de photo de téléphone, légèrement imparfait, sans filtre, sans texte. Format portrait.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Le prompt de la boutique (personnalisé s'il existe), avec l'article inséré à la place de {article}. */
export function photoPrompt(shop: StyleFields, article?: string | null) {
  const base = shop.prompt_photo?.trim() || defaultPhotoPrompt(shop);
  const what = article?.trim()
    ? `l'article des photos produit jointes (${article.trim()})`
    : "l'article des photos produit jointes";
  return base.includes("{article}") ? base.split("{article}").join(what) : article ? `${base}\nArticle porté : ${what}.` : base;
}
