// Radar produits : Claude cherche sur Temu / Shein (recherche web), puis on structure les résultats.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { humanError } from "@/lib/fiches/errors";
import { sendPush } from "@/lib/push";
import { admin, getOwnerId } from "@/lib/supabase/admin";
import type { RadarParams, RadarProduit } from "./types";

const DOMAINES = ["temu.com", "shein.com"];

const Produit = z.object({
  titre: z.string().describe("Nom court et clair du produit, en français"),
  plateforme: z.enum(["temu", "shein", "autre"]),
  lien: z.string().describe("URL exacte de la page produit, telle que trouvée dans les résultats"),
  image: z.string().nullable().describe("URL d'une image du produit si elle apparaît dans les résultats, sinon null"),
  categorie: z.string(),
  prix_achat: z.number().describe("Prix affiché chez le fournisseur, en euros"),
  revente_min: z.number().describe("Prix de revente bas réaliste sur Vinted, en euros"),
  revente_max: z.number().describe("Prix de revente haut réaliste sur Vinted, en euros"),
  revente_conseillee: z.number().describe("Prix de revente moyen conseillé sur Vinted, en euros"),
  boutique_conseillee: z.string().nullable().describe("Nom exact d'une des boutiques fournies, la plus adaptée, ou null"),
  pourquoi: z.string().describe("Une phrase : pourquoi ce produit peut bien se vendre"),
  risques: z.string().describe("Une phrase : risques (qualité, taille, saison, concurrence…)"),
  confiance: z.enum(["faible", "moyenne", "haute"]),
});
const Resultat = z.object({
  resume: z.string().describe("2 phrases maximum sur la recherche"),
  produits: z.array(Produit),
});

let client: Anthropic | null = null;
const MODEL = () => process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

/** Contexte : boutiques et ce qui se vend déjà chez l'utilisateur (prix réels). */
async function contexte(owner: string, shopId: string | null) {
  const db = admin();
  const { data: shops } = await db
    .from("shops")
    .select("id, nom, taille, style_avatar, style_fond")
    .eq("owner_id", owner)
    .eq("actif", true);
  const { data: sales } = await db
    .from("sales")
    .select("titre, prix, prix_achat, shop_id")
    .eq("owner_id", owner)
    .order("date_vente", { ascending: false })
    .limit(80);
  const lignesShops = (shops ?? [])
    .filter((s) => !shopId || s.id === shopId)
    .map((s) => `- ${s.nom} (taille ${s.taille ?? "?"}) ${s.style_avatar ? `· style : ${s.style_avatar.slice(0, 120)}` : ""}`)
    .join("\n");
  const ventes = (sales ?? [])
    .slice(0, 40)
    .map((v) => `- ${v.titre} : vendu ${v.prix} €, acheté ${v.prix_achat} €`)
    .join("\n");
  return { lignesShops, ventes };
}

function urlsIn(x: unknown, out = new Set<string>()) {
  if (typeof x === "string") return out;
  if (Array.isArray(x)) x.forEach((y) => urlsIn(y, out));
  else if (x && typeof x === "object")
    for (const [k, v] of Object.entries(x)) {
      if (k === "url" && typeof v === "string") out.add(v);
      else urlsIn(v, out);
    }
  return out;
}

const sameProduct = (a: string, b: string) => {
  try {
    const x = new URL(a);
    const y = new URL(b);
    return x.hostname.replace(/^www\.|^fr\./, "") === y.hostname.replace(/^www\.|^fr\./, "") && x.pathname === y.pathname;
  } catch {
    return false;
  }
};

