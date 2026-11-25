// Rédaction d'une fiche Vinted par Claude, à partir des photos et du lien produit.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { prepareImage } from "./images";

export const FicheData = z.object({
  titre: z.string().describe("Titre Vinted, 50 caractères maximum, avec le type d'article, la marque si connue et un détail utile"),
  description: z.string().describe("Description de 3 à 5 lignes naturelles, en français, séparées par des retours à la ligne"),
  marque: z.string().nullable(),
  categorie: z.string().describe("Catégorie Vinted la plus précise possible, ex. « Femmes > Vêtements > Pulls & sweats > Pulls »"),
  couleur: z.string().describe("Couleur principale (et secondaire si utile), ex. « Beige »"),
  matiere: z.string().nullable().describe("Matière principale si elle est connue ou visible, sinon null"),
  etat: z.enum(["Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état", "Satisfaisant"]),
  prix_conseille: z.number().describe("Prix de vente conseillé sur Vinted, en euros"),
  prix_achat_trouve: z.number().nullable().describe("Prix d'achat lu sur la page fournisseur, en euros, sinon null"),
  conseil: z.string().describe("Un conseil court pour mieux vendre cet article (photo, prix, moment de publication…)"),
});
export type FicheData = z.infer<typeof FicheData>;

const SYSTEM = `Tu rédiges des annonces Vinted en français pour une vendeuse qui revend des vêtements et accessoires.
Règles :
- Titre : 50 caractères maximum, clair, sans majuscules partout, sans emoji. Exemple : « Pull maille côtelée beige oversize ».
- Description : 3 à 5 lignes naturelles, comme écrites par une vraie personne : ce qu'est l'article, la coupe ou le style, la matière, l'état, la taille, et une phrase pour l'envoi. Pas de liste à puces, pas de mots en majuscules, pas de hashtags, 2 emojis maximum.
- Ne mentionne jamais le fournisseur (AliExpress, 1688, Shein…), ni le prix d'achat, ni que l'article vient d'un site en ligne.
- N'invente pas de marque : si elle n'est pas connue, mets null et n'en parle pas.
- Prix conseillé : réaliste pour Vinted (articles comparables d'occasion ou neufs), en tenant compte du prix d'achat s'il est connu pour garder une marge correcte.`;

type Page = { titre: string; texte: string; images: string[] };

function isPublicHttpUrl(u: string) {
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) return false;
    const h = x.hostname;
    return !(h === "localhost" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.)/.test(h) || h.endsWith(".local") || h.includes(":"));
  } catch {
    return false;
  }
}

/** Lit la page produit (titre, description, prix, images). Peut échouer : certains sites bloquent les robots. */
export async function readProductPage(url: string, htmlToText: (h: string) => string): Promise<Page | null> {
  if (!isPublicHttpUrl(url)) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 1_500_000);
    const meta = (name: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"))?.[1];
    const jsonLd = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => m[1].trim())
      .join("\n")
      .slice(0, 6000);
    const titre = meta("og:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";
    const parts = [
      meta("og:description") ?? meta("description") ?? "",
      meta("product:price:amount") ? `Prix affiché : ${meta("product:price:amount")} ${meta("product:price:currency") ?? ""}` : "",
      jsonLd ? `Données produit : ${jsonLd}` : "",
      htmlToText(html.replace(/<head[\s\S]*?<\/head>/i, "")).slice(0, 8000),
    ];
    const images = [meta("og:image")].filter((x): x is string => !!x && isPublicHttpUrl(x));
    return { titre: titre.trim(), texte: parts.filter(Boolean).join("\n\n"), images };
  } catch {
    return null;
  }
}

let client: Anthropic | null = null;

export async function generateFiche(input: {
  lien: string | null;
  page: Page | null;
  photos: string[];
  taille: string | null;
  marque: string | null;
  etat: string | null;
  prix_achat: number | null;
  notes: string | null;
}): Promise<FicheData> {
  client ??= new Anthropic();
  // Photos de l'utilisateur en priorité ; sinon l'image de la page fournisseur
  const images = (input.photos.length ? input.photos : input.page?.images ?? []).slice(0, 6);
  const infos = [
    `Taille de la boutique : ${input.taille ?? "non précisée"}`,
    input.marque ? `Marque indiquée par la vendeuse : ${input.marque}` : "",
    input.etat ? `État indiqué par la vendeuse : ${input.etat}` : "",
    input.prix_achat != null ? `Prix d'achat : ${input.prix_achat} €` : "",
    input.notes ? `Notes de la vendeuse : ${input.notes}` : "",
    input.lien ? `Lien produit : ${input.lien}` : "",
    input.page
      ? `--- Page produit ---\nTitre : ${input.page.titre}\n${input.page.texte}`
      : input.lien
        ? "(La page produit n'a pas pu être lue : base-toi sur les photos et les notes.)"
        : "",
    "Rédige la fiche Vinted.",
  ]
    .filter(Boolean)
    .join("\n");

  const prepared = (await Promise.all(images.map(prepareImage))).filter((x): x is NonNullable<typeof x> => !!x);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...prepared.map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: img.media_type, data: img.data.toString("base64") },
    })),
    { type: "text", text: infos },
  ];

  const response = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(FicheData) },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude a refusé de rédiger cette fiche.");
  if (!response.parsed_output) throw new Error(`Réponse illisible (arrêt : ${response.stop_reason}).`);
  const f = response.parsed_output;
  // Sécurité : le titre Vinted ne doit pas dépasser 50 caractères
  if (f.titre.length > 50) f.titre = f.titre.slice(0, 50).replace(/\s+\S*$/, "").trim();
  return f;
}
