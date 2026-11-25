// Préparation d'une fiche en arrière-plan, étape par étape (texte, puis une photo par étape).
// Chaque étape tourne dans sa propre exécution serveur et déclenche la suivante :
// on peut fermer l'appli pendant ce temps.
import "server-only";
import { sendPush } from "@/lib/push";
import { admin, getOwnerId } from "@/lib/supabase/admin";
import { htmlToText } from "@/lib/sync/run";
import { humanError } from "./errors";
import { generateFiche, readProductPage } from "./generate";
import { generateWornPhoto } from "./photos";

export type JobParams = {
  shop_id: string;
  lien: string | null;
  produit: string[]; // photos du produit fournies par l'utilisateur
  marque: string | null;
  etat: string | null;
  prix_achat: number | null;
  notes: string | null;
  nb_photos: number;
};

type Gen = {
  statut: "en_cours" | "termine" | "erreur";
  etape: string;
  photos_prevues: number;
  photos_faites: number;
  erreurs: string[];
  params: JobParams;
  ref_images: string[]; // images servant de modèle pour les photos portées
  portees: string[]; // photos portées déjà générées
};

async function load(id: string) {
  const owner = await getOwnerId();
  const { data, error } = await admin()
    .from("listings")
    .select("id, titre, generation")
    .eq("id", id)
    .eq("owner_id", owner)
    .single();
  if (error || !data) throw new Error("Fiche introuvable.");
  return data as { id: string; titre: string; generation: Gen };
}

async function save(id: string, patch: Record<string, unknown>) {
  const { error } = await admin().from("listings").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Crée la fiche « en préparation » et renvoie son id. */
export async function createJob(p: JobParams) {
  const owner = await getOwnerId();
  const gen: Gen = {
    statut: "en_cours",
    etape: "Claude rédige la fiche",
    photos_prevues: p.nb_photos,
    photos_faites: 0,
    erreurs: [],
    params: p,
    ref_images: p.produit,
    portees: [],
  };
  const { data, error } = await admin()
    .from("listings")
    .insert({
      owner_id: owner,
      shop_id: p.shop_id,
      titre: "✨ Fiche en préparation…",
      photos: p.produit,
      liens_produit: p.lien ? [p.lien] : [],
      prix_achat: p.prix_achat ?? 0,
      statut: "brouillon",
      generation: gen,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Étape 1 : texte. Renvoie true s'il faut enchaîner sur les photos. */
export async function runTextStep(id: string) {
  const { generation: g } = await load(id);
  const p = g.params;
  try {
    let taille: string | null = null;
    const { data: shop } = await admin().from("shops").select("taille").eq("id", p.shop_id).maybeSingle();
    taille = shop?.taille ?? null;
    const page = p.lien ? await readProductPage(p.lien, htmlToText) : null;
    const f = await generateFiche({ lien: p.lien, page, photos: p.produit, taille, marque: p.marque, etat: p.etat, prix_achat: p.prix_achat, notes: p.notes });
    const ref = p.produit.length ? p.produit : page?.images.slice(0, 1) ?? [];
    const notes = [`💡 ${f.conseil}`, p.lien && !page ? "Page produit illisible : fiche rédigée d'après les photos." : ""].filter(Boolean).join("\n");
    const photosNext = p.nb_photos > 0 && ref.length > 0;
    const erreurs = p.nb_photos > 0 && !ref.length ? ["Aucune photo du produit : photos portées impossibles."] : [];
    await save(id, {
      titre: f.titre,
      description: f.description,
      marque: f.marque,
      categorie: f.categorie,
      couleur: f.couleur,
      matiere: f.matiere,
      etat: f.etat,
      prix: f.prix_conseille,
      prix_achat: p.prix_achat ?? f.prix_achat_trouve ?? 0,
      notes,
      generation: {
        ...g,
        ref_images: ref,
        erreurs,
        statut: photosNext ? "en_cours" : erreurs.length ? "erreur" : "termine",
        etape: photosNext ? `Photo 1/${p.nb_photos}` : "Terminé",
      },
    });
    if (!photosNext) await notifyDone(id);
    return photosNext;
  } catch (e) {
    await save(id, { generation: { ...g, statut: "erreur", etape: "Échec de la rédaction", erreurs: [humanError(e, "Claude")] } });
    return false;
  }
}

/** Étape photo n° i (0, 1, 2…). Renvoie true s'il reste des photos à faire. */
export async function runPhotoStep(id: string, i: number) {
  const { titre, generation: g } = await load(id);
  const p = g.params;
  let portees = g.portees;
  const erreurs = [...g.erreurs];
  try {
    const url = await generateWornPhoto({ shopId: p.shop_id, productImages: g.ref_images, pose: i, article: titre });
    portees = [...portees, url];
  } catch (e) {
    erreurs.push(`Photo ${i + 1} : ${humanError(e, "OpenAI")}`);
  }
  const more = i + 1 < p.nb_photos;
  await save(id, {
    // Les photos portées passent devant ; les photos produit restent à la fin
    photos: [...portees, ...p.produit],
    generation: {
      ...g,
      portees,
      erreurs,
      photos_faites: portees.length,
      statut: more ? "en_cours" : erreurs.length && !portees.length ? "erreur" : "termine",
      etape: more ? `Photo ${i + 2}/${p.nb_photos}` : "Terminé",
    },
  });
  if (!more) await notifyDone(id);
  return more;
}

async function notifyDone(id: string) {
  try {
    const { titre, generation: g } = await load(id);
    await sendPush({
      title: g.statut === "erreur" ? "⚠️ Fiche à vérifier" : "✨ Fiche prête",
      body: `${titre}${g.photos_faites ? ` · ${g.photos_faites} photo${g.photos_faites > 1 ? "s" : ""}` : ""}`,
      url: `/fiches?fiche=${id}`,
      tag: `fiche-${id}`,
    });
  } catch {
    // notifications non configurées : pas grave
  }
}
