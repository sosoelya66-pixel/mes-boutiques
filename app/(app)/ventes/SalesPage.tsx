"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/components/AppState";
import { BordereauButton } from "@/components/BordereauButton";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Dot } from "@/components/Header";
import { SaleForm } from "@/components/SaleForm";
import { SaleModal } from "@/components/SaleModal";
import { Thumb } from "@/components/ui/Thumb";
import { updateSale } from "@/lib/data";
import { euros, signe } from "@/lib/format";
import { benefice, type Sale, type SaleStatus } from "@/lib/types";

const DAY = 86400000;

// Les étapes d'une vente, dans l'ordre
const ETAPES: { value: SaleStatus; label: string; icon: string; aide: string; vide: string }[] = [
  { value: "a_envoyer", label: "À envoyer", icon: "📦", aide: "Vendues, colis à préparer et déposer", vide: "Aucun colis à envoyer. 🎉" },
  { value: "envoye", label: "En route", icon: "🚚", aide: "Colis déposés, en attente de livraison", vide: "Aucun colis en route." },
  { value: "termine", label: "Terminées", icon: "✅", aide: "Livrées, argent reçu", vide: "Aucune vente terminée pour l'instant." },
];

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (k: string) => new Date(k + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

function dayLabel(iso: string, now: Date) {
  const d = new Date(iso);
  const sod = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((sod(now) - sod(d)) / DAY);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function SalesPage() {
  const { sales, shops, shopId, setShopId, shopById, refresh, ready, error } = useAppState();
  const params = useSearchParams();
  const initial = (params.get("statut") as SaleStatus | null) ?? (sales.some((s) => s.statut === "a_envoyer") ? "a_envoyer" : "");
  const [statut, setStatut] = useState<SaleStatus | "">(initial);
  const pick = (v: SaleStatus | "") => {
    chosen.current = true;
    setStatut(v);
  };
  const [sansPrix, setSansPrix] = useState(params.get("prix") === "a_completer");
  const [mois, setMois] = useState("");
  const [q, setQ] = useState("");
  const [filtres, setFiltres] = useState(false);
  const [open, setOpen] = useState<Sale | null>(null);
  const [form, setForm] = useState<Sale | "new" | null>(null);
  const [printing, setPrinting] = useState(false);
  const now = useMemo(() => new Date(), []);

  // À l'ouverture : on montre directement les colis à envoyer s'il y en a
  const chosen = useRef(!!params.get("statut") || !!params.get("prix"));
  useEffect(() => {
    if (!ready || chosen.current) return;
    chosen.current = true;
    setStatut(sales.some((s) => s.statut === "a_envoyer") ? "a_envoyer" : "");
  }, [ready, sales]);

  const months = useMemo(() => [...new Set(sales.map((s) => monthKey(s.date_vente)))].sort().reverse(), [sales]);
  const count = (st: SaleStatus) => sales.filter((s) => s.statut === st).length;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    return sales.filter(
      (s) =>
        (!statut || s.statut === statut) &&
        (!sansPrix || s.prix_source === "aucun") &&
        (!mois || monthKey(s.date_vente) === mois) &&
        (!needle || s.titre.toLowerCase().includes(needle) || (s.acheteur ?? "").toLowerCase().includes(needle))
    );
  }, [sales, statut, mois, q, sansPrix]);

  // Regroupement par jour
  const groups = useMemo(() => {
    const m = new Map<string, Sale[]>();
    for (const s of list) {
      const k = dayLabel(s.date_vente, now);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [list, now]);

  const toShip = sales.filter((s) => s.statut === "a_envoyer");
  const withLabel = toShip.filter((s) => s.bordereau_url);
  const totalCa = list.reduce((a, s) => a + s.prix, 0);
  const totalB = list.reduce((a, s) => a + benefice(s), 0);
  const etape = ETAPES.find((e) => e.value === statut);
  const nbFiltres = (mois ? 1 : 0) + (shopId !== "all" ? 1 : 0) + (sansPrix ? 1 : 0);

  async function printAll() {
    if (!withLabel.length) return alert("Aucun bordereau enregistré pour les colis à envoyer.");
    const w = window.open("", "_blank");
    setPrinting(true);
    try {
      const { mergeBordereaux } = await import("@/lib/print");
      const r = await mergeBordereaux(withLabel.map((s) => s.bordereau_url!));
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

  async function next(s: Sale) {
    await updateSale(s.id, { statut: s.statut === "a_envoyer" ? "envoye" : "termine" });
    await refresh();
  }

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4">
      {/* Les 3 étapes d'une vente */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {ETAPES.map((e, i) => {
          const active = statut === e.value;
          return (
            <button
              key={e.value}
              onClick={() => pick(active ? "" : e.value)}
              className={`relative rounded-2xl border p-3 text-left transition-all sm:p-4 ${
                active ? "border-transparent pill-active" : "glass hover:border-white/20"
              }`}
            >
              <div className="text-lg sm:text-xl">{e.icon}</div>
              <div className={`mt-1 text-2xl font-bold sm:text-3xl ${e.value === "a_envoyer" && count(e.value) ? (active ? "" : "text-alert") : ""}`}>
                {count(e.value)}
              </div>
              <div className="text-xs font-medium sm:text-sm">{e.label}</div>
              {i < 2 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-muted sm:block">›</span>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {etape ? etape.aide : "Toutes les ventes"} · une vente passe de <b>À envoyer</b> à <b>En route</b> puis <b>Terminée</b>.
        {statut && (
          <button className="ml-2 text-revenue hover:underline" onClick={() => pick("")}>
            Voir toutes les ventes
          </button>
        )}
      </p>

      {/* Recherche + filtres */}
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="🔍 Article ou acheteur…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className={`btn shrink-0 ${nbFiltres ? "!border-revenue/60" : ""}`} onClick={() => setFiltres(!filtres)}>
          Filtres{nbFiltres ? ` (${nbFiltres})` : ""}
        </button>
      </div>
      {filtres && (
        <div className="rise glass grid gap-2 rounded-2xl p-3 sm:grid-cols-3">
          <select className="input" value={mois} onChange={(e) => setMois(e.target.value)}>
            <option value="">Tous les mois</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <select className="input" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="all">Toutes les boutiques</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 text-sm">
            <input type="checkbox" checked={sansPrix} onChange={(e) => setSansPrix(e.target.checked)} />
            Seulement les prix à compléter
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted">
          {list.length} vente{list.length > 1 ? "s" : ""} · CA <span className="text-revenue">{euros(totalCa)}</span> · bénéfice{" "}
          <span className="text-profit">{signe(totalB)}</span>
        </span>
        <div className="flex gap-2">
          {statut === "a_envoyer" && toShip.length > 0 && (
            <button className="btn-primary !py-2" onClick={printAll} disabled={printing}>
              🖨 {printing ? "Préparation…" : `Imprimer ${withLabel.length} bordereau${withLabel.length > 1 ? "x" : ""}`}
            </button>
          )}
          <button className="btn !py-2" onClick={() => setForm("new")} disabled={!shops.length}>
            + Vente à la main
          </button>
        </div>
      </div>

      {/* Liste par jour */}
      {!ready ? (
        <p className="p-8 text-center text-sm text-muted">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="glass rounded-2xl p-8 text-center text-sm text-muted">{etape?.vide ?? "Aucune vente."}</p>
      ) : (
        groups.map(([day, items]) => (
          <section key={day}>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted first-letter:uppercase">{day}</h3>
            <ul className="glass divide-y divide-line rounded-2xl">
              {items.map((s) => {
                const shop = shopById(s.shop_id);
                const age = Math.floor((now.getTime() - new Date(s.date_vente).getTime()) / DAY);
                const alerts = [
                  s.statut === "a_envoyer" && !s.bordereau_url ? "bordereau manquant" : "",
                  s.prix_source === "aucun" ? "prix à compléter" : "",
                  s.statut === "a_envoyer" && age >= 2 ? `vendu il y a ${age} j` : "",
                ].filter(Boolean);
                return (
                  <li key={s.id} className="flex items-center gap-3 p-3 sm:p-4">
                    <button onClick={() => setOpen(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Thumb src={s.photo_url} alt={s.titre} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.titre || "(sans titre)"}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                          <Dot color={shop?.couleur} size={7} /> {shop?.nom}
                          {s.acheteur && <span>· @{s.acheteur}</span>}
                          {!statut && <span>· {ETAPES.find((e) => e.value === s.statut)?.label}</span>}
                        </span>
                        {alerts.length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {alerts.map((a) => (
                              <span key={a} className="rounded-full bg-alert/15 px-2 py-0.5 text-[11px] text-alert">
                                {a}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right text-sm">
                        <span className="block">{euros(s.prix)}</span>
                        <span className={`block font-semibold ${benefice(s) >= 0 ? "text-profit" : "text-down"}`}>{signe(benefice(s))}</span>
                      </span>
                    </button>
                    {/* Une seule action : l'étape suivante */}
                    {s.statut !== "termine" && (
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                        {s.statut === "a_envoyer" && s.bordereau_url && (
                          <BordereauButton value={s.bordereau_url} className="btn !px-2.5 !py-1.5 !text-xs" />
                        )}
                        <button className="btn-primary !px-2.5 !py-1.5 !text-xs" onClick={() => next(s)}>
                          {s.statut === "a_envoyer" ? "Envoyé ✓" : "Livré ✓"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <p className="text-center text-xs text-muted">Touche une vente pour voir le détail, le lien produit ou la modifier.</p>

      {open && <SaleModal sale={open} onClose={() => setOpen(null)} />}
      {form && <SaleForm sale={form === "new" ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  );
}
