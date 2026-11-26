export type Statut = "nouveau" | "a_contacter" | "contacte" | "rdv" | "devis" | "signe" | "livre" | "perdu";
export type SiteEtat = "aucun" | "reseau" | "site";

export type Prospect = {
  id: string;
  place_id: string | null;
  nom: string;
  categorie: string | null;
  quartier: string | null;
  adresse: string | null;
  lat: number | null;
  lng: number | null;
  telephone: string | null;
  email: string | null;
  contact_nom: string | null;
  site: string | null;
  site_etat: SiteEtat;
  note_google: number | null;
  nb_avis: number | null;
  maps_url: string | null;
  google_maj: string | null;
  source: "google" | "manuel";
  statut: Statut;
  relance_le: string | null;
  rdv_le: string | null;
  montant: number | null;
  created_at: string;
  updated_at: string;
};

export type Activite = {
  id: string;
  prospect_id: string;
  type: string;
  texte: string;
  created_at: string;
};

export type TachePerso = { id: string; titre: string; jour: string; fait: boolean; fait_le: string | null };

export type Reglages = { prenom: string; ville: string; limite_google_jour: number };

/** Les étapes du suivi client, dans l'ordre */
export const STATUTS: { id: Statut; label: string; court: string; color: string }[] = [
  { id: "nouveau", label: "Repéré", court: "Repéré", color: "#7c776f" },
  { id: "a_contacter", label: "À contacter", court: "À contacter", color: "#d4b483" },
  { id: "contacte", label: "Contacté", court: "Contacté", color: "#4d8af0" },
  { id: "rdv", label: "Rendez-vous", court: "RDV", color: "#8b7cf6" },
  { id: "devis", label: "Devis envoyé", court: "Devis", color: "#f0a04d" },
  { id: "signe", label: "Signé", court: "Signé", color: "#4fd18b" },
  { id: "livre", label: "Site livré", court: "Livré", color: "#ecdcb8" },
  { id: "perdu", label: "Pas intéressé", court: "Perdu", color: "#ff5b6b" },
];
export const statutInfo = (s: Statut) => STATUTS.find((x) => x.id === s) ?? STATUTS[0];

/** Étapes « actives » : le commerce est dans le suivi et pas terminé */
export const EN_COURS: Statut[] = ["a_contacter", "contacte", "rdv", "devis"];

export const SITE_ETATS: Record<SiteEtat, { label: string; color: string }> = {
  aucun: { label: "Sans site", color: "#d4b483" },
  reseau: { label: "Site faible", color: "#f0a04d" },
  site: { label: "A un site", color: "#7c776f" },
};
