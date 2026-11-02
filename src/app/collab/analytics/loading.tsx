export default function AnalyticsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-4">
      <div className="skeleton-shimmer relative overflow-hidden h-5 w-40 rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer relative overflow-hidden h-24 rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="skeleton-shimmer relative overflow-hidden h-64 rounded-xl border bg-muted/40" />
      <div className="skeleton-shimmer relative overflow-hidden h-64 rounded-xl border bg-muted/40" />
    </main>
  );
}
