import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mes boutiques",
  description: "Tableau de bord de mes boutiques Vinted",
};

export const viewport: Viewport = { themeColor: "#12131f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
