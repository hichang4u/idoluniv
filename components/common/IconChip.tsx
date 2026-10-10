import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupColorKey } from "@/lib/group-colors";

const SIZES = {
  md: "size-8 rounded-[10px] [&_svg]:size-[18px]",
  sm: "size-[30px] rounded-[9px] [&_svg]:size-4",
  xs: "size-[22px] rounded-[7px] [&_svg]:size-3.5",
} as const;

// 파스텔 아이콘 칩 (TOKENS §6.0): 팔레트 한 색의 옅은 면(soft-strong) + 진한 톤 아이콘.
// 칩마다 색을 하나씩 고정해 쓴다(예: 화면 모드=라벤더, 가이드라인=민트). 장식이므로 aria-hidden
export function IconChip({
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  color: GroupColorKey;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      data-group-color={color}
      aria-hidden="true"
      className={cn(
        "inline-grid shrink-0 place-items-center bg-group-soft-strong text-group-text",
        SIZES[size],
        className
      )}
    >
      <Icon strokeWidth={1.9} />
    </span>
  );
}
