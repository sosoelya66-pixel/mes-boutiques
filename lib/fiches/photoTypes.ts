// Types de photos qu'on peut choisir pour chaque photo d'une fiche.
export const PHOTO_TYPES = [
  { value: "face", label: "Portée · de face", porte: true },
  { value: "trois_quarts", label: "Portée · de trois-quarts", porte: true },
  { value: "dos", label: "Portée · de dos", porte: true },
  { value: "gros_plan", label: "Portée · gros plan détails", porte: true },
  { value: "sol", label: "À plat sur le sol", porte: false },
  { value: "cintre", label: "Sur cintre devant le décor", porte: false },
] as const;

export type PhotoType = (typeof PHOTO_TYPES)[number]["value"];

// 2 photos par défaut (chaque photo générée coûte) ; on peut en ajouter jusqu'à 4
export const DEFAULT_SERIE: PhotoType[] = ["face", "sol"];

export const estPortee = (t: PhotoType) => PHOTO_TYPES.find((x) => x.value === t)?.porte ?? true;

/** Ancien comportement (nombre de photos) : poses portées dans l'ordre */
export const ANCIEN_ORDRE: PhotoType[] = ["face", "trois_quarts", "dos", "gros_plan"];
