"use client";

import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Note, SiteBadge, StatutBadge } from "./ui/Badges";
import { useStudio } from "./Studio";
import { addActivite, deleteActivite, deleteProspect, loadActivites, setStatut, updateProspect } from "@/lib/data";
import { dateHeure, plusJours, telLink } from "@/lib/format";
import { categorieLabel } from "@/lib/lille";
import { domaine } from "@/lib/site";
import { STATUTS, type Activite, type Prospect } from "@/lib/types";

const ACTIONS_RAPIDES = [
  { type: "appel", label: "📞 Appelé" },
  { type: "visite", label: "🚶 Passé en boutique" },
  { type: "email", label: "✉️ E-mail envoyé" },
];

/** Fiche d'un commerce : coordonnées, étape du suivi, rappels et historique. */
export function ProspectModal({ prospect: p, onClose }: { prospect: Prospect; onClose: () => void }) {
  const { upsertLocal, removeLocal } = useStudio();
  const [acts, setActs] = useState<Activite[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadActivites(p.id).then(setActs).catch((e) => setErr(e.message));
  }, [p.id]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const reloadActs = async () => setActs(await loadActivites(p.id));
  const patch = (x: Partial<Prospect>) => run(async () => upsertLocal(await updateProspect(p.id, x)));

  const ajouterNote = (type: string, texte: string) =>
    run(async () => {
      await addActivite(p.id, type, texte);
      // Un premier contact fait passer « À contacter » à « Contacté »
      if (["appel", "visite", "email"].includes(type) && (p.statut === "nouveau" || p.statut === "a_contacter"))
        upsertLocal(await setStatut(p, "contacte"));
      setNote("");
      await reloadActs();
    });

  return (
    <Modal onClose={onClose} wide>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
        <h2 className="font-display text-2xl font-semibold italic text-champagne">{p.nom}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          <StatutBadge statut={p.statut} />
          <SiteBadge etat={p.site_etat} />
          <Note note={p.note_google} nb={p.nb_avis} />
          {p.categorie && <span className="text-xs text-muted">{categorieLabel(p.categorie)}</span>}
        </div>
        </div>
        <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-white" aria-label="Fermer">
          ×
        </button>
      </div>

      {/* Coordonnées */}
      <div className="space-y-1.5 text-sm">
        {p.adresse && <div className="text-muted">{p.adresse}</div>}
        <div className="flex flex-wrap gap-2 pt-1">
          {p.telephone && (
            <a href={telLink(p.telephone)} className="btn-primary !py-2">
              📞 {p.telephone}
            </a>
          )}
          {p.site && (
            <a href={p.site} target="_blank" rel="noreferrer" className="btn max-w-full">
              <span className="truncate">🌐 {domaine(p.site)}</span>
            </a>
          )}
          {p.maps_url && (
            <a href={p.maps_url} target="_blank" rel="noreferrer" className="btn">
              📍 Google Maps
            </a>
          )}
        </div>
      </div>

      {/* Étape */}
      <div className="mt-6">
        <div className="label mb-2">Étape du suivi</div>
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {STATUTS.map((s) => (
            <button
              key={s.id}
              disabled={busy}
              onClick={() => s.id !== p.statut && run(async () => {
                upsertLocal(await setStatut(p, s.id));
                await reloadActs();
              })}
              className={`shrink-0 rounded-full border border-line px-3 py-1.5 text-xs ${p.statut === s.id ? "pill-active" : "text-muted hover:text-white"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rappels et infos */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="label">
          Relancer le
          <input type="date" className="input mt-1.5" value={p.relance_le ?? ""} onChange={(e) => patch({ relance_le: e.target.value || null })} />
          <span className="mt-1.5 flex gap-1.5">
            {[
              ["Demain", 1],
              ["Dans 3 j", 3],
              ["Dans 1 sem.", 7],
            ].map(([l, n]) => (
              <button key={l} type="button" className="rounded-lg border border-line px-2 py-1 text-[11px] hover:text-white" onClick={() => patch({ relance_le: plusJours(n as number) })}>
                {l}
              </button>
            ))}
          </span>
        </label>
        <label className="label">
          Rendez-vous
          <input
            type="datetime-local"
            className="input mt-1.5"
            value={p.rdv_le ? toLocalInput(p.rdv_le) : ""}
            onChange={(e) => patch({ rdv_le: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </label>
        <Champ label="Nom du contact" value={p.contact_nom} onSave={(v) => patch({ contact_nom: v })} />
        <Champ label="E-mail" type="email" value={p.email} onSave={(v) => patch({ email: v })} />
        <Champ label="Téléphone" type="tel" value={p.telephone} onSave={(v) => patch({ telephone: v })} />
        <Champ label="Montant du projet (€)" type="number" value={p.montant?.toString() ?? null} onSave={(v) => patch({ montant: v ? Number(v) : null })} />
      </div>

      {/* Historique */}
      <div className="mt-6">
        <div className="label mb-2">Historique et notes</div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {ACTIONS_RAPIDES.map((a) => (
            <button key={a.type} disabled={busy} onClick={() => ajouterNote(a.type, a.label.slice(3))} className="btn !px-2.5 !py-1.5 !text-xs">
              {a.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) ajouterNote("note", note.trim());
          }}
        >
          <input className="input" placeholder="Ajouter une note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button disabled={busy || !note.trim()} className="btn-primary shrink-0">
            Ajouter
          </button>
        </form>
        <ul className="mt-3 space-y-2">
          {acts?.map((a) => (
            <li key={a.id} className="group flex gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="whitespace-pre-wrap">{a.texte}</div>
                <div className="mt-0.5 text-[11px] text-muted">{dateHeure(a.created_at)}</div>
              </div>
              <button
                onClick={() => run(async () => { await deleteActivite(a.id); await reloadActs(); })}
                className="text-muted opacity-0 hover:text-alert group-hover:opacity-100"
                aria-label="Supprimer"
              >
                ×
              </button>
            </li>
          ))}
          {acts?.length === 0 && <li className="text-sm text-muted">Rien pour l'instant.</li>}
        </ul>
      </div>

      {err && <p className="mt-4 text-sm text-alert">{err}</p>}

      <div className="mt-6 flex justify-between gap-2 border-t border-line pt-4">
        <button
          className="btn-danger"
          onClick={() =>
            confirm(`Supprimer « ${p.nom} » et tout son historique ?`) &&
            run(async () => {
              await deleteProspect(p.id);
              removeLocal(p.id);
              onClose();
            })
          }
        >
          Supprimer
        </button>
        <button className="btn" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Modal>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Champ texte enregistré quand on quitte le champ */
function Champ({ label, value, onSave, type = "text" }: { label: string; value: string | null; onSave: (v: string | null) => void; type?: string }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <label className="label">
      {label}
      <input
        type={type}
        className="input mt-1.5"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => (v.trim() || null) !== (value ?? null) && onSave(v.trim() || null)}
      />
    </label>
  );
}
