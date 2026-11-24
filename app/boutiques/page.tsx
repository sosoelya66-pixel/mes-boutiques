import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Boutiques"
      step={2}
      items={[
        "Ajouter, modifier ou retirer une boutique (nom, taille, alias e-mail, couleur)",
        "Statut de la synchro Gmail et date de dernière synchro (étape 3)",
      ]}
    />
  );
}
