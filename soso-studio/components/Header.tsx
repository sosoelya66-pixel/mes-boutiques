"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { logout } from "@/lib/data";
import { Logo } from "./Logo";

const TABS = [
  { href: "/", label: "Ta journée", court: "Journée", icon: "today" },
  { href: "/carte", label: "Carte de prospection", court: "Carte", icon: "map" },
  { href: "/clients", label: "Clients", court: "Clients", icon: "clients" },
  { href: "/reglages", label: "Réglages", court: "Réglages", icon: "settings" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

const ICONS: Record<string, React.ReactNode> = {
  today: <path d="M4 7h16M4 12h10M4 17h7M17 15l2 2 4-4" />,
  map: <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  clients: <path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.85M16 4.15a3.5 3.5 0 010 6.7" />,
  settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Logo size={34} />
          <h1 className="font-display truncate text-2xl font-semibold italic sm:text-[30px]">{BRAND.name}</h1>
        </Link>
        <button
          onClick={logout}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-muted hover:border-white/20 hover:text-white"
        >
          ⏻
        </button>
      </div>
      {/* Onglets du haut : ordinateur et tablette */}
      <nav className="no-scrollbar mt-5 hidden gap-1 overflow-x-auto border-b border-line md:flex">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`relative -mb-px shrink-0 px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(pathname, t.href) ? "text-white" : "text-muted hover:text-white"
            }`}
          >
            {t.label}
            {isActive(pathname, t.href) && <span className="tab-active-line absolute inset-x-2 -bottom-px h-[3px] rounded-full" />}
          </Link>
        ))}
      </nav>
      {/* Barre d'onglets du bas : téléphone */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a0d]/80 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium ${active ? "text-white" : "text-muted"}`}
              >
                <span className={active ? "text-gold drop-shadow-[0_0_8px_rgba(212,180,131,0.8)]" : ""}>
                  <Icon name={t.icon} />
                </span>
                {t.court}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
