// Brief photo : Claude décrit précisément l'article (avant) puis vérifie la photo générée (après).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { prepareImage, type Prepared } from "./images";
import { REGLES_FR } from "./regles";

let client: Anthropic | null = null;
const MODEL = (m?: string) => m || process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const Brief = z.object({
  resume_fr: z.string().describe("Fiche technique visuelle en français, lisible par la vendeuse (5 à 8 lignes)"),
  brief_en: z
    .string()
    .describe(
      "Precise English description for an image generator: garment type, exact colour/shade, material and sheen, length, fit, collar, sleeves and cuffs, closure type with EXACT count and colour of buttons/snaps/zips, EXACT number and style of pockets, waist/hem details, pattern/print, any visible detail. Use numbers. One paragraph."
    ),
  points_cles: z.array(z.string()).describe("5 à 10 points vérifiables, chiffrés si possible (ex. « 5 boutons-pressions argentés sur le devant »)"),
  a_eviter: z.array(z.string()).describe("Erreurs à ne pas faire (ex. « ne pas ajouter de ceinture », « pas de logo »)"),
});
export type BriefData = z.infer<typeof Brief>;

const Verif = z.object({
  conforme: z.boolean().describe("true si la photo respecte tous les points clés importants"),
  ecarts: z.array(z.string()).describe("Différences constatées, en français (ex. « 6 boutons au lieu de 5 »)"),
  correction_en: z.string().describe("If not compliant: precise English instructions to fix the garment in the next attempt. Empty otherwise."),
});
export type VerifData = z.infer<typeof Verif>;

const imgBlock = (img: Prepared) => ({
  type: "image" as const,
  source: { type: "base64" as const, media_type: img.media_type, data: img.data.toString("base64") },
});

async function produits(urls: string[]) {
  return (await Promise.all(urls.slice(0, 3).map((u) => prepareImage(u, 768)))).filter((x): x is Prepared => !!x);
}

/** Avant la génération : fiche technique visuelle de l'article. */
export async function briefArticle(productImages: string[], article: string | null, modele?: string): Promise<BriefData> {
  client ??= new Anthropic();
  const imgs = await produits(productImages);
  if (!imgs.length) throw new Error("Aucune capture du produit lisible pour le brief.");
  const r = await client.beta.messages.parse({
    model: MODEL(modele),
    max_tokens: 3000,
    output_config: { effort: "medium", format: betaZodOutputFormat(Brief) },
    messages: [
      {
        role: "user",
        content: [
          ...imgs.map(imgBlock),
          {
            type: "text",
            text:
              "Ces images montrent un article à faire porter sur une photo générée. Observe-le avec une extrême précision et compte exactement " +
              "les boutons, pressions, fermetures, poches, passants, coutures visibles. N'invente rien : si un détail n'est pas visible, ne le mentionne pas. " +
              "Dans « a_eviter », reprends ces règles adaptées à l'article :\n- " + REGLES_FR.join("\n- ") +
              (article ? `\nInfos de la fiche : ${article}` : ""),
          },
        ],
      },
    ],
  });
  if (!r.parsed_output) throw new Error("Brief illisible.");
  return r.parsed_output;
}

/** Après la génération : la photo respecte-t-elle l'article ? */
export async function verifierPhoto(
  productImages: string[],
  photo: Prepared,
  brief: BriefData,
  /** Première photo validée de la série : l'article doit y être identique (couleur, détails) */
  serie?: string | null,
  modele?: string
): Promise<VerifData> {
  client ??= new Anthropic();
  const imgs = await produits(productImages);
  const serieImg = serie ? await prepareImage(serie, 768) : null;
  const r = await client.beta.messages.parse({
    model: MODEL(modele),
    max_tokens: 2000,
    output_config: { effort: "medium", format: betaZodOutputFormat(Verif) },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Images de RÉFÉRENCE de l'article :" },
          ...imgs.map(imgBlock),
          ...(serieImg ? [{ type: "text" as const, text: "PHOTO DÉJÀ VALIDÉE de la même série (l'article doit y être identique) :" }, imgBlock(serieImg)] : []),
          { type: "text", text: "PHOTO GÉNÉRÉE à vérifier :" },
          imgBlock(photo),
          {
            type: "text",
            text:
              "Compare l'article porté sur la photo générée à la référence, point par point. Compte les boutons, poches, fermetures.\n" +
              `Points clés :\n- ${brief.points_cles.join("\n- ")}\n` +
              `À éviter :\n- ${brief.a_eviter.join("\n- ")}\n` +
              `Règles à faire respecter :\n- ${REGLES_FR.join("\n- ")}\n` +
              (serieImg ? "Vérifie aussi que l'article est identique à la photo déjà validée (même couleur, mêmes détails).\n" : "") +
              "Ignore le reste de la tenue, la pose et le décor. Une petite différence de lumière n'est pas un écart. " +
              "Les détails cachés par la pose ou le téléphone ne sont pas des écarts.",
          },
        ],
      },
    ],
  });
  if (!r.parsed_output) return { conforme: true, ecarts: [], correction_en: "" };
  return r.parsed_output;
}
