// Données d'exemple (étape 1 uniquement) : 2 boutiques, 60 ventes sur 45 jours.
// Les dates sont calculées à partir d'aujourd'hui pour que la démo reste « fraîche ».
import type { Listing, Sale, SaleStatus, Shop } from "./types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export const shops: Shop[] = [
  {
    id: "shop-a",
    nom: "Boutique A",
    taille: "S",
    alias_email: "moi+boutiqueA@gmail.com",
    couleur: "#8b7cf6",
    created_at: "2025-03-01T10:00:00.000Z",
  },
  {
    id: "shop-b",
    nom: "Boutique B",
    taille: "M",
    alias_email: "moi+boutiqueB@gmail.com",
    couleur: "#f0a04d",
    created_at: "2025-06-12T10:00:00.000Z",
  },
];

const articles = [
  "Robe longue fleurie Sézane",
  "Jean mom taille haute Levi's 501",
  "Pull en maille côtelée Zara",
  "Veste en jean oversize Bershka",
  "Baskets Nike Air Force 1 blanches",
  "Sac bandoulière en cuir Mango",
  "Blazer noir cintré H&M",
  "Chemise en lin blanche Uniqlo",
  "Jupe midi plissée satinée",
  "Doudoune légère The North Face",
  "Top dos nu côtelé Pull&Bear",
  "Cardigan vintage en laine mohair",
  "Trench beige classique Promod",
  "Pantalon large fluide Kiabi",
  "Bottines en daim camel",
  "Sweat à capuche Carhartt",
  "Robe pull grise Vero Moda",
  "Combinaison en lin Des Petits Hauts",
];

const pseudos = [
  "lea_vintage", "camille.dressing", "juju75", "marine_b", "sofia.mode",
  "clara-friperie", "ines_k", "manon.style", "chloe_29", "emma.lyon",
  "lucie_dressing", "anais.b", "zoe-closet", "sarah_m", "louise.vtd",
];

const emojis = ["👗", "👖", "🧶", "🧥", "👟", "👜", "🧥", "👔", "👗", "🧥", "👚", "🧶", "🧥", "👖", "👢", "👕", "👗", "👗"];

/** Miniature d'exemple : un carré SVG coloré avec un pictogramme. */
function thumb(i: number, hue: number) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},45%,38%)'/><stop offset='1' stop-color='hsl(${(hue + 40) % 360},50%,22%)'/></linearGradient></defs><rect width='120' height='120' fill='url(#g)'/><text x='60' y='78' font-size='52' text-anchor='middle'>${emojis[i]}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildMock(now = new Date()) {
  const r = rng(42);
  const today = startOfDay(now);
  const sales: Sale[] = [];

  for (let i = 0; i < 60; i++) {
    // Un peu plus de ventes récentes que d'anciennes
    const daysAgo = Math.floor(Math.pow(r(), 1.15) * 45);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(8 + Math.floor(r() * 14), Math.floor(r() * 60));
    if (d > now) d.setTime(now.getTime() - (i + 1) * 7 * 60_000);

    const a = Math.floor(r() * articles.length);
    const prix = Math.round((9 + r() * 38) * 2) / 2;
    const prix_achat = Math.round(prix * (0.15 + r() * 0.35) * 2) / 2;
    const frais = Math.round(r() * 3 * 10) / 10;
    const statut: SaleStatus = daysAgo <= 2 ? "a_envoyer" : daysAgo <= 8 ? "envoye" : "termine";

    sales.push({
      id: `sale-${i}`,
      shop_id: r() < 0.58 ? "shop-a" : "shop-b",
      gmail_message_id: `demo-${i}`,
      titre: articles[a],
      photo_url: thumb(a, Math.floor(r() * 360)),
      prix,
      prix_achat,
      frais,
      acheteur: pseudos[Math.floor(r() * pseudos.length)],
      date_vente: d.toISOString(),
      statut,
      bordereau_url: null,
      suivi: statut === "a_envoyer" ? null : `8R${Math.floor(1e9 + r() * 9e9)}`,
      created_at: d.toISOString(),
    });
  }
  sales.sort((x, y) => y.date_vente.localeCompare(x.date_vente));

  // Fiches créées : 0 à 4 par jour et par boutique
  const listings: Listing[] = [];
  for (let day = 0; day < 46; day++) {
    for (const shop of shops) {
      const n = Math.floor(r() * (shop.id === "shop-a" ? 3.2 : 2.4));
      for (let k = 0; k < n; k++) {
        const d = new Date(today);
        d.setDate(d.getDate() - day);
        d.setHours(9 + Math.floor(r() * 12));
        if (d > now) continue;
        const a = Math.floor(r() * articles.length);
        listings.push({
          id: `listing-${listings.length}`,
          shop_id: shop.id,
          photos: [],
          titre: articles[a],
          description: "",
          categorie: "",
          couleur: "",
          matiere: "",
          etat: "Très bon état",
          prix: 20,
          prix_achat: 5,
          statut: "en_ligne",
          created_at: d.toISOString(),
        });
      }
    }
  }

  return { shops, sales, listings };
}
