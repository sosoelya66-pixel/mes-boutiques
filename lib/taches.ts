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

// Une habitude différente selon le jour de la semaine (0 = dimanche)
const HABITUDES: Record<number, TacheInput> = {
  0: { cle: "habitude", type: "habitude", titre: "Prépare ta semaine : choisis 5 produits à sourcer", detail: "Regarde Analyses → articles les plus rentables.", lien: "/analyses", ordre: 90 },
  1: { cle: "habitude", type: "habitude", titre: "Fais le bilan de la semaine dernière", detail: "Analyses → 30 jours : marge, meilleur jour, fiches qui dorment.", lien: "/analyses", ordre: 90 },
  2: { cle: "habitude", type: "habitude", titre: "Tourne 1 vidéo TikTok", detail: "Montre un colis du jour ou ton tableau de bord.", lien: null, ordre: 90 },
  3: { cle: "habitude", type: "habitude", titre: "Réponds à toutes les offres et messages Vinted", detail: null, lien: null, ordre: 90 },
  4: { cle: "habitude", type: "habitude", titre: "Refais la 1re photo d'une annonce qui ne vend pas", detail: "La première photo fait la majorité des clics.", lien: "/analyses", ordre: 90 },
  5: { cle: "habitude", type: "habitude", titre: "Prépare tes colis du week-end à l'avance", detail: null, lien: "/ventes?statut=a_envoyer", ordre: 90 },
  6: { cle: "habitude", type: "habitude", titre: "Publie 2 fiches ce matin (le week-end, on navigue plus)", detail: null, lien: "/fiches", ordre: 90 },
};

/** Construit la liste des tâches du jour. */
export function buildTaches(d: Data, now = new Date()): TacheInput[] {
  const t: TacheInput[] = [];
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
    t.push({ cle: "creer", type: "creer", titre: "Créer 3 nouvelles fiches", detail: "Plus d'annonces en ligne = plus de ventes.", lien: "/fiches", ordre: 50 });
  }

  // 6. Annonces qui dorment (les 2 plus anciennes, plus de 21 jours)
  d.listings
    .filter((l) => l.statut === "en_ligne" && now.getTime() - new Date(l.created_at).getTime() > 21 * DAY)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 2)
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

  // 8. Une habitude qui change chaque jour
  t.push(HABITUDES[new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" })).getDay()]);

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
