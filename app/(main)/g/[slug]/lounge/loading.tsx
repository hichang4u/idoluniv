import { Skeleton } from "@/components/ui/skeleton";

// 렌더 중 Math.random() 은 순수하지 않으므로(react-hooks/purity) 고정 폭을 쓴다
const MESSAGE_WIDTHS = [62, 45, 78, 53, 70, 41];

// 라운지 화면(목업 03)과 같은 뼈대·높이: 상단 바 · 탭 · 메시지 · 입력 바 (page.tsx LOUNGE_HEIGHT 와 같은 값)
export default function LoungeLoading() {
  return (
    <div aria-busy="true" aria-label="라운지 불러오는 중">
      <div className="flex h-[50px] items-center bg-card px-4 md:mb-2 md:h-11 md:bg-transparent md:px-0">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="md:overflow-hidden md:rounded-2xl">
        <div className="h-11 border-b border-border bg-card" />
        <div className="flex h-[calc(100dvh-95px)] min-h-80 flex-col bg-card md:h-[calc(100dvh-179px)] lg:h-[calc(100dvh-195px)]">
          <div className="flex flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-2">
            {MESSAGE_WIDTHS.map((width, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4" style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border px-3 pt-2 pb-3.5">
            <Skeleton className="h-11 flex-1 rounded-full" />
            <Skeleton className="size-11 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
