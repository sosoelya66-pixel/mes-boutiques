"use client";

import { useEffect, useState } from "react";
import { useStudio } from "@/components/Studio";
import { Card } from "@/components/ui/Card";
import { ErrorBox, Skeleton } from "@/components/ui/Skeleton";
import { loadConso, saveReglages, type Conso } from "@/lib/data";
import { euros2, jourParis } from "@/lib/format";
import { GOOGLE_COUT_REQUETE, GOOGLE_GRATUIT_MOIS } from "@/lib/lille";
import type { Reglages } from "@/lib/types";

export default function ReglagesPage() {
  const { reglages, ready, error, setReglagesLocal } = useStudio();
  const [f, setF] = useState<Reglages | null>(null);
  const [conso, setConso] = useState<Conso[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (reglages) setF(reglages);
  }, [reglages]);
  useEffect(() => {
    loadConso(jourParis().slice(0, 8) + "01").then(setConso).catch(() => {});
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!ready || !f) return <Skeleton />;

  const today = jourParis();
  const google = conso.filter((c) => c.service === "google_places");
  const moisReq = google.reduce((a, c) => a + c.requetes, 0);
  const jourReq = google.find((c) => c.jour === today)?.requetes ?? 0;
  const payantes = Math.max(0, moisReq - GOOGLE_GRATUIT_MOIS);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveReglages(f!);
      setReglagesLocal(f!);
      setMsg("Enregistré ✓");
    } catch (e) {
      setMsg((e as Error).message);
    }
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Toi">
        <form onSubmit={save} className="space-y-4">
          <label className="label">
            Ton prénom (pour « Bonsoir, … »)
            <input className="input mt-1.5" value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} />
          </label>
          <label className="label">
            Recherches Google maximum par jour
            <input
              type="number"
              min={0}
              max={500}
              className="input mt-1.5"
              value={f.limite_google_jour}
              onChange={(e) => setF({ ...f, limite_google_jour: Math.max(0, Number(e.target.value) || 0) })}
            />
            <span className="mt-1 block text-xs">
              Soit {euros2(f.limite_google_jour * GOOGLE_COUT_REQUETE)} par jour au maximum, une fois les {GOOGLE_GRATUIT_MOIS} recherches gratuites du mois utilisées.
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button className="btn-primary">Enregistrer</button>
            {msg && <span className="text-sm text-champagne">{msg}</span>}
          </div>
        </form>
      </Card>

      <Card title="Coûts du mois" right="estimation">
        <div className="grid grid-cols-2 gap-3">
          <Mini label="Recherches Google aujourd'hui" value={`${jourReq} / ${f.limite_google_jour}`} />
          <Mini label="Recherches Google ce mois" value={String(moisReq)} />
          <Mini label="Gratuites restantes" value={String(Math.max(0, GOOGLE_GRATUIT_MOIS - moisReq))} />
          <Mini label="Coût estimé ce mois" value={euros2(payantes * GOOGLE_COUT_REQUETE)} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Google facture environ 0,03 € par recherche (20 commerces avec téléphone et site), après {GOOGLE_GRATUIT_MOIS} recherches gratuites
          chaque mois. Le coût de Claude s'ajoutera ici à l'étape 2.
        </p>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
