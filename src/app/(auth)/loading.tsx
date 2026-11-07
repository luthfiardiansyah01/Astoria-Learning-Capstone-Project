export default function AuthLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <div className="w-full space-y-4 rounded-2xl border p-6">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-muted" />
        <div className="mx-auto h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-primary/20" />
      </div>
    </main>
  );
}
