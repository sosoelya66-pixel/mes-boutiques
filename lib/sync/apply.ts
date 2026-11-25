// Applique un e-mail Vinted déjà lu par Claude : crée ou met à jour la vente correspondante.
import "server-only";
import { admin } from "@/lib/supabase/admin";
import type { SaleStatus } from "@/lib/types";
import type { EmailData } from "./extract";
import { containsWord, emailsIn, sameText, titleScore } from "./match";

type ShopRow = { id: string; nom: string; alias_email: string | null };
type SaleRow = {
  id: string;
  shop_id: string;
  listing_id: string | null;
  titre: string;
  acheteur: string | null;
  statut: SaleStatus;
  suivi: string | null;
  ref_vinted: string | null;
  prix: number;
  prix_source: string;
  bordereau_url: string | null;
  photo_url: string | null;
  date_vente: string;
};

export type MailMeta = {
  messageId: string;
  date: Date;
  recipients: string; // en-têtes To / Cc / Delivered-To… concaténés
  text: string;
  pdfs: { filename: string; content: Buffer }[];
};

export type ApplyResult = {
  shop_id: string | null;
  sale_id: string | null;
  statut: "traite" | "ignore" | "a_verifier";
  detail: string;
  /** Renseigné quand une nouvelle vente vient d'être créée (pour la notification) */
  nouvelleVente?: { titre: string; prix: number; boutique: string; prixConnu: boolean };
};

const ORDER: Record<SaleStatus, number> = { a_envoyer: 0, envoye: 1, termine: 2 };
const atLeast = (cur: SaleStatus, next: SaleStatus) => (ORDER[next] > ORDER[cur] ? next : cur);

function findShop(shops: ShopRow[], meta: MailMeta, data: EmailData) {
  const addrs = new Set(emailsIn(meta.recipients));
  const byAlias = shops.find((s) => s.alias_email && addrs.has(s.alias_email.toLowerCase()));
  if (byAlias) return { shop: byAlias, how: "adresse" };
  const byPseudo = shops.find((s) => sameText(s.nom, data.pseudo_vendeur));
  if (byPseudo) return { shop: byPseudo, how: "pseudo" };
  const inText = shops.filter((s) => containsWord(meta.text, s.nom));
  if (inText.length === 1) return { shop: inText[0], how: "pseudo dans le texte" };
  return null;
}

async function uploadPdf(owner: string, pdf: { content: Buffer }) {
  const path = `${owner}/${crypto.randomUUID()}.pdf`;
  const { error } = await admin()
    .storage.from("bordereaux")
    .upload(path, pdf.content, { contentType: "application/pdf" });
  if (error) throw new Error("Envoi du bordereau impossible : " + error.message);
  return path;
}

/** Retrouve la vente concernée par un e-mail de suivi (bordereau, envoi, paiement…). */
function findSale(sales: SaleRow[], data: EmailData) {
  if (data.ref_commande) {
    const s = sales.find((x) => x.ref_vinted === data.ref_commande);
    if (s) return s;
  }
  if (data.suivi) {
    const s = sales.find((x) => x.suivi && x.suivi === data.suivi);
    if (s) return s;
  }
  const scored = sales
    .map((x) => ({
      x,
      score: titleScore(x.titre, data.article) + (sameText(x.acheteur, data.acheteur) ? 0.6 : 0),
    }))
    .filter((c) => c.score >= 0.6)
    .sort((a, b) => b.score - a.score);
  // On refuse de choisir entre deux ventes aussi probables l'une que l'autre
  if (scored.length && (scored.length === 1 || scored[0].score - scored[1].score >= 0.2)) return scored[0].x;
  return null;
}

