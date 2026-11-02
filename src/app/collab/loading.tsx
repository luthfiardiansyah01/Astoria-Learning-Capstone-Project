export default function CollabLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    </main>
  );
}
