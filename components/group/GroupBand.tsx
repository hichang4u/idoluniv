import Link from "next/link";
import { FileText, Feather, Pencil } from "lucide-react";
import { GroupAvatar } from "@/components/group/GroupAvatar";

interface GroupBandProps {
  slug: string;
  name: string;
  colorKey: string;
  postCount: number;
  fanficCount: number;
}

// 게시판 머리의 그룹 띠 (목업 01): 옅은 그룹 면 + 타일 + 이름·비공식 + 지표 + 글쓰기.
// 그룹 색은 이 띠와 글쓰기 버튼, 탭 밑줄에만 쓴다. 파스텔 버튼은 흰 목록이 아니라 띠 위에 둔다 (TOKENS §3.2 한계)
export function GroupBand({ slug, name, colorKey, postCount, fanficCount }: GroupBandProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 bg-group-soft px-4 pt-3 pb-3.5">
      <GroupAvatar name={name} colorKey={colorKey} className="size-[46px] text-[19px]" />
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-1.5 text-[17px] leading-snug font-bold tracking-[-0.02em] text-text-strong">
          <span className="truncate">{name}</span>
          <span className="shrink-0 rounded-[4px] border border-line-strong px-1 text-[10.5px] leading-4 font-semibold tracking-normal text-text-subtle">
            비공식
          </span>
        </h2>
        <p className="mt-0.5 flex items-center gap-2.5 text-[12.5px] text-text-subtle tabular-nums">
          <span className="inline-flex items-center gap-[3px]">
            <FileText className="size-3.5" aria-hidden="true" />
            <span className="sr-only">게시글</span>
            {postCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-[3px]">
            <Feather className="size-3.5" aria-hidden="true" />
            팬픽 {fanficCount.toLocaleString()}
          </span>
        </p>
      </div>
      <Link
        href={`/g/${slug}/write`}
        // 보이는 높이 40px, 누르는 영역 44px
        className="relative inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-group-solid px-3.5 text-sm font-semibold text-group-on-solid transition-[filter] after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Pencil className="size-[18px]" aria-hidden="true" />
        글쓰기
      </Link>
    </div>
  );
}
