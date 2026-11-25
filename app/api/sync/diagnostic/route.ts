// Diagnostic : liste les 10 derniers e-mails de la boîte iCloud lue par l'appli (sans Claude, gratuit).
import { ImapFlow } from "imapflow";
import { userOk } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await userOk())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const user = process.env.ICLOUD_EMAIL;
  const pass = process.env.ICLOUD_APP_PASSWORD;
  if (!user || !pass) return Response.json({ error: "ICLOUD_EMAIL / ICLOUD_APP_PASSWORD manquants." }, { status: 500 });
  const client = new ImapFlow({ host: "imap.mail.me.com", port: 993, secure: true, auth: { user, pass }, logger: false });
  try {
    await client.connect();
    const boites = (await client.list()).map((b) => b.path);
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    const out: { date: string; de: string; a: string; sujet: string }[] = [];
    try {
      const total = client.mailbox ? client.mailbox.exists : 0;
      if (total > 0) {
        const from = Math.max(1, total - 9);
        for await (const m of client.fetch(`${from}:*`, { envelope: true })) {
          const e = m.envelope;
          out.push({
            date: e?.date ? new Date(e.date).toISOString() : "",
            de: (e?.from ?? []).map((x) => `${x.name ?? ""} <${x.address ?? ""}>`).join(", "),
            a: (e?.to ?? []).map((x) => x.address ?? "").join(", "),
            sujet: e?.subject ?? "",
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return Response.json({ compte: user, boites, derniers: out.reverse() });
  } catch (e) {
    try { client.close(); } catch {}
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
