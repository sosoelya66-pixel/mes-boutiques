"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copier", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Repli pour les navigateurs qui bloquent le presse-papiers
          const t = document.createElement("textarea");
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand("copy");
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className={`shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
        done ? "border-profit/40 text-profit" : "text-muted hover:text-white"
      } ${className}`}
    >
      {done ? "Copié ✓" : label}
    </button>
  );
}
