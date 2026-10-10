import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GroupAvatar } from "@/components/group/GroupAvatar";
import { TopBar } from "@/components/layout/TopBar";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";

export const metadata: Metadata = { title: "그룹" };

// 그룹 목록 (D-16). 각 그룹은 자기 파스텔 타일로 구분한다(TOKENS §3.2, 로고 없음 D-22)
export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: groups, error } = await supabase
    .from("idol_groups")
    .select("id, name, name_ko, slug, description, color_key")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;

  return (
    <div className="mx-auto max-w-[640px]">
      <TopBar big title="그룹" />

      {!groups?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>아직 열린 그룹이 없어요.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // 모바일은 화면 끝까지 이어지는 목록, 데스크톱은 카드 (게시판 목록과 같은 규칙)
        <ul className="divide-y divide-border bg-card md:overflow-hidden md:rounded-2xl md:shadow-card md:dark:shadow-none">
          {groups.map((group) => (
            <li key={group.id}>
              <Link href={`/g/${group.slug}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                <GroupAvatar name={group.name} colorKey={group.color_key} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-text-strong">
                    {group.name}
                    {group.name_ko && group.name_ko !== group.name && (
                      <span className="ml-1.5 text-sm font-normal text-text-subtle">{group.name_ko}</span>
                    )}
                  </span>
                  {group.description && (
                    <span className="block truncate text-[13px] text-text-subtle">{group.description}</span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
