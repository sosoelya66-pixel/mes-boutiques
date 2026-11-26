"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudio } from "@/components/Studio";
import { ErrorBox, Skeleton } from "@/components/ui/Skeleton";
import {
  addActivite,
  addTachePerso,
  deleteTachePerso,
  loadActivitesDepuis,
  loadTachesPerso,
  setTachePerso,
  updateProspect,
} from "@/lib/data";
import { dateCourte, euros, greeting, heure, jourParis, telLink } from "@/lib/format";
import { EN_COURS, type Activite, type Prospect, type TachePerso } from "@/lib/types";

const OBJECTIF_CONTACTS = 5; // commerces à contacter par jour

export default function JourneePage() {
  const { prospects, reglages, ready, error, upsertLocal, openFiche } = useStudio();
  const [now, setNow] = useState<Date | null>(null);
  const [perso, setPerso] = useState<TachePerso[]>([]);
  const [faitsAujourdhui, setFaits] = useState<(Activite & { prospects: { nom: string } | null })[]>([]);
  const [semaine, setSemaine] = useState<Activite[]>([]);
  const [nouvelle, setNouvelle] = useState("");

  const today = jourParis();
  const charger = useCallback(async () => {
    const d = new Date();
    const debutJour = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const debutSemaine = new Date(d.getTime() - 6 * 86400000);
    debutSemaine.setHours(0, 0, 0, 0);
    const [t, s] = await Promise.all([loadTachesPerso(), loadActivitesDepuis(debutSemaine.toISOString())]);
    setPerso(t);
    setSemaine(s);
    setFaits(s.filter((a) => a.created_at >= debutJour));
  }, []);

  useEffect(() => {
    setNow(new Date());
    charger().catch(() => {});
  }, [charger]);

  const d = useMemo(() => {
    const finJour = new Date();
    finJour.setHours(23, 59, 59, 999);
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const actifs = prospects.filter((p) => EN_COURS.includes(p.statut));
    return {
      rdv: prospects
        .filter((p) => p.rdv_le && new Date(p.rdv_le) >= debutJour && new Date(p.rdv_le) <= finJour)
        .sort((a, b) => a.rdv_le!.localeCompare(b.rdv_le!)),
      relances: actifs.filter((p) => p.relance_le && p.relance_le <= today).sort((a, b) => a.relance_le!.localeCompare(b.relance_le!)),
      aContacter: prospects.filter((p) => p.statut === "a_contacter" && !p.relance_le),
      devisSansRelance: prospects.filter(
        (p) => p.statut === "devis" && !p.relance_le && Date.now() - new Date(p.updated_at).getTime() > 7 * 86400000
      ),
      enDevis: prospects.filter((p) => p.statut === "devis").reduce((a, p) => a + (p.montant ?? 0), 0),
      rdvSemaine: prospects.filter((p) => p.rdv_le && new Date(p.rdv_le) >= debutJour && new Date(p.rdv_le) < new Date(Date.now() + 7 * 86400000)).length,
      reperes: prospects.length,
      cibles: prospects.filter((p) => p.statut === "nouveau" && p.site_etat !== "site").length,
    };
  }, [prospects, today]);

  if (error) return <ErrorBox message={error} />;
  if (!ready || !now) return <Skeleton />;

  const contactesAujourdhui = new Set(faitsAujourdhui.filter((a) => ["appel", "visite", "email"].includes(a.type)).map((a) => a.prospect_id)).size;
  const contactsSemaine = new Set(semaine.filter((a) => ["appel", "visite", "email"].includes(a.type)).map((a) => a.prospect_id)).size;
  const prenom = reglages?.prenom?.trim();

  async function relanceFaite(p: Prospect, mode: "fait" | "reporter") {
    if (mode === "fait") {
      await addActivite(p.id, "relance", "Relance faite");
      upsertLocal(await updateProspect(p.id, { relance_le: null }));
    } else {
      upsertLocal(await updateProspect(p.id, { relance_le: jourParis(new Date(Date.now() + 2 * 86400000)) }));
    }
    charger();
  }

  const persoAFaire = perso.filter((t) => !t.fait);
  const persoFaites = perso.filter((t) => t.fait);
  const nbAFaire = d.rdv.length + d.relances.length + d.devisSansRelance.length + persoAFaire.length + (contactesAujourdhui < OBJECTIF_CONTACTS && d.aContacter.length ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rise">
        <div className="text-sm capitalize text-muted">{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
        <h2 className="font-display mt-1 text-3xl font-semibold italic sm:text-4xl">
          {greeting(now)}
          {prenom ? `, ${prenom}` : ""}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {nbAFaire === 0 ? "Rien d'urgent : bon moment pour prospecter." : `${nbAFaire} chose${nbAFaire > 1 ? "s" : ""} à faire aujourd'hui.`}
        </p>
      </div>

      {/* Chiffres */}
      <div className="rise grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Contactés aujourd'hui" value={`${contactesAujourdhui}/${OBJECTIF_CONTACTS}`} cls="text-gold" />
        <Stat label="RDV sur 7 jours" value={String(d.rdvSemaine)} cls="text-revenue" />
        <Stat label="En devis" value={euros(d.enDevis)} cls="text-orders" />
        <Stat label="Cibles à explorer" value={String(d.cibles)} cls="text-champagne" href="/carte" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Tâches */}
        <section className="rise glass rounded-2xl p-4 sm:p-5">
          <h3 className="font-display mb-3 text-lg font-semibold">Ta journée</h3>
          <ul className="space-y-2">
            {d.rdv.map((p) => (
              <Ligne key={"rdv" + p.id} icon="🤝" titre={`Rendez-vous avec ${p.nom}`} detail={`à ${heure(p.rdv_le!)}${p.adresse ? " · " + p.adresse : ""}`} onOpen={() => openFiche(p.id)}>
                {p.telephone && <a href={telLink(p.telephone)} className="chip">Appeler</a>}
              </Ligne>
            ))}
            {d.relances.map((p) => (
              <Ligne
                key={"rel" + p.id}
                icon="🔔"
                titre={`Relancer ${p.nom}`}
                detail={p.relance_le! < today ? `prévu le ${dateCourte(p.relance_le!)} (en retard)` : "prévu aujourd'hui"}
                alert={p.relance_le! < today}
                onOpen={() => openFiche(p.id)}
              >
                {p.telephone && <a href={telLink(p.telephone)} className="chip">Appeler</a>}
                <button className="chip" onClick={() => relanceFaite(p, "reporter")}>+2 j</button>
                <button className="chip-ok" onClick={() => relanceFaite(p, "fait")}>Fait ✓</button>
              </Ligne>
            ))}
            {d.devisSansRelance.map((p) => (
              <Ligne key={"dev" + p.id} icon="📄" titre={`Relancer le devis de ${p.nom}`} detail="Envoyé il y a plus d'une semaine, sans réponse" onOpen={() => openFiche(p.id)} />
            ))}
            {contactesAujourdhui < OBJECTIF_CONTACTS && d.aContacter.length > 0 && (
              <Ligne
                icon="🎯"
                titre={`Contacter ${OBJECTIF_CONTACTS - contactesAujourdhui} commerce${OBJECTIF_CONTACTS - contactesAujourdhui > 1 ? "s" : ""}`}
                detail={`${d.aContacter.length} dans ta liste « À contacter » : ${d.aContacter.slice(0, 3).map((p) => p.nom).join(", ")}${d.aContacter.length > 3 ? "…" : ""}`}
              >
                <Link href="/clients" className="chip">Ouvrir</Link>
              </Ligne>
            )}
            {d.aContacter.length === 0 && d.cibles > 0 && (
              <Ligne icon="🗺️" titre="Choisir des commerces à contacter" detail={`${d.cibles} commerces sans vrai site repérés sur la carte`}>
                <Link href="/carte" className="chip">Carte</Link>
              </Ligne>
            )}
            {persoAFaire.map((t) => (
              <Ligne key={t.id} icon="•" titre={t.titre} detail={t.jour < today ? `depuis le ${dateCourte(t.jour)}` : undefined}>
                <button className="chip" onClick={async () => { await deleteTachePerso(t.id); charger(); }} aria-label="Supprimer">×</button>
                <button className="chip-ok" onClick={async () => { await setTachePerso(t.id, true); charger(); }}>Fait ✓</button>
              </Ligne>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!nouvelle.trim()) return;
              await addTachePerso(nouvelle.trim());
              setNouvelle("");
              charger();
            }}
          >
            <input className="input" placeholder="Ajouter une tâche…" value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} />
            <button className="btn shrink-0">Ajouter</button>
          </form>
        </section>

        {/* Fait aujourd'hui */}
        <section className="rise glass rounded-2xl p-4 sm:p-5">
          <h3 className="font-display mb-3 text-lg font-semibold">Fait aujourd'hui</h3>
          {faitsAujourdhui.length + persoFaites.length === 0 ? (
            <p className="text-sm text-muted">Rien encore. Chaque appel, passage ou note apparaîtra ici.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {persoFaites.map((t) => (
                <li key={t.id} className="flex gap-2 text-muted">
                  <span className="text-profit">✓</span>
                  <span className="line-through">{t.titre}</span>
                </li>
              ))}
              {faitsAujourdhui.map((a) => (
                <li key={a.id} className="flex gap-2">
                  <span className="w-11 shrink-0 text-xs leading-5 text-muted">{heure(a.created_at)}</span>
                  <button onClick={() => openFiche(a.prospect_id)} className="min-w-0 text-left">
                    <span className="font-medium">{a.prospects?.nom}</span> <span className="text-muted">· {a.texte}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Cette semaine : {contactsSemaine} commerces contactés · {d.reperes} repérés au total
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, cls, href }: { label: string; value: string; cls: string; href?: string }) {
  const inner = (
    <>
      <div className="text-[11px] text-muted sm:text-sm">{label}</div>
      <div className={`text-glow mt-1 truncate text-xl font-bold sm:text-3xl ${cls}`}>{value}</div>
    </>
  );
  return href ? (
    <Link href={href} className="glass rounded-2xl p-3 hover:border-gold/30 sm:p-5">{inner}</Link>
  ) : (
    <div className="glass rounded-2xl p-3 sm:p-5">{inner}</div>
  );
}

function Ligne({
  icon,
  titre,
  detail,
  alert,
  onOpen,
  children,
}: {
  icon: string;
  titre: string;
  detail?: string;
  alert?: boolean;
  onOpen?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 sm:flex-nowrap">
      <span className="w-5 shrink-0 text-center">{icon}</span>
      <button onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left">
        <div className="text-sm font-medium">{titre}</div>
        {detail && <div className={`mt-0.5 text-xs ${alert ? "text-alert" : "text-muted"}`}>{detail}</div>}
      </button>
      {children && <div className="flex w-full justify-end gap-1.5 sm:w-auto">{children}</div>}
    </li>
  );
}
