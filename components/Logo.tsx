/** Logo « Mes boutiques » : trois barres qui montent (commandes, chiffre d'affaires, bénéfice). */
export function Logo({ size = 32, withBg = true }: { size?: number; withBg?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      {withBg && <rect width="64" height="64" rx="16" fill="#191a2b" stroke="#262838" strokeWidth="1.5" />}
      <rect x="14" y="35" width="9" height="15" rx="3" fill="#4d8af0" />
      <rect x="27.5" y="26" width="9" height="24" rx="3" fill="#8b7cf6" />
      <rect x="41" y="15" width="9" height="35" rx="3" fill="#4fd18b" />
    </svg>
  );
}
