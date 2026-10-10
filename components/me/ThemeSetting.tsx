"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon } from "lucide-react";
import { IconChip } from "@/components/common/IconChip";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
] as const;

const subscribe = () => () => {};

/** 화면 모드: 시스템 / 라이트 / 다크 (TOKENS §7). 선택은 next-themes 가 이 기기에 저장한다 */
export function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  // 서버 렌더에서는 저장된 선택을 모르므로 클라이언트에서만 선택 상태를 그린다(하이드레이션 불일치 방지)
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const current = isClient ? (theme ?? "system") : null;

  // 설정 행 하나 (목업 08): 라벤더 칩 + "화면 모드" + 오른쪽 세그먼트
  return (
    <fieldset className="flex min-h-[50px] items-center gap-3 px-4 py-1.5">
      <legend className="sr-only">화면 모드</legend>
      <IconChip icon={Moon} color="lavender" size="sm" />
      <span className="text-[15px] text-text-strong" aria-hidden="true">
        화면 모드
      </span>
      <div className="ml-auto inline-flex rounded-full bg-surface-2 p-0.5">
        {OPTIONS.map(({ value, label }) => (
          <label key={value} className="relative cursor-pointer after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']">
            <input
              type="radio"
              name="theme"
              value={value}
              checked={current === value}
              onChange={() => setTheme(value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "block rounded-full px-2.5 py-1 text-[12.5px] text-text-subtle transition-colors",
                "peer-checked:bg-card peer-checked:font-semibold peer-checked:text-text-strong peer-checked:shadow-[0_1px_2px_rgb(0_0_0/0.08)]",
                "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
              )}
            >
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
