"use client";

// État partagé de l'appli : commerces, réglages, fiche ouverte.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loadProspects, loadReglages } from "@/lib/data";
import type { Prospect, Reglages } from "@/lib/types";
import { ProspectModal } from "./ProspectModal";

type Ctx = {
  prospects: Prospect[];
  reglages: Reglages | null;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setReglagesLocal: (r: Reglages) => void;
  upsertLocal: (p: Prospect) => void;
  removeLocal: (id: string) => void;
  openFiche: (id: string) => void;
};

const StudioCtx = createContext<Ctx | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ficheId, setFicheId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([loadProspects(), loadReglages()]);
      setProspects(p);
      setReglages(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Appli installable (écran d'accueil)
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const upsertLocal = useCallback((p: Prospect) => {
    setProspects((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [p, ...l]));
  }, []);
  const removeLocal = useCallback((id: string) => setProspects((l) => l.filter((x) => x.id !== id)), []);

  const fiche = prospects.find((p) => p.id === ficheId) ?? null;

  return (
    <StudioCtx.Provider
      value={{ prospects, reglages, ready, error, refresh, setReglagesLocal: setReglages, upsertLocal, removeLocal, openFiche: setFicheId }}
    >
      {children}
      {fiche && <ProspectModal prospect={fiche} onClose={() => setFicheId(null)} />}
    </StudioCtx.Provider>
  );
}

export function useStudio() {
  const c = useContext(StudioCtx);
  if (!c) throw new Error("useStudio hors de StudioProvider");
  return c;
}
