import { SITE_ETATS, statutInfo, type SiteEtat, type Statut } from "@/lib/types";

export function StatutBadge({ statut }: { statut: Statut }) {
  const s = statutInfo(statut);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: s.color + "55", color: s.color, background: s.color + "14" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function SiteBadge({ etat }: { etat: SiteEtat }) {
  const s = SITE_ETATS[etat];
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: s.color, background: s.color + "1a" }}>
      {s.label}
    </span>
  );
}

export function Note({ note, nb }: { note: number | null; nb: number | null }) {
  if (note == null) return null;
  return (
    <span className="shrink-0 text-[12px] text-muted">
      <span className="text-gold">★</span> {note.toFixed(1)}
      {nb != null && <span className="text-muted/70"> ({nb})</span>}
    </span>
  );
}
