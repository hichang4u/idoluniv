"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "시스템", Icon: Monitor },
  { value: "light", label: "라이트", Icon: Sun },
  { value: "dark", label: "다크", Icon: Moon },
] as const;

const subscribe = () => () => {};

/** 화면 모드: 시스템 / 라이트 / 다크 (TOKENS §7). 선택은 next-themes 가 이 기기에 저장한다 */
export function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  // 서버 렌더에서는 저장된 선택을 모르므로 클라이언트에서만 선택 상태를 그린다(하이드레이션 불일치 방지)
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const current = isClient ? (theme ?? "system") : null;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">화면 모드</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, label, Icon }) => (
          <label key={value} className="cursor-pointer">
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
                "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border text-sm text-muted-foreground transition-colors",
                "hover:text-text-strong peer-checked:border-ink peer-checked:bg-ink peer-checked:font-semibold peer-checked:text-on-ink",
                "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