/** Étape 1 : recherche web (Temu / Shein uniquement). Renvoie le compte rendu et les liens réellement trouvés. */
async function rechercher(p: RadarParams, ctx: { lignesShops: string; ventes: string }) {
  client ??= new Anthropic();
  const consigne = p.lien
    ? `Analyse ce produit : ${p.lien}\nOuvre la page (web_fetch). Donne son nom, son prix exact, une image, et estime à combien il se revend sur Vinted.`
    : [
        "Trouve 8 produits à acheter sur Temu ou Shein pour les revendre sur Vinted en France avec une bonne marge.",
        p.categorie ? `Catégorie demandée : ${p.categorie}.` : "Vêtements et accessoires femme qui se revendent bien sur Vinted.",
        p.budget_max ? `Prix d'achat maximum : ${p.budget_max} €.` : "",
        "Pour chaque produit : nom, lien exact de la page produit, prix affiché, image si visible, et prix de revente réaliste sur Vinted (bas, haut, moyen).",
        "Privilégie : multiplicateur d'au moins ×2,5, produits tendance cette saison, faciles à photographier portés.",
      ]
        .filter(Boolean)
        .join("\n");
  const system = [
    "Tu aides une vendeuse Vinted (France) à trouver des produits à revendre.",
    "Utilise uniquement des pages de temu.com ou shein.com. N'invente aucun lien ni aucun prix : ne cite que ce que tu as vu dans les résultats.",
    "Le prix de revente Vinted est une estimation : base-toi sur ta connaissance du marché de la seconde main et sur ses ventes réelles ci-dessous.",
    `Ses boutiques :\n${ctx.lignesShops || "(aucune)"}`,
    `Ses dernières ventes réelles :\n${ctx.ventes || "(pas encore de ventes)"}`,
  ].join("\n\n");

  const tools: Anthropic.Messages.ToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: p.lien ? 2 : 8, allowed_domains: DOMAINES, user_location: { type: "approximate", country: "FR" } },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: p.lien ? 2 : 4, allowed_domains: DOMAINES, max_content_tokens: 8000 },
  ];
  const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: consigne }];
  const urls = new Set<string>(p.lien ? [p.lien] : []);
  let texte = "";
  for (let tour = 0; tour < 4; tour++) {
    const r = await client.messages.create({
      model: MODEL(),
      max_tokens: 8000,
      system,
      tools,
      output_config: { effort: "low" },
      messages,
    });
    if (r.stop_reason === "refusal") throw new Error("Claude a refusé cette recherche.");
    urlsIn(r.content, urls);
    texte += r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    if (r.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: r.content });
  }
  return { texte, urls };
}

/** Étape 2 : mise en forme structurée (sans recherche). */
async function structurer(texte: string, ctx: { lignesShops: string }) {
  client ??= new Anthropic();
  const r = await client.beta.messages.parse({
    model: MODEL(),
    max_tokens: 6000,
    output_config: { effort: "low", format: betaZodOutputFormat(Resultat) },
    messages: [
      {
        role: "user",
        content: `Boutiques :\n${ctx.lignesShops}\n\nTransforme ce compte rendu de recherche en liste de produits. Ne garde que les produits avec un lien et un prix d'achat trouvés dans le texte.\n\n${texte}`,
      },
    ],
  });
  if (!r.parsed_output) throw new Error("Résultat illisible.");
  return r.parsed_output;
}

export async function creerRecherche(p: RadarParams) {
  const owner = await getOwnerId();
  const { data, error } = await admin().from("radar").insert({ owner_id: owner, params: p }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function executerRecherche(id: string) {
  const owner = await getOwnerId();
  const db = admin();
  const { data: row } = await db.from("radar").select("params").eq("id", id).eq("owner_id", owner).single();
  const p = row?.params as RadarParams;
  try {
    const ctx = await contexte(owner, p.shop_id);
    const { texte, urls } = await rechercher(p, ctx);
    const res = await structurer(texte, ctx);
    // Anti-invention : on ne garde que les liens réellement vus par la recherche
    const produits: RadarProduit[] = res.produits
      .filter((x) => [...urls].some((u) => sameProduct(u, x.lien)) && x.prix_achat > 0)
      .map((x) => ({
        ...x,
        image: x.image && /^https:\/\//.test(x.image) ? x.image : null,
        marge: Math.round((x.revente_conseillee - x.prix_achat) * 100) / 100,
        multiplicateur: Math.round((x.revente_conseillee / x.prix_achat) * 10) / 10,
      }))
      .sort((a, b) => b.marge - a.marge);
    await db.from("radar").update({ statut: "termine", resultats: { produits, resume: res.resume } }).eq("id", id);
    await sendPush({
      title: "🔎 Radar terminé",
      body: produits.length ? `${produits.length} produit(s) trouvé(s), jusqu'à +${Math.round(produits[0].marge)} € de bénéfice.` : "Aucun produit fiable trouvé cette fois.",
      url: "/radar",
      tag: `radar-${id}`,
    }).catch(() => 0);
  } catch (e) {
    await db.from("radar").update({ statut: "erreur", erreur: humanError(e, "Claude") }).eq("id", id);
  }
}
