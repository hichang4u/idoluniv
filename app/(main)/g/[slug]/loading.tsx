export default function BoardLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-7 w-16 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <div className="flex gap-2">
              <div className="h-4 w-10 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-full rounded-md bg-muted animate-pulse" />
            <div className="flex gap-4 pt-1">
              <div className="h-3 w-12 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
