// Prompt photo d'une boutique, pour garder des photos cohérentes (ChatGPT, générateur de l'appli, Cowork).
import type { Shop } from "./types";

type StyleFields = Pick<Shop, "nom" | "taille" | "style_avatar" | "style_fond" | "style_sol" | "prompt_photo">;

/** Prompt construit automatiquement à partir de l'avatar, du décor et du sol. */
export function defaultPhotoPrompt(shop: StyleFields) {
  return [
    "Crée une photo réaliste pour une annonce Vinted, prise par la personne elle-même devant un miroir avec un iPhone.",
    "Utilise la photo de l'avatar jointe : même visage, mêmes cheveux, même silhouette, même teint.",
    shop.style_avatar ? `Personne : ${shop.style_avatar}` : "",
    "Elle porte {article}. Respecte exactement la couleur, la coupe, la matière et les détails, sans rien inventer ni ajouter de logo.",
    shop.taille ? `Taille portée : ${shop.taille}.` : "",
    shop.style_fond ? `Décor : ${shop.style_fond}` : "",
    shop.style_sol ? `Sol : ${shop.style_sol}` : "",
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
