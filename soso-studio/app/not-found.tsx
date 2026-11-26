import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-4xl italic text-champagne">Page introuvable</h1>
      <Link href="/" className="btn-primary">
        Retour à ta journée
      </Link>
    </main>
  );
}
