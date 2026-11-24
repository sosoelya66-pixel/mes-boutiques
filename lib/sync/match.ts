// Petites fonctions de rapprochement (boutique, vente, fiche).

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length >= 3));

/** Ressemblance entre deux titres, de 0 à 1. */
export function titleScore(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return 0;
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return norm(a) === norm(b) ? 1 : 0;
  let common = 0;
  for (const t of A) if (B.has(t)) common++;
  return common / Math.min(A.size, B.size);
}

export const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && norm(a) === norm(b);

/** Toutes les adresses e-mail trouvées dans un texte. */
export const emailsIn = (s: string) => (s.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) ?? []);

/** Le pseudo apparaît-il comme mot entier dans le texte ? */
export function containsWord(text: string, word: string) {
  const w = norm(word);
  return !!w && ` ${norm(text)} `.includes(` ${w} `);
}