export async function applyEmail(owner: string, meta: MailMeta, data: EmailData): Promise<ApplyResult> {
  const db = admin();
  const { data: shops, error: e1 } = await db
    .from("shops")
    .select("id, nom, alias_email")
    .eq("owner_id", owner);
  if (e1) throw new Error(e1.message);
  const found = findShop(shops as ShopRow[], meta, data);

  // E-mail sans vente (code, promo…) : ignoré, mais on indique quand même la boutique reconnue
  if (data.type === "autre")
    return {
      shop_id: found?.shop.id ?? null,
      sale_id: null,
      statut: "ignore",
      detail: `${data.resume}${found ? ` · boutique reconnue par ${found.how}` : " · boutique non reconnue"}`,
    };

  if (!found) {
    return {
      shop_id: null,
      sale_id: null,
      statut: "a_verifier",
      detail: `Boutique non reconnue (ni l'adresse de destination ni le pseudo « ${data.pseudo_vendeur ?? "?"} » ne correspondent à une boutique). ${data.resume}`,
    };
  }
  const shop = found.shop;

  // Ventes récentes de la boutique (90 jours)
  const since = new Date(meta.date.getTime() - 90 * 86400000).toISOString();
  const { data: rows, error: e2 } = await db
    .from("sales")
    .select("id, shop_id, listing_id, titre, acheteur, statut, suivi, ref_vinted, prix, prix_source, bordereau_url, photo_url, date_vente")
    .eq("owner_id", owner)
    .eq("shop_id", shop.id)
    .gte("date_vente", since);
  if (e2) throw new Error(e2.message);
  const sales = (rows as SaleRow[]).map((s) => ({ ...s, prix: Number(s.prix) }));

  let sale = data.type === "vente" ? (data.ref_commande ? sales.find((x) => x.ref_vinted === data.ref_commande) ?? null : null) : findSale(sales, data);
  const created = !sale && (data.type === "vente" || data.type === "bordereau");

  if (!sale && !created) {
    return {
      shop_id: shop.id,
      sale_id: null,
      statut: "a_verifier",
      detail: `Vente correspondante introuvable pour « ${data.article ?? "?"} » (${data.type}). ${data.resume}`,
    };
  }

  const patch: Record<string, unknown> = {};

  if (created) {
    // Fiche produit correspondante (pour le prix d'achat et le lien produit)
    const { data: fiches } = await db
      .from("listings")
      .select("id, titre, prix, prix_achat, photos, statut")
      .eq("owner_id", owner)
      .eq("shop_id", shop.id)
      .neq("statut", "vendu");
    const best = (fiches ?? [])
      .map((f) => ({ f, score: titleScore(f.titre, data.article) }))
      .filter((c) => c.score >= 0.5)
      .sort((a, b) => b.score - a.score)[0]?.f;

    const prix = data.prix ?? (best ? Number(best.prix) : 0);
    const insert = {
      owner_id: owner,
      shop_id: shop.id,
      listing_id: best?.id ?? null,
      gmail_message_id: meta.messageId,
      titre: data.article ?? best?.titre ?? "(article à préciser)",
      photo_url: data.photo_url ?? best?.photos?.[0] ?? null,
      prix,
      prix_source: data.prix != null ? "email" : best ? "fiche" : "aucun",
      prix_achat: best ? Number(best.prix_achat) : 0,
      frais: data.frais ?? 0,
      acheteur: data.acheteur,
      date_vente: meta.date.toISOString(),
      statut: "a_envoyer" as SaleStatus,
      suivi: data.suivi,
      ref_vinted: data.ref_commande,
    };
    const { data: ins, error } = await db.from("sales").insert(insert).select("id").single();
    if (error) throw new Error(error.message);
    if (best) await db.from("listings").update({ statut: "vendu" }).eq("id", best.id);
    sale = { ...insert, id: ins.id, bordereau_url: null } as unknown as SaleRow;
  } else if (sale) {
    if (data.ref_commande && !sale.ref_vinted) patch.ref_vinted = data.ref_commande;
    if (data.acheteur && !sale.acheteur) patch.acheteur = data.acheteur;
    if (data.photo_url && !sale.photo_url) patch.photo_url = data.photo_url;
    if (data.prix != null && sale.prix_source !== "email") {
      patch.prix = data.prix;
      patch.prix_source = "email";
    }
  }
  if (!sale) throw new Error("Vente introuvable.");

  if (data.suivi && data.suivi !== sale.suivi) patch.suivi = data.suivi;

  // Bordereau : PDF joint (priorité) ou lien
  if (meta.pdfs.length && (data.type === "bordereau" || data.type === "vente" || !sale.bordereau_url)) {
    patch.bordereau_url = await uploadPdf(owner, meta.pdfs[0]);
  } else if (data.lien_bordereau && !sale.bordereau_url) {
    patch.bordereau_url = data.lien_bordereau;
  }

  // Statut : jamais de retour en arrière
  const next: SaleStatus | null =
    data.type === "envoi" ? "envoye" : data.type === "livraison" || data.type === "paiement" ? "termine" : null;
  if (next && atLeast(sale.statut, next) !== sale.statut) patch.statut = next;

  // Paiement : le montant versé confirme le prix s'il n'était pas déjà connu
  if (data.type === "paiement" && data.montant_verse != null && sale.prix_source !== "email" && patch.prix_source !== "email") {
    patch.prix = data.montant_verse;
    patch.prix_source = "email";
  }

  if (Object.keys(patch).length) {
    const { error } = await db.from("sales").update(patch).eq("id", sale.id);
    if (error) throw new Error(error.message);
  }

  const what = created ? "vente créée" : Object.keys(patch).length ? `vente mise à jour (${Object.keys(patch).join(", ")})` : "rien à changer";
  return {
    shop_id: shop.id,
    sale_id: sale.id,
    statut: "traite",
    detail: `${what} · boutique reconnue par ${found.how}. ${data.resume}`,
    nouvelleVente: created
      ? { titre: sale.titre, prix: Number(patch.prix ?? sale.prix), boutique: shop.nom, prixConnu: (patch.prix_source ?? sale.prix_source) !== "aucun" }
      : undefined,
  };
}
