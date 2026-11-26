// Types de commerces et quartiers de Lille pour la prospection.

export const CATEGORIES = [
  { id: "coiffeur", label: "Coiffeurs", requete: "salon de coiffure" },
  { id: "barbier", label: "Barbiers", requete: "barbier" },
  { id: "institut", label: "Instituts de beauté", requete: "institut de beauté" },
  { id: "ongles", label: "Ongleries", requete: "onglerie prothésiste ongulaire" },
  { id: "restaurant", label: "Restaurants", requete: "restaurant" },
  { id: "boulangerie", label: "Boulangeries", requete: "boulangerie pâtisserie" },
  { id: "fleuriste", label: "Fleuristes", requete: "fleuriste" },
  { id: "tatoueur", label: "Tatoueurs", requete: "salon de tatouage" },
  { id: "artisan", label: "Artisans (plombier, électricien…)", requete: "plombier électricien artisan" },
  { id: "garage", label: "Garages", requete: "garage automobile" },
] as const;
export type CategorieId = (typeof CATEGORIES)[number]["id"];
export const categorieLabel = (id: string | null) => CATEGORIES.find((c) => c.id === id)?.label ?? id ?? "";

// Centre approximatif de chaque quartier (rayon de recherche ~1,2 km)
export const QUARTIERS = [
  { id: "centre", label: "Centre", lat: 50.6365, lng: 3.0635 },
  { id: "vieux-lille", label: "Vieux-Lille", lat: 50.6435, lng: 3.0625 },
  { id: "wazemmes", label: "Wazemmes", lat: 50.6265, lng: 3.0505 },
  { id: "vauban", label: "Vauban-Esquermes", lat: 50.6325, lng: 3.0420 },
  { id: "moulins", label: "Moulins", lat: 50.6215, lng: 3.0700 },
  { id: "fives", label: "Fives", lat: 50.6305, lng: 3.0915 },
  { id: "saint-maurice", label: "Saint-Maurice Pellevoisin", lat: 50.6405, lng: 3.0895 },
  { id: "lille-sud", label: "Lille-Sud", lat: 50.6115, lng: 3.0500 },
  { id: "faubourg-bethune", label: "Faubourg de Béthune", lat: 50.6195, lng: 3.0335 },
  { id: "bois-blancs", label: "Bois-Blancs", lat: 50.6345, lng: 3.0245 },
  { id: "hellemmes", label: "Hellemmes", lat: 50.6265, lng: 3.1095 },
  { id: "lomme", label: "Lomme", lat: 50.6445, lng: 2.9915 },
] as const;
export const LILLE = { lat: 50.6305, lng: 3.0585 };

/** Prix Google (Text Search avec téléphone et site) : ~35 $ les 1 000 requêtes, 1 000 gratuites par mois. */
export const GOOGLE_COUT_REQUETE = 0.033; // en euros, environ
export const GOOGLE_GRATUIT_MOIS = 1000;
