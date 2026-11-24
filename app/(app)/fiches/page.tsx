import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Fiches"
      step={4}
      items={[
        "Connecteur Claude Cowork : chaque fiche créée par Cowork arrive ici automatiquement",
        "Photos, titre, description, prix, prix d'achat, lien(s) produit, statut brouillon / en ligne",
        "Saisie et correction à la main, boutons Copier",
        "« Vendu » transforme la fiche en vente",
      ]}
    />
  );
}
