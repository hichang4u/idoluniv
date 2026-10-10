"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { GroupAvatar } from "@/components/group/GroupAvatar";
import { formatRelative } from "@/lib/format";
import { getRecentGroups, getServerRecentGroups, subscribeRecentGroups } from "@/lib/recent-groups";

// 최근 방문한 그룹 · 이 기기 (목업 08). 그룹 카드는 자기 그룹의 옅은 면 위에 타일 + 이름 + 다녀간 때
export function RecentGroups() {
  const groups = useSyncExternalStore(subscribeRecentGroups, getRecentGroups, getServerRecentGroups);

  return (
    <section aria-labelledby="recent-h" className="mt-2 bg-card md:rounded-2xl">
      <h2 id="recent-h" className="flex items-center gap-1.5 px-4 pt-3.5 pb-1.5 text-[13px] font-semibold text-text-subtle">
        <History className="size-3.5" aria-hidden="true" />
        최근 방문한 그룹 · 이 기기
      </h2>
      {groups.length === 0 ? (
        <p className="px-4 pt-1 pb-4 text-[13px] text-text-subtle">
          아직 들른 그룹이 없어요.{" "}
          <Link href="/g" className="font-medium text-text-strong underline underline-offset-[3px]">
            그룹 둘러보기
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 px-4 pt-0.5 pb-3.5">
          {groups.slice(0, 3).map((g) => (
            <li key={g.slug} className="min-w-0">
              <Link
                href={`/g/${g.slug}`}
                data-group-color={g.colorKey}
                className="grid min-w-0 justify-items-start gap-1 rounded-[14px] bg-group-soft px-2.5 py-3 transition-[filter] hover:brightness-[0.98]"
              >
                <GroupAvatar name={g.name} colorKey={g.colorKey} className="mb-1 size-9 rounded-[10px] text-[15px]" />
                <b className="w-full truncate text-sm font-semibold text-text-strong">{g.name}</b>
                <small className="text-[11.5px] text-text-subtle" suppressHydrationWarning>
                  {formatRelative(new Date(g.at).toISOString())}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
