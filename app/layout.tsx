import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Playfair Display incluse dans le projet (pas de téléchargement pendant la publication)
const playfair = localFont({
  variable: "--font-playfair",
  display: "swap",
  src: [
    { path: "./fonts/playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/playfair-display-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/playfair-display-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/playfair-display-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
  applicationName: BRAND.name,
  appleWebApp: { capable: true, title: BRAND.short, statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0d",
  viewportFit: "cover", // l'appli occupe tout l'écran (encoche comprise) une fois installée
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
