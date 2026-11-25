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
const VINTED = ["vinted.fr", "vinted.com", "vinted.be", "vinted.es", "vinted.it", "vinted.de", "vinted.co.uk"];

const Produit = z.object({
  titre: z.string().describe("Nom court et clair du produit, en français"),
  plateforme: z.enum(["temu", "shein", "autre"]),
  lien: z.string().describe("URL exacte de la page produit, telle que trouvée dans les résultats"),
  image: z.string().nullable().describe("URL d'une image du produit si elle apparaît dans les résultats, sinon null"),
  categorie: z.string(),
  prix_achat: z.number().describe("Prix d'achat en euros : celui vu dans les résultats si possible, sinon le prix habituel de ce produit sur la plateforme"),
  prix_source: z
    .enum(["page", "recherche", "estime"])
    .describe("page = lu sur la page produit ; recherche = vu dans un résultat de recherche ; estime = prix habituel estimé"),
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
  const ville = p.ville?.trim() || "Lille";
  const consigne = p.lien
    ? `Analyse ce produit : ${p.lien}\n${p.prix ? `Prix affiché (donné par la vendeuse) : ${p.prix} €.\n` : ""}Ouvre la page (web_fetch) ou cherche-le. Donne son nom, son prix, une image, et estime à combien il se revend sur Vinted.`
    : [
        "Trouve 8 produits à acheter sur Temu ou Shein pour les revendre sur Vinted en France avec une bonne marge.",
        p.categorie ? `Catégorie demandée : ${p.categorie}.` : "Vêtements et accessoires femme qui se revendent bien sur Vinted.",
        p.budget_max ? `Prix d'achat maximum : ${p.budget_max} €.` : "",
        "Cherche les pages produit sur temu.com et shein.com (ex. requêtes « site:temu.com sac femme », « shein robe pull »). Les pages Temu/Shein cachent souvent leurs prix : cherche le prix dans les extraits des résultats, dans des comparatifs ou bons plans ; à défaut, indique le prix habituel de ce type de produit sur la plateforme et précise-le.",
        "Pour chaque produit : nom, lien exact de la page produit (temu.com ou shein.com), prix d'achat et sa source (page, résultat de recherche ou estimation), image si visible, et prix de revente réaliste sur Vinted (bas, haut, moyen).",
        "OBLIGATOIRE : le prix de revente moyen doit être au moins 2 fois le prix d'achat (×2 minimum, idéalement ×2,5 ou plus). Écarte tout produit en dessous.",
        "Privilégie : produits tendance cette saison, faciles à photographier portés.",
        `Livraison : ${ville}, France. Ne propose que des produits disponibles et livrables à ${ville} (pages temu.com/fr et fr.shein.com, prix en euros).`,
        "Pour chaque produit, note l'URL de son image principale si tu la vois (images sur img.kwcdn.com pour Temu, img.ltwebstatic.com pour Shein).",
      ]
        .filter(Boolean)
        .join("\n");
  const system = [
    "Tu aides une vendeuse Vinted (France) à trouver des produits à revendre.",
    "Les produits proposés doivent avoir un lien de page produit temu.com ou shein.com vu dans les résultats. N'invente aucun lien. Pour le prix d'achat, dis toujours s'il a été vu ou s'il est estimé.",
    "Ne consulte jamais Vinted.",
    "Le prix de revente Vinted est une estimation : base-toi sur ta connaissance du marché de la seconde main et sur ses ventes réelles ci-dessous.",
    `Ses boutiques :\n${ctx.lignesShops || "(aucune)"}`,
    `Ses dernières ventes réelles :\n${ctx.ventes || "(pas encore de ventes)"}`,
  ].join("\n\n");

  const tools: Anthropic.Messages.ToolUnion[] = [
    // Recherche ouverte (pour trouver les prix dans les extraits), jamais sur Vinted
    { type: "web_search_20260209", name: "web_search", max_uses: p.lien ? 3 : 10, blocked_domains: VINTED, user_location: { type: "approximate", country: "FR", city: ville, region: ville === "Lille" ? "Hauts-de-France" : undefined, timezone: "Europe/Paris" } },
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
      output_config: { effort: "medium" },
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
        content: `Boutiques :\n${ctx.lignesShops}\n\nTransforme ce compte rendu de recherche en liste de produits. Garde les produits qui ont un lien de page produit temu.com ou shein.com et un prix d'achat (vu ou estimé, en précisant prix_source).\n\n${texte}`,
      },
    ],
  });
  if (!r.parsed_output) throw new Error("Résultat illisible.");
  return r.parsed_output;
}

/** Image principale d'une page Temu / Shein (balise og:image ou image de leur CDN). */
async function imageFor(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 2_000_000);
    const meta =
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)?.[1];
    const cdn = html.match(/https:\/\/(?:img\.kwcdn\.com|aimg\.kwcdn\.com|img\.ltwebstatic\.com)\/[^"'\s\\)]+?\.(?:jpe?g|png|webp)/i)?.[0];
    const img = (meta ?? cdn ?? "").replace(/&amp;/g, "&");
    return /^https:\/\//.test(img) ? img : null;
  } catch {
    return null;
  }
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
      .filter(
        (x) =>
          [...urls].some((u) => sameProduct(u, x.lien)) &&
          /^https:\/\/([a-z0-9-]+\.)*(temu|shein)\.com\//i.test(x.lien) &&
          x.prix_achat > 0
      )
      .map((x) => ({
        ...x,
        // Prix tapé par l'utilisateur : il fait foi
        ...(p.lien && p.prix && sameProduct(p.lien, x.lien) ? { prix_achat: p.prix, prix_source: "page" as const } : {}),
        image: x.image && /^https:\/\//.test(x.image) ? x.image : null,
      }))
      .map((x) => ({
        ...x,
        marge: Math.round((x.revente_conseillee - x.prix_achat) * 100) / 100,
        multiplicateur: Math.round((x.revente_conseillee / x.prix_achat) * 10) / 10,
      }))
      .filter((x) => x.multiplicateur >= 2) // au moins ×2
      .sort((a, b) => b.marge - a.marge);
    // Photo manquante : on la lit sur la page produit (en parallèle, 8 s max)
    await Promise.all(produits.map(async (x) => {
      if (!x.image) x.image = await imageFor(x.lien);
    }));
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
