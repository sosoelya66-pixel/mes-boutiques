"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/components/Studio";
import { Note, SiteBadge, StatutBadge } from "@/components/ui/Badges";
import { ErrorBox, Skeleton } from "@/components/ui/Skeleton";
import { setStatut } from "@/lib/data";
import { euros2 } from "@/lib/format";
import { CATEGORIES, GOOGLE_COUT_REQUETE, QUARTIERS } from "@/lib/lille";
import type { Prospect } from "@/lib/types";

const CarteLeaflet = dynamic(() => import("@/components/CarteLeaflet"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-card" />,
});

const FILTRES = [
  { id: "cibles", label: "Sans site ou site faible" },
  { id: "aucun", label: "Sans site" },
  { id: "reseau", label: "Site faible" },
  { id: "a_contacter", label: "À contacter" },
  { id: "suivi", label: "Dans mon suivi" },
  { id: "tous", label: "Tous" },
] as const;
type Filtre = (typeof FILTRES)[number]["id"];

// Les meilleures cibles d'abord : sans site, puis site faible, puis beaucoup d'avis (commerce actif)
const score = (p: Prospect) => (p.site_etat === "aucun" ? 2e6 : p.site_etat === "reseau" ? 1e6 : 0) + (p.nb_avis ?? 0);

export default function CartePage() {
  const { prospects, ready, error, refresh, upsertLocal, openFiche } = useStudio();
  const [cat, setCat] = useState<string>("coiffeur");
  const [quartier, setQuartier] = useState<string>("centre");
  const [filtre, setFiltre] = useState<Filtre>("cibles");
  const [selected, setSelected] = useState<string | null>(null);
  const [cible, setCible] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const deCat = useMemo(() => prospects.filter((p) => p.categorie === cat && p.lat != null), [prospects, cat]);
  const visibles = useMemo(() => {
    const f = deCat.filter((p) => {
      switch (filtre) {
        case "cibles":
          return p.site_etat !== "site" && p.statut !== "perdu";
        case "aucun":
        case "reseau":
          return p.site_etat === filtre;
        case "a_contacter":
          return p.statut === "a_contacter";
        case "suivi":
          return p.statut !== "nouveau";
        default:
          return true;
      }
    });
    return f.sort((a, b) => score(b) - score(a));
  }, [deCat, filtre]);

  // Faire défiler la liste jusqu'au commerce choisi sur la carte
  useEffect(() => {
    if (selected) listRef.current?.querySelector(`[data-id="${selected}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  async function chercher() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorie: cat, quartier }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur");
      await refresh();
      const q = QUARTIERS.find((x) => x.id === quartier)!;
      setCible([q.lat, q.lng]);
      setMsg({
        text: `${j.trouves} commerces trouvés, dont ${j.nouveaux} nouveaux. Coût estimé : ${euros2(j.cout)} (${j.requetes} requête${j.requetes > 1 ? "s" : ""}). Il te reste ${j.restant} recherches aujourd'hui.`,
      });
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  function choisir(p: Prospect) {
    setSelected(p.id);
    if (p.lat != null) setCible([p.lat, p.lng!]);
  }

  if (error) return <ErrorBox message={error} />;
  if (!ready) return <Skeleton />;

  const nbSans = deCat.filter((p) => p.site_etat === "aucun").length;
  const nbFaible = deCat.filter((p) => p.site_etat === "reseau").length;

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <section className="rise glass rounded-2xl p-4 sm:p-5">
        <h2 className="font-display text-2xl font-semibold italic">Prospection</h2>
        <p className="mt-1 text-sm text-muted">Choisis un type de commerce et un quartier : Google te donne jusqu'à 60 commerces.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select className="input" value={quartier} onChange={(e) => setQuartier(e.target.value)}>
            {QUARTIERS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
          <button onClick={chercher} disabled={busy} className="btn-primary">
            {busy ? "Recherche…" : "🔍 Chercher"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Coût : 1 à 3 requêtes Google, environ {euros2(GOOGLE_COUT_REQUETE * 3)} au maximum (les 1 000 premières du mois sont gratuites).
        </p>
        {msg && <p className={`mt-3 text-sm ${msg.error ? "text-alert" : "text-champagne"}`}>{msg.text}</p>}
      </section>

      {/* Filtres */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTRES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            className={`shrink-0 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm ${filtre === f.id ? "pill-active" : "text-muted hover:text-white"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {/* Carte */}
        <div className="rise glass relative isolate h-[45vh] rounded-2xl p-1.5 lg:h-[70vh]">
          <CarteLeaflet points={visibles} selected={selected} onSelect={(id) => setSelected(id)} cible={cible} />
          <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-night/80 px-3 py-2 text-[11px] text-muted backdrop-blur">
            <Legende c="#d4b483" l="Sans site" />
            <Legende c="#f0a04d" l="Site faible" />
            <Legende c="#7c776f" l="A un site" />
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-white" />
              Dans ton suivi
            </span>
          </div>
        </div>

        {/* Liste */}
        <section className="rise glass flex flex-col rounded-2xl lg:h-[70vh]">
          <div className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="font-semibold">{visibles.length} commerces</h3>
            <span className="text-xs text-muted">
              {nbSans} sans site · {nbFaible} site faible
            </span>
          </div>
          <ul ref={listRef} className="divide-y divide-line overflow-y-auto">
            {visibles.map((p) => (
              <li
                key={p.id}
                data-id={p.id}
                onClick={() => choisir(p)}
                className={`cursor-pointer px-4 py-3 transition-colors ${p.id === selected ? "bg-gold/10" : "hover:bg-white/[0.03]"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.nom}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">{p.adresse}</div>
                  </div>
                  <Note note={p.note_google} nb={p.nb_avis} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <SiteBadge etat={p.site_etat} />
                  {p.statut !== "nouveau" && <StatutBadge statut={p.statut} />}
                  <span className="flex-1" />
                  {p.statut === "nouveau" && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        upsertLocal(await setStatut(p, "a_contacter"));
                      }}
                      className="rounded-lg border border-gold/40 px-2 py-1 text-[11px] text-gold hover:bg-gold/10"
                    >
                      ＋ À contacter
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openFiche(p.id);
                    }}
                    className="rounded-lg border border-line px-2 py-1 text-[11px] text-muted hover:text-white"
                  >
                    Fiche
                  </button>
                </div>
              </li>
            ))}
            {visibles.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted">
                {deCat.length === 0 ? "Aucun commerce de ce type pour l'instant : lance une recherche." : "Aucun commerce avec ce filtre."}
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Legende({ c, l }: { c: string; l: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
      {l}
    </span>
  );
}
