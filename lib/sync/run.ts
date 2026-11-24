// Synchronisation : lit les nouveaux e-mails Vinted de la boîte iCloud (lecture seule)
// et met à jour les ventes. Appelée toutes les 15 min et par le bouton « Synchroniser ».
import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import { admin, getOwnerId } from "@/lib/supabase/admin";
import { applyEmail, type MailMeta } from "./apply";
import { extractEmail } from "./extract";

const BATCH = 15; // e-mails traités au maximum par passage
const FIRST_SYNC_DAYS = 60; // à la première synchro, on remonte 60 jours

export type SyncSummary = {
  lus: number;
  traites: number;
  ignores: number;
  a_verifier: number;
  erreurs: number;
  restants: number;
  message: string;
};

const addrText = (a: AddressObject | AddressObject[] | undefined) =>
  (Array.isArray(a) ? a : a ? [a] : []).map((x) => x.text).join(", ");

function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function describe(mail: ParsedMail) {
  const html = typeof mail.html === "string" ? mail.html : "";
  const text = (mail.text?.trim() || htmlToText(html)).slice(0, 40000);
  const liens = [...new Set([...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]))]
    .filter((u) => u.startsWith("http"))
    .slice(0, 40);
  const images = [...new Set([...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]))]
    .filter((u) => u.startsWith("http"))
    .slice(0, 20);
  // En-têtes de destination : l'adresse iCloud de la boutique se trouve normalement ici
  const recipients = [
    addrText(mail.to),
    addrText(mail.cc),
    ...["delivered-to", "x-original-to", "envelope-to", "x-forwarded-to", "x-apple-original-to"].map((h) => {
      const v = mail.headers.get(h) as unknown;
      const one = (x: unknown): string =>
        typeof x === "string" ? x : x && typeof x === "object" && "text" in x ? String((x as { text: unknown }).text) : "";
      return Array.isArray(v) ? v.map(one).join(", ") : one(v);
    }),
  ].join(", ");
  const pdfs = mail.attachments
    .filter((a) => a.contentType === "application/pdf" || a.filename?.toLowerCase().endsWith(".pdf"))
    .map((a) => ({ filename: a.filename ?? "bordereau.pdf", content: a.content }));
  return { text, liens, images, recipients, pdfs };
}

export async function runSync(): Promise<SyncSummary> {
  const user = process.env.ICLOUD_EMAIL;
  const pass = process.env.ICLOUD_APP_PASSWORD;
  if (!user || !pass) throw new Error("Variables ICLOUD_EMAIL / ICLOUD_APP_PASSWORD manquantes dans Vercel.");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Variable ANTHROPIC_API_KEY manquante dans Vercel.");

  const owner = await getOwnerId();
  const db = admin();

  // Verrou simple : une seule synchro à la fois (libéré au bout de 6 min en cas de plantage)
  const { data: state } = await db.from("sync_state").select("*").eq("owner_id", owner).maybeSingle();
  if (state?.en_cours_depuis && Date.now() - new Date(state.en_cours_depuis).getTime() < 6 * 60000) {
    return { lus: 0, traites: 0, ignores: 0, a_verifier: 0, erreurs: 0, restants: 0, message: "Synchro déjà en cours." };
  }
  await db.from("sync_state").upsert({ owner_id: owner, en_cours_depuis: new Date().toISOString() });

  const sum: SyncSummary = { lus: 0, traites: 0, ignores: 0, a_verifier: 0, erreurs: 0, restants: 0, message: "" };
  const client = new ImapFlow({
    host: "imap.mail.me.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
  let lastUid = Number(state?.last_uid ?? 0);
  let uidValidity = state?.uidvalidity != null ? Number(state.uidvalidity) : null;
  let fatal: string | null = null;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const box = client.mailbox;
      if (!box) throw new Error("Boîte de réception introuvable.");
      const currentValidity = Number(box.uidValidity);
      if (uidValidity !== currentValidity) {
        lastUid = 0; // la boîte a été réindexée : on repart des 60 derniers jours
        uidValidity = currentValidity;
      }
      const query =
        lastUid > 0
          ? { uid: `${lastUid + 1}:*`, from: "vinted" }
          : { since: new Date(Date.now() - FIRST_SYNC_DAYS * 86400000), from: "vinted" };
      const found = ((await client.search(query, { uid: true })) || []).filter((u) => u > lastUid).sort((a, b) => a - b);
      const batch = found.slice(0, BATCH);
      sum.restants = found.length - batch.length;

      for (const uid of batch) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) {
          lastUid = uid;
          continue;
        }
        const mail = await simpleParser(msg.source);
        const messageId = mail.messageId ?? `uid-${currentValidity}-${uid}`;
        const from = addrText(mail.from);
        // E-mail déjà traité (ex. relance de la synchro) : on passe
        const { data: seen } = await db.from("email_log").select("id").eq("message_id", messageId).maybeSingle();
        if (seen || !/vinted/i.test(from)) {
          lastUid = uid;
          continue;
        }
        sum.lus++;
        const d = describe(mail);
        const date = mail.date ?? new Date();

        let data;
        try {
          data = await extractEmail({
            sujet: mail.subject ?? "",
            de: from,
            date: date.toISOString(),
            texte: d.text,
            liens: d.liens,
            images: d.images,
            pieces_jointes: mail.attachments.map((a) => `${a.filename ?? "?"} (${a.contentType})`),
          });
        } catch (e) {
          // Problème passager (API Claude) : on s'arrête là, cet e-mail sera relu au prochain passage
          fatal = "Lecture par Claude impossible : " + (e as Error).message;
          sum.erreurs++;
          break;
        }

        const meta: MailMeta = { messageId, date, recipients: d.recipients, text: d.text, pdfs: d.pdfs };
        const log = {
          owner_id: owner,
          message_id: messageId,
          recu_le: date.toISOString(),
          expediteur: from,
          destinataire: d.recipients.slice(0, 500),
          sujet: mail.subject ?? "",
          type: data.type,
          donnees: data,
        };
        try {
          const r = await applyEmail(owner, meta, data);
          await db.from("email_log").insert({ ...log, shop_id: r.shop_id, sale_id: r.sale_id, statut: r.statut, detail: r.detail });
          sum[r.statut === "traite" ? "traites" : r.statut === "ignore" ? "ignores" : "a_verifier"]++;
        } catch (e) {
          await db.from("email_log").insert({ ...log, statut: "erreur", detail: (e as Error).message });
          sum.erreurs++;
        }
        lastUid = uid;
      }
      if (!fatal && sum.restants === 0 && box.uidNext) lastUid = Math.max(lastUid, Number(box.uidNext) - 1);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e) {
    fatal = fatal ?? (e as Error).message;
    try {
      client.close();
    } catch {}
  }

  const now = new Date().toISOString();
  await db.from("sync_state").upsert({
    owner_id: owner,
    last_uid: lastUid,
    uidvalidity: uidValidity,
    derniere_synchro: now,
    derniere_erreur: fatal,
    en_cours_depuis: null,
  });
  await db.from("shops").update({ derniere_synchro: now }).eq("owner_id", owner);

  sum.message = fatal
    ? `Erreur : ${fatal}`
    : sum.lus === 0
      ? "Aucun nouvel e-mail Vinted."
      : `${sum.lus} e-mail(s) Vinted lu(s) : ${sum.traites} traité(s), ${sum.a_verifier} à vérifier, ${sum.ignores} ignoré(s)` +
        (sum.erreurs ? `, ${sum.erreurs} erreur(s)` : "") +
        (sum.restants ? `. Encore ${sum.restants} à lire : relance la synchro.` : ".");
  return sum;
}
