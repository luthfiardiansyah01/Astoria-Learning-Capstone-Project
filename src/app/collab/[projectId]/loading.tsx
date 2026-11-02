export default function ProjectLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-56 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    </main>
  );
}
