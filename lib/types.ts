// Les mêmes champs que les tables Supabase (voir supabase/schema.sql).

export type Shop = {
  id: string;
  nom: string; // nom du compte Vinted
  taille: string | null; // S, M, L…
  alias_email: string | null; // ex. moi+boutiqueA@gmail.com
  couleur: string; // couleur de la pastille
  actif: boolean;
  derniere_synchro: string | null;
  // Style photo (avatar, fond, sol) repris par Cowork pour les photos portées
  avatar_url: string | null;
  style_avatar: string | null;
  style_fond: string | null;
  style_sol: string | null;
  /** Prompt ChatGPT personnalisé ({article} = l'article à porter) */
  prompt_photo: string | null;
  created_at: string;
};

export type SaleStatus = "a_envoyer" | "envoye" | "termine";

export type Sale = {
  id: string;
  shop_id: string;
  listing_id: string | null;
  gmail_message_id: string | null; // clé anti-doublon de la synchro Gmail
  titre: string;
  photo_url: string | null;
  prix: number;
  prix_achat: number;
  frais: number;
  acheteur: string | null;
  date_vente: string; // ISO
  statut: SaleStatus;
  bordereau_url: string | null;
  suivi: string | null;
  notes: string | null;
  /** D'où vient le prix : manuel | email (sûr) | fiche (provisoire) | aucun (à compléter) */
  prix_source: "manuel" | "email" | "fiche" | "aucun";
  ref_vinted: string | null;
  created_at: string;
};

export type EmailLog = {
  id: string;
  message_id: string;
  recu_le: string | null;
  expediteur: string | null;
  sujet: string | null;
  type: string | null;
  statut: "traite" | "ignore" | "a_verifier" | "erreur";
  detail: string | null;
  shop_id: string | null;
  sale_id: string | null;
  created_at: string;
};

export type SyncState = {
  derniere_synchro: string | null;
  derniere_erreur: string | null;
  en_cours_depuis: string | null;
};

export type ListingStatus = "brouillon" | "en_ligne" | "vendu";

export type Listing = {
  id: string;
  shop_id: string | null;
  photos: string[];
  titre: string;
  description: string;
  marque: string | null;
  categorie: string | null;
  couleur: string | null;
  matiere: string | null;
  etat: string | null;
  prix: number;
  prix_achat: number;
  liens_produit: string[];
  vinted_url: string | null;
  notes: string | null;
  statut: ListingStatus;
  /** Préparation par Claude en arrière-plan (null pour une fiche classique) */
  generation?: ListingGeneration | null;
  created_at: string;
};

export type ListingGeneration = {
  statut: "en_cours" | "termine" | "erreur";
  etape: string; // texte du suivi, ex. « Photo 2/3 »
  photos_prevues: number;
  photos_faites: number;
  erreurs: string[];
};

export const STATUTS: { value: SaleStatus; label: string }[] = [
  { value: "a_envoyer", label: "À envoyer" },
  { value: "envoye", label: "Envoyé" },
  { value: "termine", label: "Terminé" },
];

export const LISTING_STATUTS: { value: ListingStatus; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_ligne", label: "En ligne" },
  { value: "vendu", label: "Vendu" },
];

export const benefice = (s: Pick<Sale, "prix" | "prix_achat" | "frais">) =>
  s.prix - s.prix_achat - s.frais;
