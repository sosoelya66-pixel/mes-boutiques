"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { runSyncNow } from "@/lib/data";
import { useAppState } from "./AppState";

const TABS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/ventes", label: "Ventes et bordereaux" },
  { href: "/compta", label: "Compta" },
  { href: "/fiches", label: "Fiches" },
  { href: "/boutiques", label: "Boutiques" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Mes boutiques</h1>
        <div className="flex items-center gap-2">
          <SyncButton />
          <ShopSelector />
          <UserMenu />
        </div>
      </div>
      <nav className="no-scrollbar -mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "border-white text-white" : "border-transparent text-muted hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
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
