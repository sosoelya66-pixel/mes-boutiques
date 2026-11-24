"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { Dot } from "@/components/Header";
import { SaleModal } from "@/components/SaleModal";
import { loadSyncInfo, markLogHandled, runSyncNow } from "@/lib/data";
import type { EmailLog, SyncState } from "@/lib/types";

const STATUT: Record<EmailLog["statut"], { label: string; cls: string }> = {
  traite: { label: "Traité", cls: "bg-profit/15 text-profit" },
  ignore: { label: "Ignoré", cls: "bg-white/10 text-muted" },
  a_verifier: { label: "À vérifier", cls: "bg-alert/15 text-alert" },
  erreur: { label: "Erreur", cls: "bg-down/15 text-down" },
};

const TYPES: Record<string, string> = {
  vente: "Vente",
  bordereau: "Bordereau",
  envoi: "Envoi",
  livraison: "Livraison",
  paiement: "Paiement",
  autre: "Autre",
};

export function SyncPanel() {
  const { shopById, allSales, refresh } = useAppState();
  const [log, setLog] = useState<EmailLog[]>([]);
  const [state, setState] = useState<SyncState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [openSale, setOpenSale] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await loadSyncInfo();
      setLog(r.log);
      setState(r.state);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await runSyncNow();
      setMessage(r.message);
    } catch (e) {
      setMessage("Erreur : " + (e as Error).message);
    } finally {
      await Promise.all([load(), refresh()]);
      setBusy(false);
    }
  }

  const issues = log.filter((l) => l.statut === "a_verifier" || l.statut === "erreur");
  const shown = onlyIssues ? issues : log;
  const sale = allSales.find((s) => s.id === openSale);

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Synchro e-mails Vinted</h2>
          <p className="mt-1 text-sm text-muted">
            Boîte iCloud lue en lecture seule, toutes les 15 min. Dernière synchro :{" "}
            <span className="text-white">
              {state?.derniere_synchro ? new Date(state.derniere_synchro).toLocaleString("fr-FR") : "jamais"}
            </span>
          </p>
          {state?.derniere_erreur && <p className="mt-1 text-sm text-alert">Dernière erreur : {state.derniere_erreur}</p>}
          {error && <p className="mt-1 text-sm text-alert">{error}</p>}
          {message && <p className={`mt-1 text-sm ${message.startsWith("Erreur") ? "text-alert" : "text-profit"}`}>{message}</p>}
        </div>
        <button className="btn-primary" onClick={sync} disabled={busy}>
          <span className={busy ? "inline-block animate-spin" : ""}>⟳</span> {busy ? "Synchro…" : "Synchroniser"}
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Journal ({log.length} derniers e-mails)</span>
        <button
          onClick={() => setOnlyIssues(!onlyIssues)}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            onlyIssues ? "border-alert bg-alert text-night" : "border-line text-muted hover:text-white"
          }`}
        >
          À vérifier ({issues.length})
        </button>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {shown.length === 0 && <li className="py-6 text-center text-sm text-muted">Aucun e-mail pour l&apos;instant.</li>}
        {shown.map((l) => {
          const shop = shopById(l.shop_id);
          const st = STATUT[l.statut];
          return (
            <li key={l.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                {l.type && <span className="text-xs text-muted">{TYPES[l.type] ?? l.type}</span>}
                {shop && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Dot color={shop.couleur} size={7} /> {shop.nom}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted">
                  {l.recu_le ? new Date(l.recu_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : ""}
                </span>
              </div>
              <div className="mt-1 truncate font-medium">{l.sujet || "(sans sujet)"}</div>
              {l.detail && <div className="mt-0.5 text-xs text-muted">{l.detail}</div>}
              {(l.sale_id || l.statut === "a_verifier" || l.statut === "erreur") && (
                <div className="mt-2 flex gap-2">
                  {l.sale_id && (
                    <button className="btn px-2.5 py-1 text-xs" onClick={() => setOpenSale(l.sale_id)}>
                      Ouvrir la vente
                    </button>
                  )}
                  {(l.statut === "a_verifier" || l.statut === "erreur") && (
                    <button
                      className="btn px-2.5 py-1 text-xs"
                      onClick={async () => {
                        await markLogHandled(l.id);
                        await load();
                      }}
                    >
                      Marquer traité
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {sale && <SaleModal sale={sale} onClose={() => setOpenSale(null)} />}
    </section>
  );
}
