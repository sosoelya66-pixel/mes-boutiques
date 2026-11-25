"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { BordereauButton } from "@/components/BordereauButton";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Dot } from "@/components/Header";
import { ListingModal } from "@/components/ListingModal";
import { SaleForm } from "@/components/SaleForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { Thumb } from "@/components/ui/Thumb";
import { loadSyncInfo, updateListing, updateSale } from "@/lib/data";
import { euros, signe } from "@/lib/format";
import { benefice, type Listing, type Sale } from "@/lib/types";

const DAY = 86400000;
const sod = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function TodayPage() {
  const { sales, listings, shopById, refresh, ready, error } = useAppState();
  const [toCheck, setToCheck] = useState<number | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [openFiche, setOpenFiche] = useState<Listing | null>(null);
  const [printing, setPrinting] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    loadSyncInfo()
      .then((r) => setToCheck(r.log.filter((l) => l.statut === "a_verifier" || l.statut === "erreur").length))
      .catch(() => setToCheck(null));
  }, []);

  const d = useMemo(() => {
    const today = sod(now ?? new Date()).getTime();
    const todaySales = sales.filter((s) => new Date(s.date_vente).getTime() >= today);
    return {
      todaySales,
      todayProfit: todaySales.reduce((a, s) => a + benefice(s), 0),
      toShip: sales.filter((s) => s.statut === "a_envoyer").sort((a, b) => a.date_vente.localeCompare(b.date_vente)),
      noPrice: sales.filter((s) => s.prix_source === "aucun"),
      drafts: listings.filter((l) => l.statut === "brouillon"),
      // Envoyés depuis plus de 7 jours sans être terminés : à surveiller
      late: sales.filter((s) => s.statut === "envoye" && (now?.getTime() ?? 0) - new Date(s.date_vente).getTime() > 7 * DAY),
      fichesToday: listings.filter((l) => new Date(l.created_at).getTime() >= today).length,
    };
  }, [sales, listings, now]);

  if (error) return <ErrorBox message={error} />;
  if (!ready || !now) return <Skeleton />;

  const allDone = !d.toShip.length && !d.noPrice.length && !d.drafts.length && !d.late.length && !toCheck;
  const withLabel = d.toShip.filter((s) => s.bordereau_url);

  async function printAll() {
    const w = window.open("", "_blank");
    setPrinting(true);
    try {
      const { mergeBordereaux } = await import("@/lib/print");
      const r = await mergeBordereaux(withLabel.map((s) => s.bordereau_url!));
      if (w) w.location.href = r.url;
      else window.location.href = r.url;
    } catch (e) {
      w?.close();
      alert("Erreur : " + (e as Error).message);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rise">
        <div className="text-sm capitalize text-muted">
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="mt-1 text-2xl font-bold">{greeting(now)} 👋</h2>
      </div>

      {/* Chiffres du jour */}
      <div className="rise grid grid-cols-3 gap-3">
        <Stat label="Ventes du jour" value={String(d.todaySales.length)} cls="text-orders" />
        <Stat label="Bénéfice du jour" value={euros(d.todayProfit)} cls="text-profit" />
        <Stat label="Fiches créées" value={String(d.fichesToday)} cls="text-white" />
      </div>

      {allDone && (
        <div className="rise rounded-2xl border border-profit/30 bg-profit/[0.06] p-6 text-center">
          <div className="text-3xl">✓</div>
          <div className="mt-2 font-semibold text-profit">Tout est à jour</div>
          <p className="mt-1 text-sm text-muted">Aucun colis à envoyer, rien à compléter. Bon moment pour créer des fiches !</p>
        </div>
      )}

      {/* Colis à envoyer */}
      {d.toShip.length > 0 && (
        <Block
          title={`📦 Colis à envoyer (${d.toShip.length})`}
          tone="alert"
          action={
            withLabel.length > 0 && (
              <button className="btn px-3 py-1.5 text-xs" onClick={printAll} disabled={printing}>
                🖨 {printing ? "…" : `Imprimer (${withLabel.length})`}
              </button>
            )
          }
        >
          {d.toShip.map((s) => {
            const shop = shopById(s.shop_id);
            const days = Math.floor((now.getTime() - new Date(s.date_vente).getTime()) / DAY);
            return (
              <Row key={s.id} photo={s.photo_url} title={s.titre} sub={<>
                <Dot color={shop?.couleur} size={7} /> {shop?.nom}
                {s.acheteur && <> · @{s.acheteur}</>}
                <span className={days >= 3 ? "text-alert" : ""}> · vendu {days === 0 ? "aujourd'hui" : days === 1 ? "hier" : `il y a ${days} j`}</span>
              </>}>
                <BordereauButton value={s.bordereau_url} className="btn px-2.5 py-1.5 text-xs" />
                <button
                  className="btn-primary px-2.5 py-1.5 text-xs"
                  onClick={async () => {
                    await updateSale(s.id, { statut: "envoye" });
                    await refresh();
                  }}
                >
                  Envoyé ✓
                </button>
              </Row>
            );
          })}
        </Block>
      )}

      {/* Prix à compléter */}
      {d.noPrice.length > 0 && (
        <Block title={`💶 Prix à compléter (${d.noPrice.length})`} tone="alert">
          {d.noPrice.map((s) => (
            <Row key={s.id} photo={s.photo_url} title={s.titre} sub={<>{shopById(s.shop_id)?.nom} · prix absent de l&apos;e-mail</>}>
              <button className="btn px-2.5 py-1.5 text-xs" onClick={() => setEditSale(s)}>
                Saisir le prix
              </button>
            </Row>
          ))}
        </Block>
      )}

      {/* E-mails à vérifier */}
      {!!toCheck && (
        <Link href="/boutiques" className="rise flex items-center justify-between rounded-2xl border border-alert/30 px-5 py-3 text-sm hover:bg-alert/[0.06]">
          <span className="text-alert">✉️ {toCheck} e-mail{toCheck > 1 ? "s" : ""} Vinted à vérifier</span>
          <span className="text-alert/80">Voir →</span>
        </Link>
      )}

      {/* Fiches en brouillon */}
      {d.drafts.length > 0 && (
        <Block title={`📝 Fiches à publier (${d.drafts.length})`}>
          {d.drafts.slice(0, 10).map((l) => (
            <Row key={l.id} photo={l.photos[0] ?? null} title={l.titre || "(sans titre)"} sub={<>{shopById(l.shop_id)?.nom} · {euros(l.prix)}</>}>
              <button className="btn px-2.5 py-1.5 text-xs" onClick={() => setOpenFiche(l)}>
                Ouvrir
              </button>
              <button
                className="btn px-2.5 py-1.5 text-xs"
                onClick={async () => {
                  await updateListing(l.id, { statut: "en_ligne" });
                  await refresh();
                }}
              >
                En ligne ✓
              </button>
            </Row>
          ))}
          {d.drafts.length > 10 && (
            <Link href="/fiches" className="block px-1 pt-2 text-sm text-muted hover:text-white">
              Voir les {d.drafts.length - 10} autres →
            </Link>
          )}
        </Block>
      )}

      {/* À surveiller */}
      {d.late.length > 0 && (
        <Block title={`⏳ Envoyés depuis plus de 7 jours (${d.late.length})`}>
          {d.late.map((s) => (
            <Row key={s.id} photo={s.photo_url} title={s.titre} sub={<>{shopById(s.shop_id)?.nom}{s.suivi && <> · suivi {s.suivi}</>}</>}>
              <button
                className="btn px-2.5 py-1.5 text-xs"
                onClick={async () => {
                  await updateSale(s.id, { statut: "termine" });
                  await refresh();
                }}
              >
                Terminé ✓
              </button>
            </Row>
          ))}
        </Block>
      )}

      {/* Ventes du jour */}
      {d.todaySales.length > 0 && (
        <Block title="🎉 Vendu aujourd'hui">
          {d.todaySales.map((s) => (
            <Row key={s.id} photo={s.photo_url} title={s.titre} sub={<>{shopById(s.shop_id)?.nom}</>}>
              <span className="text-sm font-semibold text-profit">{signe(benefice(s))}</span>
            </Row>
          ))}
        </Block>
      )}

      {editSale && <SaleForm sale={editSale} onClose={() => setEditSale(null)} />}
      {openFiche && <ListingModal listing={openFiche} onClose={() => setOpenFiche(null)} />}
    </div>
  );
}

function greeting(d: Date) {
  const h = d.getHours();
  return h < 6 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 sm:p-5">
      <div className="text-[11px] text-muted sm:text-sm">{label}</div>
      <div className={`mt-1 truncate text-lg font-bold sm:text-3xl ${cls}`}>{value}</div>
    </div>
  );
}

function Block({
  title,
  tone,
  action,
  children,
}: {
  title: string;
  tone?: "alert";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`rise rounded-2xl border bg-card p-4 sm:p-5 ${tone === "alert" ? "border-alert/30" : "border-line"}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className={`text-[15px] font-semibold ${tone === "alert" ? "text-alert" : ""}`}>{title}</h3>
        {action}
      </div>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

function Row({
  photo,
  title,
  sub,
  children,
}: {
  photo: string | null;
  title: string;
  sub: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 sm:flex-nowrap">
      <Thumb src={photo} size={40} alt={title} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted">{sub}</div>
      </div>
      <div className="flex w-full justify-end gap-2 sm:w-auto">{children}</div>
    </li>
  );
}
