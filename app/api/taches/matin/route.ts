// Chaque matin (tâche planifiée) : prépare les tâches du jour et envoie la notification.
import { bearerOk } from "@/lib/auth-server";
import { sendPush } from "@/lib/push";
import { admin, getOwnerId } from "@/lib/supabase/admin";
import { buildTaches, jourParis, type Tache } from "@/lib/taches";
import type { Listing, Sale, Shop } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function all<T>(table: string, owner: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin().from(table).select("*").eq("owner_id", owner).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function POST(req: Request) {
  if (!bearerOk(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const owner = await getOwnerId();
    const db = admin();
    const [shops, salesRaw, listingsRaw, emails, reglages] = await Promise.all([
      all<Shop>("shops", owner),
      all<Sale>("sales", owner),
      all<Listing>("listings", owner),
      db.from("email_log").select("id", { count: "exact", head: true }).eq("owner_id", owner).in("statut", ["a_verifier", "erreur"]),
      db.from("reglages").select("objectif_mensuel").eq("owner_id", owner).maybeSingle(),
    ]);
    const sales = salesRaw.map((s) => ({ ...s, prix: Number(s.prix), prix_achat: Number(s.prix_achat), frais: Number(s.frais) }));
    const listings = listingsRaw.map((l) => ({ ...l, prix: Number(l.prix), prix_achat: Number(l.prix_achat) }));
    const jour = jourParis();
    const { data: hier } = await db
      .from("taches")
      .select("*")
      .eq("owner_id", owner)
      .eq("jour", jourParis(new Date(Date.now() - 86400000)));
    const list = buildTaches({
      hier: (hier ?? []) as Tache[],
      shops: shops.filter((s) => s.actif),
      sales,
      listings,
      emailsAVerifier: emails.count ?? 0,
      objectifGlobal: reglages.data?.objectif_mensuel != null ? Number(reglages.data.objectif_mensuel) : null,
    });
    const { error } = await db
      .from("taches")
      .upsert(list.map((t) => ({ ...t, jour, owner_id: owner })), { onConflict: "owner_id,jour,cle", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    const { count } = await db.from("taches").select("id", { count: "exact", head: true }).eq("owner_id", owner).eq("jour", jour).eq("fait", false);
    const n = count ?? list.length;
    // La tâche planifiée tourne à 7 h et 8 h UTC (changement d'heure) : une seule notification, à 8 h à Paris
    const heureParis = Number(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris", hour: "numeric", hour12: false }));
    if (heureParis === 8 || new URL(req.url).searchParams.get("notifier") === "1")
      await sendPush({
      title: `📋 Tes ${n} tâche${n > 1 ? "s" : ""} du jour`,
      body: list.filter((t) => t.type === "creer").map((t) => t.titre).slice(0, 3).join(" · ") || list.slice(0, 3).map((t) => t.titre).join(" · "),
      url: "/aujourdhui",
      tag: `taches-${jour}`,
    }).catch(() => 0);
    return Response.json({ jour, taches: n });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
