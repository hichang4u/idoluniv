"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// 그룹 공간의 [게시판 | 라운지] 탭. 글 상세·글쓰기 같은 하위 화면에서는 숨긴다.
export function GroupTabs({ slug, name }: { slug: string; name: string }) {
  const pathname = usePathname();
  const base = `/g/${slug}`;
  const tabs = [
    { href: base, label: "게시판", active: pathname === base },
    { href: `${base}/lounge`, label: "라운지", active: pathname === `${base}/lounge` },
  ];
  if (!tabs.some((t) => t.active)) return null;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold break-keep">{name}</h1>
      <nav aria-label={`${name} 메뉴`} className="flex border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "relative flex h-11 flex-1 items-center justify-center text-sm",
              tab.active
                ? "font-semibold text-foreground after:absolute after:inset-x-1/3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
