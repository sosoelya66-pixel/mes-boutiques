"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { BordereauButton } from "@/components/BordereauButton";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Dot } from "@/components/Header";
import { SaleForm } from "@/components/SaleForm";
import { SaleModal } from "@/components/SaleModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriceBadge } from "@/components/ui/PriceBadge";
import { Thumb } from "@/components/ui/Thumb";
import { updateSale } from "@/lib/data";
import { euros, jourMois, signe } from "@/lib/format";
import { benefice, STATUTS, type Sale, type SaleStatus } from "@/lib/types";

const monthKey = (iso: string) => iso.slice(0, 7); // "2026-11"
const monthLabel = (k: string) =>
  new Date(k + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

export function SalesPage() {
  const { sales, shops, shopId, setShopId, shopById, refresh, ready, error } = useAppState();
  const params = useSearchParams();
  const [statut, setStatut] = useState<SaleStatus | "">((params.get("statut") as SaleStatus) || "");
  const [mois, setMois] = useState("");
  const [sansPrix, setSansPrix] = useState(params.get("prix") === "a_completer");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Sale | null>(null);
  const [form, setForm] = useState<Sale | "new" | null>(null);
  const [printing, setPrinting] = useState(false);

  const months = useMemo(
    () => [...new Set(sales.map((s) => monthKey(new Date(s.date_vente).toISOString())))].sort().reverse(),
    [sales]
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    return sales.filter(
      (s) =>
        (!statut || s.statut === statut) &&
        (!sansPrix || s.prix_source === "aucun") &&
        (!mois || monthKey(new Date(s.date_vente).toISOString()) === mois) &&
        (!needle || s.titre.toLowerCase().includes(needle) || (s.acheteur ?? "").toLowerCase().includes(needle))
    );
  }, [sales, statut, mois, q, sansPrix]);

  const toShip = sales.filter((s) => s.statut === "a_envoyer" && s.bordereau_url);
  const totalCa = list.reduce((a, s) => a + s.prix, 0);
  const totalB = list.reduce((a, s) => a + benefice(s), 0);

  async function printAll() {
    if (!toShip.length) return alert("Aucun bordereau à imprimer pour les colis à envoyer.");
    const w = window.open("", "_blank");
    setPrinting(true);
    try {
      const { mergeBordereaux } = await import("@/lib/print");
      const r = await mergeBordereaux(toShip.map((s) => s.bordereau_url!));
      if (w) w.location.href = r.url;
      else window.location.href = r.url;
      if (r.failed) alert(`${r.failed} bordereau(x) n'ont pas pu être ajoutés.`);
    } catch (e) {
      w?.close();
      alert("Erreur : " + (e as Error).message);
    } finally {
      setPrinting(false);
    }
  }

  async function markSent(s: Sale) {
    await updateSale(s.id, { statut: "envoye" });
    await refresh();
  }

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => setForm("new")} disabled={!shops.length}>
          + Ajouter une vente
        </button>
        <button className="btn" onClick={printAll} disabled={printing}>
          🖨 {printing ? "Préparation…" : `Imprimer tous les bordereaux à envoyer (${toShip.length})`}
        </button>
      </div>

      {/* Filtres */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          className="input"
          placeholder="Rechercher un article ou un acheteur…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input sm:w-48" value={mois} onChange={(e) => setMois(e.target.value)}>
          <option value="">Tous les mois</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <select className="input sm:w-44" value={shopId} onChange={(e) => setShopId(e.target.value)}>
          <option value="all">Toutes les boutiques</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[{ value: "" as const, label: "Tous" }, ...STATUTS].map((x) => (
          <button
            key={x.value}
            onClick={() => setStatut(x.value)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
              statut === x.value ? "border-white bg-white text-night" : "border-line bg-card text-muted hover:text-white"
            }`}
          >
            {x.label}
          </button>
        ))}
        <button
          onClick={() => setSansPrix(!sansPrix)}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
            sansPrix ? "border-alert bg-alert text-night" : "border-line bg-card text-muted hover:text-white"
          }`}
        >
          Prix à compléter
        </button>
      </div>

      <div className="flex justify-between text-sm text-muted">
        <span>
          {list.length} vente{list.length > 1 ? "s" : ""}
        </span>
        <span>
          CA <span className="text-revenue">{euros(totalCa)}</span> · bénéfice{" "}
          <span className="text-profit">{signe(totalB)}</span>
        </span>
      </div>

      {/* Liste */}
      <div className="rounded-2xl border border-line bg-card">
        {!ready ? (
          <p className="p-8 text-center text-sm text-muted">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Aucune vente.</p>
        ) : (
          list.map((s) => {
            const shop = shopById(s.shop_id);
            return (
              <div
                key={s.id}
                className="flex flex-col gap-3 border-b border-line p-3 last:border-0 sm:p-4 lg:flex-row lg:items-center"
              >
                <button onClick={() => setOpen(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Thumb src={s.photo_url} alt={s.titre} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.titre || "(sans titre)"}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      {s.acheteur && <span>@{s.acheteur}</span>}
                      <span className="inline-flex items-center gap-1.5">
                        <Dot color={shop?.couleur} size={7} /> {shop?.nom}
                      </span>
                      <span>{jourMois(new Date(s.date_vente))}</span>
                      <span className="lg:hidden">
                        <StatusBadge statut={s.statut} />
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end text-sm">
                    <span className="flex items-center gap-1.5">
                      <PriceBadge sale={s} />
                      {euros(s.prix)}
                    </span>
                    <span className={`font-semibold ${benefice(s) >= 0 ? "text-profit" : "text-down"}`}>
                      {signe(benefice(s))}
                    </span>
                  </span>
                </button>
                <div className="grid grid-cols-3 items-center gap-2 lg:flex lg:shrink-0 lg:justify-end">
                  <span className="hidden lg:inline-flex">
                    <StatusBadge statut={s.statut} />
                  </span>
                  <BordereauButton value={s.bordereau_url} className="btn px-2 py-1.5 text-xs sm:text-sm lg:px-3" />
                  {s.statut === "a_envoyer" ? (
                    <button className="btn px-2 py-1.5 text-xs sm:text-sm lg:px-3" onClick={() => markSent(s)}>
                      <span className="sm:hidden">Envoyé ✓</span>
                      <span className="hidden sm:inline">Marquer envoyé</span>
                    </button>
                  ) : (
                    <span className="hidden lg:block lg:w-[134px]" />
                  )}
                  <button className="btn col-start-3 px-2 py-1.5 text-xs sm:text-sm lg:px-3" onClick={() => setForm(s)}>
                    Modifier
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {open && <SaleModal sale={open} onClose={() => setOpen(null)} />}
      {form && <SaleForm sale={form === "new" ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  );
}
