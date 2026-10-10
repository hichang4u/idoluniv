import Link from "next/link";
import { List, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// 그룹 공간의 [게시판 | 라운지] 탭 (목업 01·03). 활성은 굵기 + 그룹의 진한 톤 밑줄(3px)
export function GroupTabs({ slug, name, active }: { slug: string; name: string; active: "board" | "lounge" }) {
  const base = `/g/${slug}`;
  const tabs = [
    { key: "board", href: base, label: "게시판", icon: List },
    { key: "lounge", href: `${base}/lounge`, label: "라운지", icon: MessagesSquare },
  ] as const;

  return (
    <nav aria-label={`${name} 메뉴`} className="flex shrink-0 border-b border-border bg-card">
      {tabs.map(({ key, href, label, icon: Icon }) => {
        const on = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex h-11 flex-1 items-center justify-center gap-1.5 text-sm transition-colors",
              on
                ? "font-semibold text-text-strong after:absolute after:inset-x-[32%] after:-bottom-px after:h-[3px] after:rounded-full after:bg-group-text"
                : "font-medium text-text-subtle hover:text-text-strong"
            )}
          >
            <Icon className="size-[18px]" strokeWidth={on ? 2.4 : 1.9} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
