"use client";

import { useEffect, useState } from "react";
import { MODES, modeValide, type Mode } from "@/lib/fiches/mode";

/** Mode Éco / Équilibré / Max, mémorisé sur l'appareil. */
export function useMode(): [Mode, (m: Mode) => void] {
  const [mode, setMode] = useState<Mode>("eco");
  useEffect(() => {
    try {
      setMode(modeValide(localStorage.getItem("mode_generation")));
    } catch {}
  }, []);
  const choisir = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem("mode_generation", m);
    } catch {}
  };
  return [mode, choisir];
}

export function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const actif = MODES.find((m) => m.value === mode)!;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.value}
            onClick={() => onChange(m.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              mode === m.value ? "pill-active" : "border-line bg-card text-muted hover:text-white"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">{actif.aide}</p>
    </div>
  );
}
