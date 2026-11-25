// Notifications sur le téléphone (Web Push).
import "server-only";
import webpush from "web-push";
import { admin, getOwnerId } from "@/lib/supabase/admin";

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

function configured() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:" + (process.env.ALLOWED_EMAIL || "contact@example.com"), pub, priv);
  return true;
}

/** Envoie une notification à tous les appareils inscrits. Renvoie le nombre d'appareils touchés. */
export async function sendPush(msg: PushMessage) {
  if (!configured()) throw new Error("Notifications non configurées : clés VAPID manquantes dans Vercel.");
  const owner = await getOwnerId();
  const { data: subs, error } = await admin()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("owner_id", owner);
  if (error) throw new Error(error.message);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(msg),
        { TTL: 60 * 60 * 24 }
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // Appareil désinscrit ou notifications désactivées : on l'oublie
      if (code === 404 || code === 410) await admin().from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return sent;
}

/** Une fois par jour (à partir de 9 h, heure de Paris) : rappel des colis vendus depuis plus de 2 jours. */
export async function sendReminderIfDue() {
  if (!configured()) return;
  const owner = await getOwnerId();
  const paris = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  if (paris.getHours() < 9) return;
  const today = `${paris.getFullYear()}-${String(paris.getMonth() + 1).padStart(2, "0")}-${String(paris.getDate()).padStart(2, "0")}`;
  const db = admin();
  const { data: state } = await db.from("sync_state").select("derniere_relance").eq("owner_id", owner).maybeSingle();
  if (state?.derniere_relance === today) return;
  const limit = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { count } = await db
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", owner)
    .eq("statut", "a_envoyer")
    .lt("date_vente", limit);
  await db.from("sync_state").upsert({ owner_id: owner, derniere_relance: today });
  if (count && count > 0) {
    await sendPush({
      title: "📦 Colis en attente",
      body: `${count} colis vendu${count > 1 ? "s" : ""} depuis plus de 2 jours n'${count > 1 ? "ont" : "a"} pas encore été envoyé${count > 1 ? "s" : ""}.`,
      url: "/aujourdhui",
      tag: "rappel-colis",
    });
  }
}
