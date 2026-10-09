import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GroupForm } from "@/components/admin/GroupForm";
import { Badge } from "@/components/ui/badge";
import { GROUP_COLORS } from "@/lib/group-colors";

export const metadata: Metadata = { title: "그룹" };

const SWATCH = new Map<string, string>(GROUP_COLORS.map((c) => [c.key, c.swatch]));

// 그룹 관리 (F8-4). 비활성 그룹도 보여 준다(idol_groups 는 전체 공개 읽기). 삭제는 없다.
export default async function AdminGroupsPage() {
  const supabase = await createClient();
  const { data: groups, error } = await supabase
    .from("idol_groups")
    .select("id, name, name_ko, slug, agency, debut_date, description, color_key, is_active")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">그룹 {groups?.length ?? 0}개</h2>
        {error && <p role="alert" className="text-sm text-destructive">그룹 목록을 불러오지 못했어요.</p>}
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {(groups ?? []).map((g) => (
            <li key={g.id}>
              <details className="group/row">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="size-6 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: SWATCH.get(g.color_key) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {g.name}
                      {g.name_ko && <span className="ml-1.5 font-normal text-muted-foreground">{g.name_ko}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">/g/{g.slug}</span>
                  </span>
                  {!g.is_active && <Badge variant="outline">비활성</Badge>}
                  <span className="text-xs text-muted-foreground group-open/row:hidden">수정</span>
                  <span className="hidden text-xs text-muted-foreground group-open/row:inline">닫기</span>
                </summary>
                <div className="space-y-3 border-t border-border px-4 py-4">
                  {g.is_active && (
                    <Link href={`/g/${g.slug}`} className="text-xs underline underline-offset-4">
                      게시판 열기
                    </Link>
                  )}
                  <GroupForm group={g} />
                </div>
              </details>
            </li>
          ))}
          {groups?.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">아직 그룹이 없어요.</li>
          )}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">그룹 추가</h2>
        <p className="text-xs text-muted-foreground break-keep">
          주소(slug)는 만든 뒤 바꿀 수 없어요. 로고·공식 사진은 넣지 않아요(D-22).
        </p>
        <GroupForm />
      </section>
    </div>
  );
}
