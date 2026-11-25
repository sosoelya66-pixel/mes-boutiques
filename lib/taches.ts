// Tâches du jour : calculées chaque matin à partir des données (sans IA, donc gratuit).
import { forecastMonth, shopRates } from "./forecast";
import type { EmailLog, Listing, Sale, Shop } from "./types";

const DAY = 86400000;

export type Tache = {
  id: string;
  jour: string;
  cle: string;
  type: string;
  titre: string;
  detail: string | null;
  lien: string | null;
  ordre: number;
  fait: boolean;
  auto: boolean;
  fait_le: string | null;
};

export type TacheInput = Pick<Tache, "cle" | "type" | "titre" | "detail" | "lien" | "ordre">;

type Data = {
  shops: Shop[];
  sales: Sale[];
  listings: Listing[];
  emailsAVerifier: number;
  objectifGlobal: number | null;
};

/** Date du jour (heure de Paris) au format AAAA-MM-JJ */
export function jourParis(d = new Date()) {
  const p = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
}

const eur = (n: number) => `${Math.round(n)} €`;

// Banque de défis : 3 différents chaque jour, sans répétition sur la semaine
const DEFIS: { titre: string; detail: string | null; lien: string | null }[] = [
  { titre: "Tourne 1 vidéo TikTok : un colis du jour", detail: "Filme l'emballage en 15 secondes.", lien: null },
  { titre: "Tourne 1 vidéo TikTok : ton tableau de bord", detail: "Montre ton bénéfice du mois (tu peux flouter les montants).", lien: "/" },
  { titre: "Tourne 1 vidéo TikTok : avant / après d'une photo", detail: "Photo du produit fournisseur → photo portée.", lien: "/fiches" },
  { titre: "Réponds à toutes les offres et messages Vinted", detail: "Une réponse rapide augmente les ventes.", lien: null },
  { titre: "Refais la 1re photo d'une annonce qui ne vend pas", detail: "La première photo fait la majorité des clics.", lien: "/analyses" },
  { titre: "Baisse de 10 % l'annonce la plus ancienne", detail: "Vinted la remonte dans les recherches.", lien: "/analyses" },
  { titre: "Choisis 3 produits à racheter", detail: "Regarde Analyses → articles les plus rentables.", lien: "/analyses" },
  { titre: "Cherche 2 nouveaux produits fournisseur", detail: "Colle leurs liens dans « ✨ Créer avec Claude ».", lien: "/fiches" },
  { titre: "Vérifie ton stock d'emballages", detail: "Sacs, enveloppes, scotch, étiquettes.", lien: null },
  { titre: "Fais le bilan de la semaine", detail: "Analyses → 30 jours : marge, meilleur jour, fiches qui dorment.", lien: "/analyses" },
  { titre: "Mets à jour la carte d'identité d'une boutique", detail: "Avatar, fond, sol et prompt photo bien à jour.", lien: "/boutiques" },
  { titre: "Ajoute 2 mots-clés recherchés dans tes titres", detail: "Ex. « oversize », « vintage », « tendance ».", lien: "/fiches" },
  { titre: "Poste dans ton Discord : la vente du jour", detail: "Ou une astuce que tu as apprise cette semaine.", lien: null },
  { titre: "Prépare 5 fiches d'avance en brouillon", detail: "Tu n'auras plus qu'à publier demain.", lien: "/fiches" },
  { titre: "Regarde ton objectif du mois", detail: "Tableau de bord → Prévision du mois.", lien: "/" },
  { titre: "Range et photographie 3 articles reçus", detail: null, lien: "/fiches" },
  { titre: "Mets en avant ton meilleur article", detail: "Remonte-le ou change sa photo principale.", lien: "/fiches" },
  { titre: "Vérifie tes ventes sans prix ou sans bordereau", detail: null, lien: "/ventes" },
  { titre: "Publie entre 18 h et 21 h aujourd'hui", detail: "C'est le moment où on navigue le plus sur Vinted.", lien: "/fiches" },
  { titre: "Note 1 idée de produit vue dans une vidéo tendance", detail: null, lien: null },
  { titre: "Compare tes boutiques", detail: "Analyses → comparaison : laquelle a besoin d'un coup de pouce ?", lien: "/analyses" },
];

