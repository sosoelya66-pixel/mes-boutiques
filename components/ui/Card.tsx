export function Card({
  title,
  right,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rise rounded-2xl border border-line bg-card p-5 sm:p-6 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
          {right && <div className="text-sm text-muted">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
