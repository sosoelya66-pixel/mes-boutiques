import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Compta"
      step={2}
      items={[
        "Tableau mois par mois sur 12 mois et plus : ventes, CA, achats, frais, bénéfice",
        "Total et graphique en barres",
        "Export CSV et PDF du mois",
      ]}
    />
  );
}