/** Nombre pseudo-aléatoire stable pour une date (même tirage toute la journée). */
function graine(jour: string) {
  let h = 2166136261;
  for (const c of jour) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const numeroJour = (now: Date) => Math.floor(new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" })).getTime() / DAY);

/** Construit la liste des tâches du jour. */
export function buildTaches(d: Data, now = new Date()): TacheInput[] {
  const t: TacheInput[] = [];
  const rand = graine(jourParis(now));
  const shopName = (id: string | null) => d.shops.find((s) => s.id === id)?.nom ?? "";

  // 1. Colis à envoyer (les plus anciens d'abord)
  d.sales
    .filter((s) => s.statut === "a_envoyer")
    .sort((a, b) => a.date_vente.localeCompare(b.date_vente))
    .slice(0, 10)
    .forEach((s, i) => {
      const jours = Math.floor((now.getTime() - new Date(s.date_vente).getTime()) / DAY);
      t.push({
        cle: `colis:${s.id}`,
        type: "colis",
        titre: `Envoyer le colis : ${s.titre}`,
        detail: `${shopName(s.shop_id)}${s.acheteur ? ` · @${s.acheteur}` : ""}${jours >= 2 ? ` · vendu il y a ${jours} jours` : ""}${s.bordereau_url ? "" : " · bordereau manquant"}`,
        lien: "/aujourdhui",
        ordre: 10 + i,
      });
    });

  // 2. Prix à compléter
  d.sales
    .filter((s) => s.prix_source === "aucun")
    .slice(0, 5)
    .forEach((s, i) =>
      t.push({ cle: `prix:${s.id}`, type: "prix", titre: `Compléter le prix : ${s.titre}`, detail: shopName(s.shop_id), lien: "/ventes?prix=a_completer", ordre: 30 + i })
    );

  // 3. E-mails Vinted à vérifier
  if (d.emailsAVerifier > 0)
    t.push({ cle: "emails", type: "emails", titre: `Vérifier ${d.emailsAVerifier} e-mail${d.emailsAVerifier > 1 ? "s" : ""} Vinted`, detail: "Ventes non reconnues automatiquement.", lien: "/boutiques", ordre: 35 });

  // 4. Fiches en brouillon à publier
  d.listings
    .filter((l) => l.statut === "brouillon" && !(l.generation?.statut === "en_cours"))
    .slice(0, 5)
    .forEach((l, i) =>
      t.push({ cle: `publier:${l.id}`, type: "publier", titre: `Publier la fiche : ${l.titre}`, detail: `sur ${shopName(l.shop_id)}`, lien: `/fiches?fiche=${l.id}`, ordre: 40 + i })
    );

  // 5. Objectif du mois : combien de fiches créer aujourd'hui
  const f = forecastMonth(d.sales, now);
  const manque = d.objectifGlobal ? d.objectifGlobal - f.benefice.prevu : 0;
  const best = d.shops
    .map((s) => ({ s, r: shopRates(d.sales.filter((x) => x.shop_id === s.id), d.listings.filter((x) => x.shop_id === s.id), now) }))
    .filter((c) => c.r.ventes >= 5 && c.r.beneficeMoyen && c.r.tauxVente)
    .sort((a, b) => b.r.beneficeMoyen! * b.r.tauxVente! - a.r.beneficeMoyen! * a.r.tauxVente!)[0];
  if (manque > 0 && best && f.joursRestants > 0) {
    const fichesMois = Math.ceil(manque / best.r.beneficeMoyen! / best.r.tauxVente!);
    const parJour = Math.max(1, Math.ceil(fichesMois / f.joursRestants));
    t.push({
      cle: "creer",
      type: "creer",
      titre: `Créer ${parJour} fiche${parJour > 1 ? "s" : ""} sur ${best.s.nom}`,
      detail: `Il manque ~${eur(manque)} pour l'objectif du mois.`,
      lien: "/fiches",
      ordre: 50,
    });
  } else {
    // Boutique du jour : chacune son tour ; nombre de fiches variable (2 à 5)
    const shop = d.shops.length ? d.shops[numeroJour(now) % d.shops.length] : null;
    const n = 2 + Math.floor(rand() * 4);
    t.push({
      cle: "creer",
      type: "creer",
      titre: `Créer ${n} fiches${shop ? ` sur ${shop.nom}` : ""}`,
      detail: shop ? "Boutique du jour : demain ce sera une autre." : "Plus d'annonces en ligne = plus de ventes.",
      lien: "/fiches",
      ordre: 50,
    });
  }

  // 6. Annonces qui dorment (les 2 plus anciennes, plus de 21 jours)
  d.listings
    .filter((l) => l.statut === "en_ligne" && now.getTime() - new Date(l.created_at).getTime() > 21 * DAY)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    // 2 annonces différentes chaque jour (on fait tourner la liste)
    .filter((_, i, arr) => arr.length <= 2 || [(numeroJour(now) * 2) % arr.length, (numeroJour(now) * 2 + 1) % arr.length].includes(i))
    .forEach((l, i) => {
      const jours = Math.floor((now.getTime() - new Date(l.created_at).getTime()) / DAY);
      const nouveau = Math.max(1, Math.round(l.prix * 0.9));
      t.push({
        cle: `relancer:${l.id}`,
        type: "relancer",
        titre: `Relancer : ${l.titre}`,
        detail: `En ligne depuis ${jours} jours · passe de ${eur(l.prix)} à ${eur(nouveau)} ou refais la 1re photo`,
        lien: `/fiches?fiche=${l.id}`,
        ordre: 60 + i,
      });
    });

  // 7. Colis envoyés depuis plus de 7 jours
  d.sales
    .filter((s) => s.statut === "envoye" && now.getTime() - new Date(s.date_vente).getTime() > 7 * DAY)
    .slice(0, 3)
    .forEach((s, i) =>
      t.push({ cle: `suivi:${s.id}`, type: "suivi", titre: `Vérifier le suivi : ${s.titre}`, detail: s.suivi ? `n° ${s.suivi}` : "envoyé depuis plus de 7 jours", lien: "/aujourdhui", ordre: 70 + i })
    );

  // 8. Trois défis du jour, tirés au sort (différents chaque jour, pas de répétition sur 7 jours)
  const start = (numeroJour(now) % 7) * 3;
  const ordreDefis = [...DEFIS.keys()].sort((a, b) => ((a * 7919) % DEFIS.length) - ((b * 7919) % DEFIS.length));
  for (let k = 0; k < 3; k++) {
    const defi = DEFIS[ordreDefis[(start + k) % DEFIS.length]];
    t.push({ cle: `defi:${defi.titre}`, type: "defi", titre: defi.titre, detail: defi.detail, lien: defi.lien, ordre: 90 + k });
  }

  return t;
}

/** La tâche est-elle faite d'après les données ? (cochage automatique) */
export function resolue(cle: string, d: Pick<Data, "sales" | "listings" | "emailsAVerifier">) {
  const [type, id] = cle.split(":");
  const sale = id ? d.sales.find((s) => s.id === id) : undefined;
  const listing = id ? d.listings.find((l) => l.id === id) : undefined;
  switch (type) {
    case "colis":
      return !!sale && sale.statut !== "a_envoyer";
    case "prix":
      return !!sale && sale.prix_source !== "aucun";
    case "publier":
      return !!listing && listing.statut !== "brouillon";
    case "suivi":
      return !!sale && sale.statut === "termine";
    case "emails":
      return d.emailsAVerifier === 0;
    default:
      return false;
  }
}

export const aVerifier = (log: Pick<EmailLog, "statut">[]) => log.filter((l) => l.statut === "a_verifier" || l.statut === "erreur").length;
