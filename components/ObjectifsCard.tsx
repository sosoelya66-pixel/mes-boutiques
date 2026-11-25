"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { Dot } from "@/components/Header";
import { saveObjectifs } from "@/lib/data";

/** Objectifs de bénéfice mensuel : un global et un par boutique. */
export function ObjectifsCard() {
  const { shops, objectifGlobal, refresh } = useAppState();
  const [global, setGlobal] = useState("");
  const [perShop, setPerShop] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    setGlobal(objectifGlobal != null ? String(objectifGlobal) : "");
    setPerShop(Object.fromEntries(shops.map((s) => [s.id, s.objectif_mensuel != null ? String(s.objectif_mensuel) : ""])));
  }, [objectifGlobal, shops]);

  const num = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const sumShops = Object.values(perShop).reduce((a, v) => a + (num(v) ?? 0), 0);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await saveObjectifs(num(global), Object.fromEntries(Object.entries(perShop).map(([id, v]) => [id, num(v)])));
      await refresh();
      setMsg({ text: "Objectifs enregistrés ✓" });
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="objectifs" className="rise glass rounded-2xl p-5 sm:p-6">
      <h2 className="font-display text-[17px] font-semibold">🎯 Objectifs du mois</h2>
      <p className="mt-1 text-sm text-muted">Bénéfice visé chaque mois. Utilisé par la prévision du tableau de bord.</p>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Toutes les boutiques</span>
          <span className="flex items-center gap-2">
            <input className="input w-28 py-1.5 text-right" inputMode="decimal" placeholder="ex. 800" value={global} onChange={(e) => setGlobal(e.target.value)} />€
          </span>
        </label>
        {shops.map((s) => (
          <label key={s.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Dot color={s.couleur} /> <span className="truncate">{s.nom}</span>
            </span>
            <span className="flex items-center gap-2">
              <input
                className="input w-28 py-1.5 text-right"
                inputMode="decimal"
                placeholder="—"
                value={perShop[s.id] ?? ""}
                onChange={(e) => setPerShop({ ...perShop, [s.id]: e.target.value })}
              />
              €
            </span>
          </label>
        ))}
      </div>
      {sumShops > 0 && (
        <p className="mt-3 text-xs text-muted">
          Total des objectifs par boutique : {sumShops.toLocaleString("fr-FR")} €
          {!num(global) && (
            <button className="ml-2 text-revenue hover:underline" onClick={() => setGlobal(String(sumShops))}>
              utiliser comme objectif global
            </button>
          )}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        {msg ? <span className={`text-sm ${msg.error ? "text-alert" : "text-profit"}`}>{msg.text}</span> : <span />}
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}
