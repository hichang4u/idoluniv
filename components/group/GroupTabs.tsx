"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Feather, List, MessagesSquare, Pencil } from "lucide-react";
import { GroupAvatar } from "@/components/group/GroupAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GroupTabsProps {
  slug: string;
  name: string;
  colorKey: string;
  postCount: number;
  fanficCount: number;
}

// 그룹 공간의 머리: 게시판은 그룹 색 헤더 띠(타일·이름·지표·글쓰기), 라운지는 이름만 — 입력창 높이를 지키기 위해.
// 글 상세·글쓰기 같은 하위 화면에서는 숨긴다. 그룹 색은 띠와 글쓰기 버튼, 탭 밑줄에만 쓴다 (목업 01·03)
export function GroupTabs({ slug, name, colorKey, postCount, fanficCount }: GroupTabsProps) {
  const pathname = usePathname();
  const base = `/g/${slug}`;
  const tabs = [
    { href: base, label: "게시판", icon: List, active: pathname === base },
    { href: `${base}/lounge`, label: "라운지", icon: MessagesSquare, active: pathname === `${base}/lounge` },
  ];
  if (!tabs.some((t) => t.active)) return null;
  const onBoard = tabs[0].active;

  return (
    <div className="space-y-2">
      {onBoard ? (
        <div className="flex items-center gap-3 rounded-2xl bg-group-soft p-4">
          <GroupAvatar name={name} colorKey={colorKey} className="size-12 text-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 text-[17px] leading-snug font-bold text-text-strong">
              <span className="truncate">{name}</span>
              <span className="shrink-0 rounded-[4px] border border-group-text/30 px-1 text-[11px] leading-4 font-medium text-group-text">
                비공식
              </span>
            </h1>
            <p className="mt-0.5 flex items-center gap-2.5 text-[13px] text-text-subtle tabular-nums">
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3.5" aria-hidden="true" />
                <span className="sr-only">게시글</span>
                {postCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Feather className="size-3.5" aria-hidden="true" />
                팬픽 {fanficCount.toLocaleString()}
              </span>
            </p>
          </div>
          <Button
            size="touch"
            className="shrink-0 rounded-xl"
            nativeButton={false}
            render={
              <Link href={`${base}/write`}>
                <Pencil className="size-4" aria-hidden="true" />
                글쓰기
              </Link>
            }
          />
        </div>
      ) : (
        <h1 className="text-xl font-bold text-text-strong break-keep">{name}</h1>
      )}

      <nav aria-label={`${name} 메뉴`} className="flex border-b border-border">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 flex-1 items-center justify-center gap-1.5 text-sm",
              active
                ? "font-semibold text-text-strong after:absolute after:inset-x-1/3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-group-text"
                : "text-text-subtle hover:text-text-strong",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
