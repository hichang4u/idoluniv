import { Skeleton } from "@/components/ui/skeleton";

// 렌더 중 Math.random() 은 순수하지 않으므로(react-hooks/purity) 고정 폭을 쓴다
const LINE_WIDTHS = [92, 78, 97, 71, 88, 74];

// 글 상세 화면(목업 02)과 같은 뼈대: 상단 바 · 본문 · 댓글
export default function PostDetailLoading() {
  return (
    <div aria-busy="true" aria-label="글 불러오는 중">
      <div className="flex h-[50px] items-center bg-card px-4 md:mb-2 md:h-11 md:bg-transparent md:px-0">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid gap-2.5 bg-card px-4 pt-4 pb-3.5 md:rounded-2xl md:px-5 md:pt-5">
        <Skeleton className="h-6 w-4/5" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="space-y-2 pt-1">
          {LINE_WIDTHS.map((width, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${width}%` }} />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          {[64, 76, 56].map((w, i) => (
            <Skeleton key={i} className="h-9 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="mt-2 space-y-3 bg-card px-4 pt-3 pb-5 md:rounded-2xl md:px-5">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2.5">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
