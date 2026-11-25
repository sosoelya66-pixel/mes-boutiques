export type RadarParams = {
  shop_id: string | null;
  categorie: string | null;
  budget_max: number | null;
  lien: string | null; // analyse d'un lien précis
};

export type RadarProduit = {
  titre: string;
  plateforme: "temu" | "shein" | "autre";
  lien: string;
  image: string | null;
  categorie: string;
  prix_achat: number;
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
