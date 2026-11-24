"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { buildMock } from "@/lib/mock";
import type { Listing, Sale, Shop } from "@/lib/types";

type State = {
  shops: Shop[];
  sales: Sale[]; // filtrées selon la boutique choisie
  listings: Listing[]; // idem
  allSales: Sale[];
  shopId: string; // "all" ou l'id d'une boutique
  setShopId: (id: string) => void;
  shopById: (id: string) => Shop | undefined;
};

const Ctx = createContext<State | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // Étape 1 : données d'exemple. Étape 2 : elles viendront de Supabase.
  const data = useMemo(() => buildMock(), []);
  const [shopId, setShopIdState] = useState("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("shopId");
      if (saved && (saved === "all" || data.shops.some((s) => s.id === saved))) setShopIdState(saved);
    } catch {}
  }, [data.shops]);

  const setShopId = (id: string) => {
    setShopIdState(id);
    try {
      localStorage.setItem("shopId", id);
    } catch {}
  };

  const value = useMemo<State>(() => {
    const keep = <T extends { shop_id: string }>(x: T) => shopId === "all" || x.shop_id === shopId;
    return {
      shops: data.shops,
      sales: data.sales.filter(keep),
      listings: data.listings.filter(keep),
      allSales: data.sales,
      shopId,
      setShopId,
      shopById: (id) => data.shops.find((s) => s.id === id),
    };
  }, [data, shopId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState hors du provider");
  return v;
}
