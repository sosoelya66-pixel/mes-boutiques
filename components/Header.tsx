"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { runSyncNow } from "@/lib/data";
import { Logo } from "./Logo";
import { useAppState } from "./AppState";

const TABS = [
  { href: "/aujourdhui", label: "Aujourd'hui" },
  { href: "/", label: "Tableau de bord" },
  { href: "/ventes", label: "Ventes et bordereaux" },
  { href: "/fiches", label: "Fiches" },
  { href: "/compta", label: "Compta" },
  { href: "/analyses", label: "Analyses" },
  { href: "/boutiques", label: "Boutiques" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function Header() {
  const pathname = usePathname();
  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/aujourdhui" className="flex min-w-0 items-center gap-2.5">
          <Logo size={34} />
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-[28px]">Mes boutiques</h1>
        </Link>
        <div className="flex items-center gap-2">
          <SyncButton />
          <ShopSelector />
          <span className="hidden md:block">
            <UserMenu />
          </span>
        </div>
      </div>
      {/* Onglets du haut : ordinateur et tablette */}
      <nav className="no-scrollbar mt-5 hidden gap-1 overflow-x-auto border-b border-line md:flex">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(pathname, t.href) ? "border-white text-white" : "border-transparent text-muted hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <BottomNav />
    </header>
  );
}

/* ---------- Barre d'onglets du bas (téléphone) ---------- */

const ICONS: Record<string, React.ReactNode> = {
  today: <path d="M4 7h16M4 12h10M4 17h7M17 15l2 2 4-4" />,
  dash: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  sales: <path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" />,
  fiches: <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { allSales, logout } = useAppState();
  const [more, setMore] = useState(false);
  const toShip = allSales.filter((s) => s.statut === "a_envoyer").length;
  const items = [
    { href: "/aujourdhui", label: "Aujourd'hui", icon: "today" },
    { href: "/", label: "Tableau", icon: "dash" },
    { href: "/ventes", label: "Ventes", icon: "sales", badge: toShip },
    { href: "/fiches", label: "Fiches", icon: "fiches" },
  ];
  const moreActive = ["/compta", "/analyses", "/boutiques"].some((h) => pathname.startsWith(h));

  useEffect(() => setMore(false), [pathname]);

  return (
    <>
      {more && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMore(false)}>
          <div
            className="pb-safe absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-card p-3"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { href: "/compta", label: "Compta" },
              { href: "/analyses", label: "Analyses" },
              { href: "/boutiques", label: "Boutiques et synchro" },
              { href: "/boutiques#notifications", label: "Notifications" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block rounded-xl px-4 py-3.5 text-[15px] hover:bg-white/5">
                {l.label}
              </Link>
            ))}
            <button onClick={logout} className="block w-full rounded-xl px-4 py-3.5 text-left text-[15px] text-muted hover:bg-white/5">
              Se déconnecter
            </button>
            <div className="h-16" />
          </div>
        </div>
      )}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-line bg-night/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {items.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium ${
                  active ? "text-white" : "text-muted"
                }`}
              >
                <Icon name={it.icon} />
                {it.label}
                {!!it.badge && (
                  <span className="absolute left-1/2 top-1.5 ml-2 min-w-[18px] rounded-full bg-alert px-1 text-center text-[10px] font-bold leading-[18px] text-night">
                    {it.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMore(!more)}
            className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium ${
              more || moreActive ? "text-white" : "text-muted"
            }`}
          >
            <Icon name="more" />
            Plus
          </button>
        </div>
      </nav>
    </>
  );
}

function SyncButton() {
  const { refresh } = useAppState();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await runSyncNow();
      setMsg({ text: r.message, error: r.message.startsWith("Erreur") });
      await refresh();
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={run}
        disabled={busy}
        title="Synchroniser les e-mails Vinted"
        className="flex h-9 items-center gap-2 rounded-xl border border-line bg-card px-3 text-sm text-muted hover:border-white/20 hover:text-white disabled:opacity-60"
      >
        <span className={busy ? "inline-block animate-spin" : ""}>⟳</span>
        <span className="hidden sm:inline">{busy ? "Synchro…" : "Synchroniser"}</span>
      </button>
      {msg && (
        <div
          onClick={() => setMsg(null)}
          className={`absolute right-0 z-40 mt-2 w-72 cursor-pointer rounded-xl border bg-card p-3 text-sm shadow-lg shadow-black/30 ${
            msg.error ? "border-alert/40 text-alert" : "border-line text-white"
          }`}
        >
          {msg.text}
          <div className="mt-1 text-xs text-muted">Détails dans Boutiques → Synchro e-mails</div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { userEmail, logout } = useAppState();
  return (
    <button
      onClick={logout}
      title={userEmail ? `Connecté : ${userEmail} — se déconnecter` : "Se déconnecter"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-muted hover:border-white/20 hover:text-white"
      aria-label="Se déconnecter"
    >
      ⏻
    </button>
  );
}

function ShopSelector() {
  const { shops, shopId, setShopId } = useAppState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { allShops } = useAppState();
  const current = allShops.find((s) => s.id === shopId);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const item = (id: string, label: string, color?: string) => (
    <button
      key={id}
      onClick={() => {
        setShopId(id);
        setOpen(false);
      }}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 ${
        shopId === id ? "text-white" : "text-muted"
      }`}
    >
      <Dot color={color} />
      <span className="flex-1">{label}</span>
      {shopId === id && <span className="text-xs">✓</span>}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-medium hover:border-white/20"
      >
        <Dot color={current?.couleur} />
        {current ? current.nom : "Toutes"}
        <span className="text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-line bg-card p-1.5 shadow-lg shadow-black/30">
          {item("all", "Toutes")}
          {shops.map((s) => item(s.id, s.nom, s.couleur))}
          <div className="my-1 h-px bg-line" />
          <Link
            href="/boutiques"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-white"
          >
            <span className="w-2.5 text-center">+</span> Ajouter
          </Link>
        </div>
      )}
    </div>
  );
}

export function Dot({ color, size = 10 }: { color?: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: color ?? "conic-gradient(#8b7cf6 0 33%, #f0a04d 33% 66%, #4d8af0 66% 100%)",
      }}
    />
  );
}
