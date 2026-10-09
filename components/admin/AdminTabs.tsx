"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/reports", label: "신고 큐" },
  { href: "/admin/groups", label: "그룹" },
  { href: "/admin/log", label: "처리 기록" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="flex border-b border-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 flex-1 items-center justify-center text-sm",
              active
                ? "font-semibold text-foreground after:absolute after:inset-x-1/3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
