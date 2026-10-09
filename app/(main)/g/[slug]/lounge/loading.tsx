import { Skeleton } from "@/components/ui/skeleton";

// 렌더 중 Math.random() 은 순수하지 않으므로(react-hooks/purity) 고정 폭을 쓴다
const MESSAGE_WIDTHS = [62, 45, 78, 53, 70, 41];

// 라운지 본문과 같은 높이·입력 높이(h-11)로 맞춘다 (그룹 이름·탭은 레이아웃이 그린다)
export default function LoungeLoading() {
  return (
    <div className="flex h-[calc(100dvh-178px)] min-h-80 flex-col lg:h-[calc(100dvh-194px)]" aria-busy="true" aria-label="라운지 불러오는 중">
      <div className="flex-1 space-y-4 overflow-hidden rounded-xl border border-border bg-card p-4">
        {MESSAGE_WIDTHS.map((width, i) => (
          <div key={i} className="flex items-start gap-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4" style={{ width: `${width}%` }} />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="mt-3 h-11 w-full rounded-lg" />
    </div>
  );
}
