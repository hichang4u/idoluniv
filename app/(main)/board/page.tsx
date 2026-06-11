import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { IdolGroup } from "@/types/database";

export const metadata: Metadata = { title: "게시판" };

export default async function BoardIndexPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("idol_groups")
    .select("id, name, name_ko, slug, cover_url, description")
    .eq("is_active", true)
    .order("name");

  const typedGroups = (groups ?? []) as IdolGroup[];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">게시판</h1>

      {typedGroups.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            등록된 아이돌 그룹이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {typedGroups.map((group) => (
            <Link
              key={group.id}
              href={`/board/${group.slug}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-colors"
            >
              {group.cover_url ? (
                <img
                  src={group.cover_url}
                  alt={group.name}
                  className="size-12 rounded-lg object-cover"
                />
              ) : (
                <div className="size-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold text-primary">
                  {group.name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {group.name}
                </p>
                {group.name_ko && group.name_ko !== group.name && (
                  <p className="text-xs text-muted-foreground">{group.name_ko}</p>
                )}
                {group.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {group.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
