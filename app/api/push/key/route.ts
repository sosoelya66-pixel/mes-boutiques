// Donne la clé publique des notifications au téléphone (elle est publique par nature).
export const dynamic = "force-dynamic";

export function GET() {
  const key = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return Response.json({ key });
}
