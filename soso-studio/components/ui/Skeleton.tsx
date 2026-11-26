export function Skeleton({ h = 120 }: { h?: number }) {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass animate-pulse rounded-2xl" style={{ height: h }} />
      ))}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="glass rounded-2xl !border-alert/40 p-5 text-sm text-alert">
      <div className="font-semibold">Un problème est survenu</div>
      <div className="mt-1 text-white/80">{message}</div>
      <div className="mt-2 text-muted">
        Si c'est la première fois : vérifie que le fichier <code>supabase/schema.sql</code> a bien été lancé dans Supabase.
      </div>
    </div>
  );
}
