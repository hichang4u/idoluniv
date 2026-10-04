// 렌더 중 Math.random() 은 순수하지 않으므로(react-hooks/purity) 고정 폭을 쓴다
const LINE_WIDTHS = [92, 78, 97, 71, 88, 74];

export default function PostDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="h-5 w-24 rounded-md bg-muted animate-pulse" />
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-7 w-4/5 rounded-md bg-muted animate-pulse" />
          <div className="flex gap-3">
            <div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
        <hr className="border-border" />
        <div className="space-y-2">
          {LINE_WIDTHS.map((width, i) => (
            <div key={i} className="h-4 rounded-md bg-muted animate-pulse" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="h-5 w-20 rounded-md bg-muted animate-pulse" />
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}
