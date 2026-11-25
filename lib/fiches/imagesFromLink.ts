// Récupère les photos d'un produit Temu / Shein (ou autre) à partir de son lien,
// via l'outil de lecture web de Claude (passe mieux que notre serveur, souvent bloqué).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prepareImage } from "./images";

let client: Anthropic | null = null;

const IMG = /https?:\/\/[^\s"'<>()\\]+?\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>()\\]*)?/gi;
const CDN = /(kwcdn\.com|ltwebstatic\.com|alicdn\.com|aliexpress-media\.com|shein\.com|temu\.com)/i;

function collect(x: unknown, out: Set<string>) {
  if (typeof x === "string") {
    for (const m of x.match(IMG) ?? []) out.add(m.replace(/&amp;/g, "&"));
  } else if (Array.isArray(x)) x.forEach((y) => collect(y, out));
  else if (x && typeof x === "object") Object.values(x).forEach((y) => collect(y, out));
}

/** Renvoie jusqu'à `max` liens d'images lisibles du produit (vérifiés en les téléchargeant). */
export async function imagesFromLink(lien: string, max = 3): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  client ??= new Anthropic();
  try {
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" },
      tools: [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 2, max_content_tokens: 12000 }],
      messages: [
        {
          role: "user",
          content:
            `Ouvre cette page produit avec web_fetch : ${lien}\n` +
            "Relève les adresses (URL) des photos principales du produit (pas les logos ni les autres produits). " +
            "Réponds uniquement avec ces URL, une par ligne, la meilleure en premier.",
        },
      ],
    });
    const urls = new Set<string>();
    // URL citées dans la réponse en premier, puis celles trouvées dans la page lue
    collect(r.content.filter((b) => b.type === "text"), urls);
    collect(r.content.filter((b) => b.type !== "text"), urls);
    const candidats = [...urls].filter((u) => CDN.test(u) && !/logo|icon|sprite|avatar/i.test(u)).slice(0, 12);
    const ok: string[] = [];
    for (const u of candidats) {
      if (ok.length >= max) break;
      const img = await prepareImage(u);
      if (img && img.data.length > 8000) ok.push(u); // ignore les vignettes minuscules
    }
    return ok;
  } catch {
    return [];
  }
}
