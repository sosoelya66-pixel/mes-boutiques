export function ComingSoon({ title, step, items }: { title: string; step: number; items: string[] }) {
  return (
    <div className="rounded-2xl glass p-8">
      <div className="text-sm font-medium text-muted">Arrive à l&apos;étape {step}</div>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-muted">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
