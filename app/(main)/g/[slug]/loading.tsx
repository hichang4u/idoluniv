import { Skeleton } from "@/components/ui/skeleton";

// 게시판 화면(목업 01)과 같은 뼈대: 상단 바 · 그룹 띠 · 탭 · 칩 · 목록 행
export default function BoardLoading() {
  return (
    <div aria-busy="true" aria-label="게시판 불러오는 중">
      <div className="flex h-[50px] items-center bg-card px-4 md:mb-2 md:h-11 md:bg-transparent md:px-0">
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="md:overflow-hidden md:rounded-2xl">
        <div className="flex items-center gap-3 bg-group-soft px-4 pt-3 pb-3.5">
          <Skeleton className="size-[46px] rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="h-11 border-b border-border bg-card" />
        <div className="flex gap-1.5 bg-card px-4 py-2.5">
          {[56, 72, 56].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <div className="bg-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-border px-4 py-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-11 w-[42px] rounded-[10px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
