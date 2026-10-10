"use client";

import { usePathname } from "next/navigation";
import { isTabBarHidden } from "@/components/layout/BottomTabBar";
import { cn } from "@/lib/utils";

// 본문 영역. 모바일은 여백 없이 화면 폭을 다 쓴다(목업: 상단 바·띠·목록이 화면 끝까지) — 여백은 각 화면이 둔다.
// 하단 탭바에 가리지 않도록 그 높이만큼 아래 여백을 둔다
export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const withTabBar = !isTabBarHidden(pathname);
  return (
    <div
      className={cn(
        "flex-1 md:p-4 lg:p-6",
        withTabBar && "pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-4 lg:pb-6"
      )}
    >
      {children}
    </div>
  );
}
