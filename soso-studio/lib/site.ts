import type { SiteEtat } from "./types";

// Sites qui ne sont pas un « vrai » site du commerce : réseaux sociaux, annuaires, plateformes de réservation…
const FAIBLES = [
  "facebook.com", "fb.com", "instagram.com", "tiktok.com", "linktr.ee", "linkin.bio", "beacons.ai",
  "pagesjaunes.fr", "planity.com", "treatwell.fr", "kiute.com", "booksy.com", "wavy.co", "salonkee",
  "ubereats.com", "deliveroo.fr", "just-eat.fr", "thefork.fr", "lafourchette.com", "tripadvisor",
  "sites.google.com", "business.site", "wixsite.com", "jimdofree.com", "jimdosite.com", "webnode",
  "e-monsite.com", "over-blog", "wordpress.com", "blogspot.", "mystrikingly.com", "site123.me",
  "solocal", "mappy.com", "google.com", "goo.gl", "g.page",
];

/** Classe le site d'un commerce : aucun, faible (réseau social / annuaire / site gratuit) ou vrai site. */
export function siteEtat(url: string | null | undefined): SiteEtat {
  if (!url) return "aucun";
  const u = url.toLowerCase();
  return FAIBLES.some((d) => u.includes(d)) ? "reseau" : "site";
}

export const domaine = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/.*$/, "");
