import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

// Permet d'installer l'appli sur l'écran d'accueil (iPhone : Partager → Sur l'écran d'accueil)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.short,
    description: "Tableau de bord de mes boutiques Vinted",
    start_url: "/aujourdhui",
    display: "standalone",
    background_color: "#12131f",
    theme_color: "#12131f",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
