export default function AnalyticsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-4">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
    </main>
  );
}
