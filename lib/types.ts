// Les mêmes champs que les futures tables Supabase (étape 2).

export type Shop = {
  id: string;
  nom: string; // nom du compte Vinted
  taille: string; // S, M, L…
  alias_email: string; // ex. moi+boutiqueA@gmail.com
  couleur: string; // couleur de la pastille
  created_at: string;
};

export type SaleStatus = "a_envoyer" | "envoye" | "termine";

export type Sale = {
  id: string;
  shop_id: string;
  gmail_message_id: string | null; // clé anti-doublon de la synchro Gmail
  titre: string;
  photo_url: string | null;
  prix: number;
  prix_achat: number;
  frais: number;
  acheteur: string;
  date_vente: string; // ISO
  statut: SaleStatus;
  bordereau_url: string | null;
  suivi: string | null;
  created_at: string;
};

export type ListingStatus = "brouillon" | "en_ligne" | "vendu";

export type Listing = {
  id: string;
  shop_id: string;
  photos: string[];
  titre: string;
  description: string;
  categorie: string;
  couleur: string;
  matiere: string;
  etat: string;
  prix: number;
  prix_achat: number;
  statut: ListingStatus;
  created_at: string;
};

export const benefice = (s: Pick<Sale, "prix" | "prix_achat" | "frais">) =>
  s.prix - s.prix_achat - s.frais;
