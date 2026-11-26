// Lecture et écriture des données depuis le navigateur (chaque table est protégée : tu ne vois que les tiennes).
import { supabase } from "./supabase/client";
import { jourParis } from "./format";
import { statutInfo, type Activite, type Prospect, type Reglages, type Statut, type TachePerso } from "./types";

function check<T>(r: { data: T; error: { message: string } | null }) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export async function loadProspects(): Promise<Prospect[]> {
  const all: Prospect[] = [];
  for (let from = 0; ; from += 1000) {
    const page = check(await supabase.from("prospects").select("*").order("updated_at", { ascending: false }).range(from, from + 999)) as Prospect[];
    all.push(...page);
    if (page.length < 1000) return all;
  }
}

export async function updateProspect(id: string, patch: Partial<Prospect>) {
  return check(await supabase.from("prospects").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single()) as Prospect;
}

export async function createProspect(p: Partial<Prospect>) {
  return check(await supabase.from("prospects").insert({ source: "manuel", ...p }).select().single()) as Prospect;
}

export async function deleteProspect(id: string) {
  check(await supabase.from("prospects").delete().eq("id", id));
}

/** Change l'étape d'un commerce et le note dans son historique. */
export async function setStatut(p: Prospect, statut: Statut) {
  const r = await updateProspect(p.id, { statut });
  await addActivite(p.id, "statut", `Étape : ${statutInfo(p.statut).label} → ${statutInfo(statut).label}`);
  return r;
}

export async function loadActivites(prospectId: string): Promise<Activite[]> {
  return check(await supabase.from("activites").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false })) as Activite[];
}

/** Activité depuis une date (ex. aujourd'hui) avec le nom du commerce */
export async function loadActivitesDepuis(iso: string): Promise<(Activite & { prospects: { nom: string } | null })[]> {
  return check(
    await supabase.from("activites").select("*, prospects(nom)").gte("created_at", iso).order("created_at", { ascending: false }).limit(200)
  ) as (Activite & { prospects: { nom: string } | null })[];
}

export async function addActivite(prospectId: string, type: string, texte: string) {
  check(await supabase.from("activites").insert({ prospect_id: prospectId, type, texte }));
}

export async function deleteActivite(id: string) {
  check(await supabase.from("activites").delete().eq("id", id));
}

export async function loadTachesPerso(): Promise<TachePerso[]> {
  const today = jourParis();
  // Tâches pas encore faites (y compris des jours précédents) + celles faites aujourd'hui
  return check(
    await supabase.from("taches").select("*").or(`fait.eq.false,fait_le.gte.${today}T00:00:00`).lte("jour", today).order("created_at")
  ) as TachePerso[];
}

export async function addTachePerso(titre: string, jour = jourParis()) {
  return check(await supabase.from("taches").insert({ titre, jour }).select().single()) as TachePerso;
}

export async function setTachePerso(id: string, fait: boolean) {
  check(await supabase.from("taches").update({ fait, fait_le: fait ? new Date().toISOString() : null }).eq("id", id));
}

export async function deleteTachePerso(id: string) {
  check(await supabase.from("taches").delete().eq("id", id));
}

const REGLAGES_DEFAUT: Reglages = { prenom: "", ville: "Lille", limite_google_jour: 20 };

export async function loadReglages(): Promise<Reglages> {
  const r = check(await supabase.from("reglages").select("prenom, ville, limite_google_jour").maybeSingle()) as Reglages | null;
  return r ?? REGLAGES_DEFAUT;
}

export async function saveReglages(r: Reglages) {
  check(await supabase.from("reglages").upsert({ ...r, updated_at: new Date().toISOString() }));
}

export type Conso = { jour: string; service: string; requetes: number; cout: number };

export async function loadConso(depuis: string): Promise<Conso[]> {
  return check(await supabase.from("conso").select("jour, service, requetes, cout").gte("jour", depuis).order("jour")) as Conso[];
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
