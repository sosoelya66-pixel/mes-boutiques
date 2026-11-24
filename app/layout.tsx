import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/components/AppState";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mes boutiques",
  description: "Tableau de bord de mes boutiques Vinted",
};

export const viewport: Viewport = { themeColor: "#12131f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <AppStateProvider>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Header />
            {children}
          </div>
        </AppStateProvider>
      </body>
    </html>
  );
}
