import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  /** 화면 제목. big 이면 탭 첫 화면용 큰 제목(20/700) */
  title?: React.ReactNode;
  big?: boolean;
  /** 뒤로 갈 주소. 없으면 뒤로 버튼을 두지 않는다 */
  back?: string;
  backLabel?: string;
  /** 오른쪽 액션(44px 아이콘 버튼 등) */
  actions?: React.ReactNode;
  /** 화면의 주 제목이 따로 있으면(글 상세의 글 제목) "p" */
  titleAs?: "h1" | "p";
  className?: string;
}

// 화면마다 붙는 상단 바 (목업 01~08 `.bar`): 뒤로 + 제목 + 오른쪽 액션, 높이 50px (TOKENS §5).
// 모바일에서는 이 바가 화면 맨 위다(전역 헤더는 데스크톱만). 데스크톱에서는 전역 헤더 아래의 제목 줄이 된다.
export function TopBar({ title, big = false, back, backLabel = "뒤로", actions, titleAs: Title = "h1", className }: TopBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex h-[50px] shrink-0 items-center bg-card px-1 text-text-strong",
        "md:relative md:top-auto md:z-auto md:mb-2 md:h-11 md:bg-transparent md:px-0",
        !back && "pl-4 md:pl-0",
        className
      )}
    >
      {back && (
        <Link
          href={back}
          aria-label={backLabel}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted md:-ml-3"
        >
          <ChevronLeft className="size-[22px]" strokeWidth={1.9} aria-hidden="true" />
        </Link>
      )}
      <Title
        className={cn(
          "min-w-0 flex-1 truncate",
          big ? "text-xl font-bold tracking-[-0.02em]" : "text-base font-semibold"
        )}
      >
        {title}
      </Title>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </div>
  );
}
