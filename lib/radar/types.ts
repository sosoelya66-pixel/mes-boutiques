export type RadarParams = {
  shop_id: string | null;
  categorie: string | null;
  budget_max: number | null;
  lien: string | null; // analyse d'un lien précis
  prix: number | null; // prix affiché, tapé par l'utilisateur (mode lien)
};

export type RadarProduit = {
  titre: string;
  plateforme: "temu" | "shein" | "autre";
  lien: string;
  image: string | null;
  categorie: string;
  prix_achat: number;
  /** page = prix lu sur la page ou tapé ; recherche = vu dans un résultat de recherche ; estime = prix habituel */
  prix_source: "page" | "recherche" | "estime";
  revente_min: number;
  revente_max: number;
  revente_conseillee: number;
  marge: number; // revente conseillée − achat
  multiplicateur: number; // revente conseillée ÷ achat
  boutique_conseillee: string | null;
  pourquoi: string;
  risques: string;
  confiance: "faible" | "moyenne" | "haute";
};

export type RadarRecherche = {
  id: string;
  params: RadarParams;
  statut: "en_cours" | "termine" | "erreur";
  resultats: { produits: RadarProduit[]; resume: string } | null;
  erreur: string | null;
  created_at: string;
};
