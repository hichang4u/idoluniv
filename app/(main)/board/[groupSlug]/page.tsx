import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/board/PostCard";
import { Button } from "@/components/ui/button";
import type { PostWithRelations } from "@/types/database";

const PAGE_SIZE = 20;

interface Props {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupSlug } = await params;
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("idol_groups")
    .select("name")
    .eq("slug", groupSlug)
    .single();

  return { title: group ? `${group.name} 게시판` : "게시판" };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { groupSlug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("idol_groups")
    .select("id, name, slug, description")
    .eq("slug", groupSlug)
    .single();

  if (!group) notFound();

  const { data: postsData, count: totalCount } = await supabase
    .from("posts")
    .select(
      `id, title, content, post_type, like_count, comment_count,
       view_count, created_at, updated_at,
       author:author_id(id, nickname, avatar_url),
       idol_group:idol_group_id(id, name, slug)`,
      { count: "exact" }
    )
    .eq("idol_group_id", group.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);
  const posts = (postsData ?? []) as unknown as PostWithRelations[];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{group.name} 게시판</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {group.description}
            </p>
          )}
        </div>
        <Link href={`/board/${groupSlug}/new`}>
          <Button size="sm">글쓰기</Button>
        </Link>
      </div>

      {/* 게시글 목록 */}
      {posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            아직 게시글이 없습니다. 첫 번째 글을 작성해보세요!
          </p>
          <Link href={`/board/${groupSlug}/new`}>
            <Button size="sm">첫 글 작성하기</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} groupSlug={groupSlug} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {page > 1 && (
            <Link href={`/board/${groupSlug}?page=${page - 1}`}>
              <Button variant="outline" size="sm">이전</Button>
            </Link>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/board/${groupSlug}?page=${page + 1}`}>
              <Button variant="outline" size="sm">다음</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
