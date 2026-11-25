"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadAll } from "@/lib/data";
import { supabase } from "@/lib/supabase/client";
import type { Listing, Sale, Shop } from "@/lib/types";

type State = {
  ready: boolean;
  error: string | null;
  allShops: Shop[]; // y compris les boutiques retirées
  shops: Shop[]; // boutiques actives
  sales: Sale[]; // filtrées selon la boutique choisie
  listings: Listing[]; // idem
  allSales: Sale[];
  allListings: Listing[];
  objectifGlobal: number | null;
  /** Heure du dernier chargement des données */
  loadedAt: Date | null;
  shopId: string; // "all" ou l'id d'une boutique
  setShopId: (id: string) => void;
  shopById: (id: string | null) => Shop | undefined;
  listingById: (id: string | null) => Listing | undefined;
  refresh: () => Promise<void>;
  userEmail: string | null;
  logout: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

type Data = { shops: Shop[]; sales: Sale[]; listings: Listing[]; objectifGlobal: number | null };

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>({ shops: [], sales: [], listings: [], objectifGlobal: null });
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopId, setShopIdState] = useState("all");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await loadAll());
      setLoadedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : JSON.stringify(e));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    try {
      const saved = localStorage.getItem("shopId");
      if (saved) setShopIdState(saved);
    } catch {}
  }, [refresh]);

  const setShopId = useCallback((id: string) => {
    setShopIdState(id);
    try {
      localStorage.setItem("shopId", id);
    } catch {}
  }, []);

  const value = useMemo<State>(() => {
    const activeShops = data.shops.filter((s) => s.actif);
    // Boutique mémorisée qui n'existe plus → « Toutes »
    const sid = shopId === "all" || data.shops.some((s) => s.id === shopId) ? shopId : "all";
    const keep = <T extends { shop_id: string | null }>(x: T) => sid === "all" || x.shop_id === sid;
    return {
      ready,
      error,
      allShops: data.shops,
      shops: activeShops,
      sales: data.sales.filter(keep),
      listings: data.listings.filter(keep),
      allSales: data.sales,
      allListings: data.listings,
      objectifGlobal: data.objectifGlobal,
      loadedAt,
      shopId: sid,
      setShopId,
      shopById: (id) => data.shops.find((s) => s.id === id),
      listingById: (id) => data.listings.find((l) => l.id === id),
      refresh,
      userEmail,
      logout: async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      },
    };
  }, [data, shopId, ready, error, refresh, setShopId, userEmail, loadedAt]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState hors du provider");
  return v;
}
