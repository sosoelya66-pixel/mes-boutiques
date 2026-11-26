"use client";

import { useMemo, useState } from "react";
import { useStudio } from "@/components/Studio";
import { Modal, ModalTitle } from "@/components/ui/Modal";
import { Note, SiteBadge } from "@/components/ui/Badges";
import { ErrorBox, Skeleton } from "@/components/ui/Skeleton";
import { createProspect } from "@/lib/data";
import { dateCourte, dateHeure, euros, jourParis } from "@/lib/format";
import { CATEGORIES, categorieLabel } from "@/lib/lille";
import { siteEtat } from "@/lib/site";
import { STATUTS, type Prospect, type Statut } from "@/lib/types";

const COLONNES = STATUTS.filter((s) => s.id !== "nouveau");

export default function ClientsPage() {
  const { prospects, ready, error } = useStudio();
  const [etape, setEtape] = useState<Statut>("a_contacter");
  const [q, setQ] = useState("");
  const [ajout, setAjout] = useState(false);

  const suivis = useMemo(() => {
    const s = q.trim().toLowerCase();
    return prospects.filter((p) => p.statut !== "nouveau" && (!s || `${p.nom} ${p.adresse ?? ""} ${p.contact_nom ?? ""}`.toLowerCase().includes(s)));
  }, [prospects, q]);
  const par = (st: Statut) => suivis.filter((p) => p.statut === st);

  if (error) return <ErrorBox message={error} />;
  if (!ready) return <Skeleton />;

  const enDevis = par("devis").reduce((a, p) => a + (p.montant ?? 0), 0);
  const signes = [...par("signe"), ...par("livre")].reduce((a, p) => a + (p.montant ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold italic">Clients</h2>
          <p className="mt-1 text-sm text-muted">
            {suivis.length} commerces suivis · {euros(enDevis)} en devis · {euros(signes)} signés
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input className="input sm:w-56" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary shrink-0" onClick={() => setAjout(true)}>
            ＋ Ajouter
          </button>
        </div>
      </div>

      {/* Téléphone et tablette : une étape à la fois */}
      <div className="lg:hidden">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {COLONNES.map((s) => (
            <button
              key={s.id}
              onClick={() => setEtape(s.id)}
              className={`shrink-0 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm ${etape === s.id ? "pill-active" : "text-muted"}`}
            >
              {s.court} <span className="opacity-70">{par(s.id).length}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2.5">
          {par(etape).map((p) => (
            <Carte key={p.id} p={p} />
          ))}
          {par(etape).length === 0 && <Vide />}
        </div>
      </div>

      {/* Ordinateur : toutes les étapes en colonnes */}
      <div className="no-scrollbar hidden gap-3 overflow-x-auto pb-2 lg:flex">
        {COLONNES.map((s) => (
          <section key={s.id} className="glass flex max-h-[75vh] w-[260px] shrink-0 flex-col rounded-2xl">
            <div className="flex items-center gap-2 border-b border-line px-3.5 py-3 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
              <span className="ml-auto text-xs font-normal text-muted">{par(s.id).length}</span>
            </div>
            <div className="space-y-2 overflow-y-auto p-2">
              {par(s.id).map((p) => (
                <Carte key={p.id} p={p} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {ajout && <AjoutModal onClose={() => setAjout(false)} />}
    </div>
  );
}

function Vide() {
  return (
    <div className="glass rounded-2xl p-6 text-center text-sm text-muted">
      Personne à cette étape. Ajoute des commerces depuis la carte (bouton « ＋ À contacter ») ou avec « ＋ Ajouter ».
    </div>
  );
}

function Carte({ p }: { p: Prospect }) {
  const { openFiche } = useStudio();
  const today = jourParis();
  const enRetard = p.relance_le && p.relance_le <= today;
  return (
    <button onClick={() => openFiche(p.id)} className="glass block w-full rounded-xl p-3 text-left transition-colors hover:border-gold/30">
      <div className="flex items-start justify-between gap-2">
        <div className="truncate font-medium">{p.nom}</div>
        {p.montant != null && <span className="shrink-0 text-sm text-champagne">{euros(p.montant)}</span>}
      </div>
      <div className="mt-0.5 truncate text-xs text-muted">
        {categorieLabel(p.categorie)}
        {p.quartier && ` · ${p.quartier}`}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <SiteBadge etat={p.site_etat} />
        <Note note={p.note_google} nb={p.nb_avis} />
        {p.relance_le && (
          <span className={`rounded-full px-2 py-0.5 ${enRetard ? "bg-alert/15 text-alert" : "bg-white/5 text-muted"}`}>
            Relance {p.relance_le === today ? "aujourd'hui" : dateCourte(p.relance_le)}
          </span>
        )}
        {p.rdv_le && new Date(p.rdv_le) > new Date(Date.now() - 3600000) && (
          <span className="rounded-full bg-revenue/15 px-2 py-0.5 text-revenue">RDV {dateHeure(p.rdv_le)}</span>
        )}
      </div>
    </button>
  );
}

/** Ajouter un commerce à la main (passage en boutique, bouche-à-oreille…) */
function AjoutModal({ onClose }: { onClose: () => void }) {
  const { upsertLocal, openFiche } = useStudio();
  const [f, setF] = useState({ nom: "", categorie: "coiffeur", adresse: "", telephone: "", site: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await createProspect({
        nom: f.nom.trim(),
        categorie: f.categorie,
        adresse: f.adresse.trim() || null,
        telephone: f.telephone.trim() || null,
        email: f.email.trim() || null,
        site: f.site.trim() || null,
        site_etat: siteEtat(f.site.trim()),
        statut: "a_contacter",
      });
      upsertLocal(p);
      onClose();
      openFiche(p.id);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalTitle onClose={onClose}>Ajouter un commerce</ModalTitle>
      <form onSubmit={submit} className="space-y-3">
        <label className="label">
          Nom
          <input required className="input mt-1.5" value={f.nom} onChange={set("nom")} />
        </label>
        <label className="label">
          Type
          <select className="input mt-1.5" value={f.categorie} onChange={set("categorie")}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Adresse
          <input className="input mt-1.5" value={f.adresse} onChange={set("adresse")} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            Téléphone
            <input type="tel" className="input mt-1.5" value={f.telephone} onChange={set("telephone")} />
          </label>
          <label className="label">
            E-mail
            <input type="email" className="input mt-1.5" value={f.email} onChange={set("email")} />
          </label>
        </div>
        <label className="label">
          Site actuel (s'il y en a un)
          <input className="input mt-1.5" placeholder="https://…" value={f.site} onChange={set("site")} />
        </label>
        {err && <p className="text-sm text-alert">{err}</p>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Ajout…" : "Ajouter à « À contacter »"}
        </button>
      </form>
    </Modal>
  );
}
