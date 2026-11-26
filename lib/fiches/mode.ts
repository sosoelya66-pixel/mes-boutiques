// Modes de génération : du moins cher (Éco) au plus fidèle (Max).
export type Mode = "eco" | "equilibre" | "max";

export const MODES: { value: Mode; label: string; aide: string }[] = [
  { value: "eco", label: "💰 Éco", aide: "Claude Haiku, photos qualité moyenne, sans vérification. Le moins cher." },
  { value: "equilibre", label: "⚖️ Équilibré", aide: "Claude Sonnet, photos qualité moyenne, vérification sans 2e essai." },
  { value: "max", label: "💎 Max", aide: "Claude Opus, photos qualité haute, vérification et 2e essai si écart. Le plus cher." },
];

export const REGLAGES: Record<Mode, { claude: string; qualite: "low" | "medium" | "high"; verifier: boolean; essais: number }> = {
  eco: { claude: "claude-haiku-5-5", qualite: "medium", verifier: false, essais: 1 },
  equilibre: { claude: "claude-sonnet-5-5", qualite: "medium", verifier: true, essais: 1 },
  max: { claude: "claude-opus-5-5", qualite: "high", verifier: true, essais: 2 },
};

export const modeValide = (m: unknown): Mode => (m === "equilibre" || m === "max" ? m : "eco");
