/** Logo de la marque : trois barres lumineuses qui montent (commandes, chiffre d'affaires, bénéfice). */
export function Logo({ size = 32, withBg = true }: { size?: number; withBg?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#262844" />
          <stop offset="1" stopColor="#15162a" />
        </linearGradient>
        <linearGradient id="logo-b1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb0ff" />
          <stop offset="1" stopColor="#4d8af0" />
        </linearGradient>
        <linearGradient id="logo-b2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b3a8ff" />
          <stop offset="1" stopColor="#8b7cf6" />
        </linearGradient>
        <linearGradient id="logo-b3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ef0bb" />
          <stop offset="1" stopColor="#4fd18b" />
        </linearGradient>
        <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {withBg && <rect width="64" height="64" rx="16" fill="url(#logo-bg)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />}
      <g filter="url(#logo-glow)">
        <rect x="14" y="35" width="9" height="15" rx="3" fill="url(#logo-b1)" />
        <rect x="27.5" y="26" width="9" height="24" rx="3" fill="url(#logo-b2)" />
        <rect x="41" y="15" width="9" height="35" rx="3" fill="url(#logo-b3)" />
      </g>
    </svg>
  );
}
