import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Fiches"
      step={4}
      items={[
        "Dépôt des photos, choix de la boutique (la taille suit la boutique)",
        "Marque, état, prix d'achat, notes",
        "Claude rédige titre, description, catégorie, couleur, matière et prix conseillé",
        "Boutons Copier et « Copier tout », « Vendu » transforme la fiche en vente",
      ]}
    />
  );
}
