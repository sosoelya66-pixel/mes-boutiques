"use client";

import { PHOTO_TYPES, type PhotoType } from "@/lib/fiches/photoTypes";

/** Choix du type de chaque photo : « Photo 1 : Portée de face », « Photo 2 : À plat sur le sol »… (4 max) */
export function PhotoTypesPicker({
  value,
  onChange,
  porteePossible = true,
}: {
  value: PhotoType[];
  onChange: (v: PhotoType[]) => void;
  /** false si la boutique n'a pas d'avatar : seules les photos sans personne sont proposées */
  porteePossible?: boolean;
}) {
  const options = PHOTO_TYPES.filter((t) => porteePossible || !t.porte);
  return (
    <div className="space-y-2">
      {value.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-muted">Photo {i + 1}</span>
          <select
            className="input !py-1.5"
            value={t}
            onChange={(e) => onChange(value.map((x, j) => (j === i ? (e.target.value as PhotoType) : x)))}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="shrink-0 px-2 text-lg leading-none text-muted hover:text-white"
            aria-label="Retirer cette photo"
          >
            ×
          </button>
        </div>
      ))}
      {value.length < 4 && (
        <button
          type="button"
          onClick={() => onChange([...value, options.find((o) => !value.includes(o.value))?.value ?? options[0].value])}
          className="text-xs text-revenue hover:underline"
        >
          + Ajouter une photo
        </button>
      )}
      {value.length === 0 && <p className="text-xs text-muted">Aucune photo générée (texte seulement).</p>}
    </div>
  );
}
