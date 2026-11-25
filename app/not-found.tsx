import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="rise glass max-w-sm rounded-2xl p-8 text-center">
        <div className="flex justify-center">
          <Logo size={44} />
        </div>
        <h1 className="mt-4 text-xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted">Le lien est peut-être ancien ou mal copié.</p>
        <Link href="/aujourdhui" className="btn-primary mt-6">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
