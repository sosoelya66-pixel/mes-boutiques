// Page de présentation publique (pour TikTok, Discord, et plus tard la vente de l'appli).
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} : ${BRAND.tagline}`,
  description: BRAND.pitch,
};

const FEATURES = [
  { icon: "📈", title: "Tableau de bord en direct", text: "Bénéfice, chiffre d'affaires et commandes de toutes tes boutiques, avec l'évolution jour après jour." },
  { icon: "✉️", title: "Ventes automatiques", text: "Les e-mails de vente sont lus tout seuls : article, acheteur, bordereau, suivi. Zéro saisie." },
  { icon: "📦", title: "Bordereaux en un clic", text: "Tous les bordereaux à envoyer regroupés dans un seul PDF, prêt à imprimer." },
  { icon: "✨", title: "Fiches rédigées par l'IA", text: "Colle un lien produit : titre, description, catégorie et prix conseillé sont prêts à copier." },
  { icon: "📸", title: "Photos portées", text: "Des photos portées avec l'avatar et le décor propres à chaque boutique." },
  { icon: "🧾", title: "Compta sans effort", text: "Mois par mois, export CSV et PDF, marge et délai de vente par catégorie." },
];

const STEPS = [
  { n: "1", title: "Ajoute tes boutiques", text: "Une adresse e-mail par boutique, une couleur, un style photo." },
  { n: "2", title: "Crée tes fiches", text: "Un lien produit suffit : l'IA prépare le texte et les photos." },
  { n: "3", title: "Encaisse", text: "Les ventes arrivent toutes seules, tu imprimes, tu envoies, tu suis tes chiffres." },
];

export default function Decouvrir() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-16">
      {/* En-tête */}
      <header className="pt-safe flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="font-display text-xl font-semibold italic">{BRAND.name}</span>
        </div>
        <Link href="/login" className="btn">
          Se connecter
        </Link>
      </header>

      {/* Accroche */}
      <section className="rise pt-10 text-center sm:pt-16">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-profit shadow-[0_0_8px_#4fd18b]" /> Pour les vendeurs multi-boutiques
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          <span className="font-display bg-gradient-to-r from-[#f3e3bf] via-[#d4b483] to-[#a8803f] bg-clip-text italic text-transparent">{BRAND.tagline}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">{BRAND.pitch}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {BRAND.cta.url && (
            <a href={BRAND.cta.url} className="btn-primary px-6 py-3 text-base" target="_blank" rel="noreferrer">
              {BRAND.cta.label}
            </a>
          )}
          <a href="#fonctions" className="btn px-6 py-3 text-base">
            Voir les fonctions
          </a>
        </div>
      </section>

      {/* Captures */}
      <section className="rise relative mt-14 sm:mt-20">
        <div className="pointer-events-none absolute inset-x-10 -top-10 h-64 rounded-full bg-[#d4b483] opacity-15 blur-3xl" />
        <div className="relative flex items-end justify-center gap-4">
          <img
            src="/presentation/dashboard.webp"
            alt="Tableau de bord"
            className="hidden w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl shadow-black/60 sm:block"
          />
          <img
            src="/presentation/telephone.webp"
            alt="L'appli sur téléphone"
            className="w-56 rounded-[28px] border border-white/10 shadow-2xl shadow-black/60 sm:absolute sm:-bottom-8 sm:right-4 sm:w-52 lg:w-60"
          />
        </div>
        <p className="mt-12 text-center text-xs text-muted sm:mt-14">Captures réalisées avec des données d&apos;exemple.</p>
      </section>

      {/* Fonctions */}
      <section id="fonctions" className="mt-24 scroll-mt-10">
        <h2 className="font-display text-center text-3xl font-semibold">Tout ce qu&apos;il faut, rien de plus</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glow-corner rounded-2xl p-6">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Étapes */}
      <section className="mt-24">
        <h2 className="font-display text-center text-3xl font-semibold">Comment ça marche</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg,#f3e3bf,#b88f52)", color: "#17130c" }}>
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 border-t border-white/10 pt-6 text-center text-xs text-muted">
        {BRAND.name} est un outil indépendant, non affilié à Vinted. Vinted est une marque de Vinted UAB.
      </footer>
    </main>
  );
}
