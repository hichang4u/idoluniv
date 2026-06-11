export default function ChatRoomLoading() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 9rem)" }}>
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center gap-3 mb-3 shrink-0 animate-pulse">
        <div className="h-5 w-20 rounded bg-muted" />
        <div className="ml-auto flex items-center gap-2">
          <div className="size-6 rounded bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
      </div>

      {/* 메시지 영역 스켈레톤 */}
      <div className="flex-1 rounded-xl border border-border bg-card p-4 space-y-4 animate-pulse overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="size-7 rounded-full bg-muted shrink-0" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-3 w-10 rounded bg-muted" />
              </div>
              <div
                className="h-4 rounded bg-muted"
                style={{ width: `${Math.random() * 40 + 40}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 입력창 스켈레톤 */}
      <div className="flex gap-2 mt-3 animate-pulse">
        <div className="h-10 w-24 rounded-lg bg-muted" />
        <div className="flex-1 h-10 rounded-lg bg-muted" />
        <div className="h-10 w-12 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
