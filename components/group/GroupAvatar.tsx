import { cn } from "@/lib/utils";

// 그룹 타일: 그룹 파스텔 면 + 잉크 첫 글자 (TOKENS §3.2). 로고·공식 사진은 쓰지 않는다(D-22).
// data-group-color 를 자기 자신에 붙여 어느 화면에서든 그 그룹 색으로 그린다.
export function GroupAvatar({
  name,
  colorKey,
  className,
}: {
  name: string;
  colorKey: string;
  className?: string;
}) {
  return (
    <span
      data-group-color={colorKey}
      aria-hidden="true"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-group-solid text-base font-bold text-group-on-solid",
        className
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
