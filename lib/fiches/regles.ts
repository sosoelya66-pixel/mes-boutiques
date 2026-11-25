// Règles de fidélité à l'article, appliquées à toutes les boutiques.

export const REGLES_FR = [
  "Uniquement ce qu'on voit sur les captures du produit : ne jamais ajouter de bouton, poche, ceinture, logo, motif, broderie, bijou ou détail qui n'y est pas, ni en retirer un.",
  "Ne rien inventer : si une partie de l'article n'est pas visible sur les captures (le dos, par exemple), la garder simple et cohérente, sans ajouter de détail.",
  "Pas de mélange entre images : ne jamais reprendre un élément des photos de l'avatar, du fond, du sol ou d'une autre photo pour l'ajouter à l'article.",
  "Le même article sur toutes les photos de la série : même couleur exacte, mêmes détails, même nombre de boutons d'une photo à l'autre.",
];

/** Version pour le générateur d'images (en anglais, qu'il suit mieux). */
export const REGLES_EN = [
  "STRICT FIDELITY RULES:",
  "1. Use ONLY what is visible in the product image(s). Never add any button, pocket, belt, logo, pattern, embroidery, jewellery, trim or detail that is not there, and never remove one.",
  "2. Never invent: if a part of the item is not visible in the product images (e.g. the back), keep it plain and consistent with the visible parts, without adding details.",
  "3. No mixing between images: never take any element from the avatar, background or floor images (e.g. the avatar's own clothes) and put it on the item.",
  "4. The item must be IDENTICAL in every photo of the series: exact same colour and shade, same details, same number of buttons/pockets.",
].join("\n");
