// Recherche de commerces avec l'API officielle Google Places (Text Search).
// La clé Google reste sur le serveur. Chaque recherche est comptée et limitée par jour.
import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/supabase/server";
import { CATEGORIES, GOOGLE_COUT_REQUETE, QUARTIERS } from "@/lib/lille";
import { jourParis } from "@/lib/format";
import { siteEtat } from "@/lib/site";

export const maxDuration = 30;

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

type GPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
};

export async function POST(req: Request) {
  const auth = await allowedUser();
  if (!auth) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { supabase } = auth;

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "La clé Google (GOOGLE_PLACES_API_KEY) n'est pas encore ajoutée dans Vercel." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { categorie?: string; quartier?: string; pages?: number };
  const cat = CATEGORIES.find((c) => c.id === body.categorie);
  const q = QUARTIERS.find((x) => x.id === body.quartier);
  if (!cat || !q) return NextResponse.json({ error: "Type de commerce ou quartier inconnu." }, { status: 400 });
  const pages = Math.min(Math.max(body.pages ?? 3, 1), 3);

  // Limite du jour
  const jour = jourParis();
  const { data: reg } = await supabase.from("reglages").select("limite_google_jour").maybeSingle();
  const limite = reg?.limite_google_jour ?? 20;
  const { data: conso } = await supabase.from("conso").select("requetes, cout").eq("jour", jour).eq("service", "google_places").maybeSingle();
  const deja = conso?.requetes ?? 0;
  if (deja >= limite)
    return NextResponse.json(
      { error: `Limite du jour atteinte (${limite} recherches Google). Tu peux la changer dans Réglages.` },
      { status: 429 }
    );

  const places: GPlace[] = [];
  let token: string | undefined;
  let requetes = 0;
  try {
    for (let i = 0; i < pages && deja + requetes < limite; i++) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
        body: JSON.stringify({
          textQuery: `${cat.requete} ${q.label} Lille`,
          languageCode: "fr",
          regionCode: "FR",
          pageSize: 20,
          locationBias: { circle: { center: { latitude: q.lat, longitude: q.lng }, radius: 1200 } },
          ...(token ? { pageToken: token } : {}),
        }),
      });
      requetes++;
      const json = (await res.json()) as { places?: GPlace[]; nextPageToken?: string; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? `Erreur Google ${res.status}`);
      places.push(...(json.places ?? []));
      token = json.nextPageToken;
      if (!token) break;
    }
  } catch (e) {
    await compter(supabase, jour, deja, conso?.cout ?? 0, requetes);
    return NextResponse.json({ error: `Google a répondu : ${(e as Error).message}` }, { status: 502 });
  }
  await compter(supabase, jour, deja, conso?.cout ?? 0, requetes);

  // Enregistrement (sans toucher à l'étape, aux notes ni aux rappels déjà saisis)
  const now = new Date().toISOString();
  const rows = places
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.location)
    .map((p) => ({
      place_id: p.id,
      nom: p.displayName?.text ?? "Sans nom",
      categorie: cat.id,
      quartier: q.label,
      adresse: p.formattedAddress ?? null,
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      telephone: p.nationalPhoneNumber ?? null,
      site: p.websiteUri ?? null,
      site_etat: siteEtat(p.websiteUri),
      note_google: p.rating ?? null,
      nb_avis: p.userRatingCount ?? null,
      maps_url: p.googleMapsUri ?? null,
      google_maj: now,
      source: "google",
    }));

  // Combien sont nouveaux ?
  const ids = rows.map((r) => r.place_id);
  const { data: existants } = ids.length ? await supabase.from("prospects").select("place_id").in("place_id", ids) : { data: [] };
  const nouveaux = rows.length - (existants?.length ?? 0);

  if (rows.length) {
    const { error } = await supabase.from("prospects").upsert(rows, { onConflict: "owner_id,place_id" });
    if (error) return NextResponse.json({ error: `Enregistrement impossible : ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    trouves: rows.length,
    nouveaux,
    requetes,
    cout: +(requetes * GOOGLE_COUT_REQUETE).toFixed(3),
    restant: Math.max(0, limite - deja - requetes),
  });
}

async function compter(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").serverSupabase>>,
  jour: string,
  deja: number,
  coutDeja: number,
  requetes: number
) {
  if (!requetes) return;
  await supabase.from("conso").upsert(
    { jour, service: "google_places", requetes: deja + requetes, cout: +(coutDeja + requetes * GOOGLE_COUT_REQUETE).toFixed(3) },
    { onConflict: "owner_id,jour,service" }
  );
}
