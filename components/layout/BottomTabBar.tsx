"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** 라운지·글 상세는 입력창을 바닥에 붙이기 위해 탭바를 숨긴다 (TECH-DESIGN §6.5, 목업 02·03) */
export function isTabBarHidden(pathname: string) {
  return /^\/g\/[^/]+\/(lounge|posts\/[^/]+)$/.test(pathname);
}

// 모바일 하단 탭바 3칸 (F9-5, D-16). 데스크톱은 사이드바가 같은 목록을 쓴다.
// 높이 60px + 홈 인디케이터 영역 (TOKENS §5). 활성은 굵기·선 굵기로도 구분한다(색만으로 전달하지 않음)
export function BottomTabBar() {
  const pathname = usePathname();
  if (isTabBarHidden(pathname)) return null;

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-[60px] grid-cols-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors",
                  active ? "font-semibold text-text-strong" : "font-medium text-text-subtle"
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
