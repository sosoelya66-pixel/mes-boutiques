// Lecture d'un e-mail Vinted par Claude : renvoie des données structurées (JSON validé).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";

export const EmailData = z.object({
  type: z
    .enum(["vente", "bordereau", "envoi", "livraison", "paiement", "autre"])
    .describe(
      "vente = un article vient d'être vendu / acheté ; bordereau = étiquette d'envoi à imprimer ; " +
        "envoi = colis déposé ou en cours d'acheminement ; livraison = colis livré ou commande terminée ; " +
        "paiement = argent versé sur le porte-monnaie ; autre = tout le reste (confirmation de compte, promo, message…)"
    ),
  pseudo_vendeur: z.string().nullable().describe("Pseudo Vinted du destinataire de l'e-mail (ex. « Bonjour chloe5999 »)"),
  article: z.string().nullable().describe("Titre de l'article concerné, tel qu'écrit dans l'e-mail"),
  prix: z.number().nullable().describe("Prix de vente de l'article en euros, s'il est écrit (sinon null)"),
  montant_verse: z.number().nullable().describe("Montant versé au vendeur en euros (e-mail de paiement), sinon null"),
  frais: z.number().nullable().describe("Frais à la charge du vendeur en euros, s'il y en a d'écrits, sinon null"),
  acheteur: z.string().nullable().describe("Pseudo de l'acheteur, sans @"),
  ref_commande: z.string().nullable().describe("Numéro de commande / transaction Vinted s'il apparaît"),
  suivi: z.string().nullable().describe("Numéro de suivi du colis"),
  transporteur: z.string().nullable(),
  photo_url: z.string().nullable().describe("Lien de la photo de l'article (parmi les images fournies), sinon null"),
  lien_bordereau: z.string().nullable().describe("Lien pour télécharger le bordereau s'il n'est pas en pièce jointe"),
  resume: z.string().describe("Une phrase en français qui résume l'e-mail"),
});
export type EmailData = z.infer<typeof EmailData>;

const SYSTEM = `Tu lis des e-mails envoyés par Vinted à un vendeur et tu en extrais les informations demandées.
N'invente rien : si une information n'est pas dans l'e-mail, mets null.
Les montants sont des nombres en euros (ex. « 12,50 € » → 12.5).
Ne recopie jamais de code de vérification, de mot de passe ou de lien de connexion, ni dans le résumé ni ailleurs.`;

let client: Anthropic | null = null;

export async function extractEmail(input: {
  sujet: string;
  de: string;
  date: string;
  texte: string;
  liens: string[];
  images: string[];
  pieces_jointes: string[];
}): Promise<EmailData> {
  client ??= new Anthropic(); // lit ANTHROPIC_API_KEY
  const content = [
    `Sujet : ${input.sujet}`,
    `De : ${input.de}`,
    `Date : ${input.date}`,
    `Pièces jointes : ${input.pieces_jointes.join(", ") || "aucune"}`,
    "",
    "--- Texte de l'e-mail ---",
    input.texte,
    "",
    "--- Liens ---",
    ...input.liens,
    "",
    "--- Images ---",
    ...input.images,
  ].join("\n");

  const response = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(EmailData) },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude a refusé de lire cet e-mail.");
  if (!response.parsed_output) throw new Error(`Réponse illisible (arrêt : ${response.stop_reason}).`);
  return response.parsed_output;
}
