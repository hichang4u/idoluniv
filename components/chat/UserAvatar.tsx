import { GROUP_COLORS } from "@/lib/group-colors";
import { cn } from "@/lib/utils";

// 사람마다 고정된 파스텔 원 + 닉네임 첫 글자. 같은 사람은 항상 같은 색이라 대화에서 구분이 쉽다.
// 색은 신원 표시가 아니라 구분용이다(닉네임이 항상 함께 보인다).
function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GROUP_COLORS[h % GROUP_COLORS.length].key;
}

export function UserAvatar({ seed, name, className }: { seed: string; name: string | null; className?: string }) {
  return (
    <span
      data-group-color={colorFor(seed)}
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-group-solid text-xs font-semibold text-group-on-solid",
        className
      )}
    >
      {(name ?? "?").slice(0, 1)}
    </span>
  );
}
