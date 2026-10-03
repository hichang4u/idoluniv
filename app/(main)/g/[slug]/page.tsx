import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupBySlug } from "@/lib/groups";
import { PostCard } from "@/components/board/PostCard";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import type { PostListItem } from "@/types/database";

const PAGE_SIZE = 20;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getActiveGroupBySlug(slug);
  return { title: group ? `${group.name} 게시판` : "게시판" };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;

  // 레이아웃이 이미 확인했지만 페이지 단독 렌더에도 안전하도록 다시 확인한다(요청 내 캐시)
  const group = await getActiveGroupBySlug(slug);
  if (!group) notFound();

  const supabase = await createClient();

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
  const posts: PostListItem[] = postsData ?? [];

  return (
    <div className="space-y-4">
      {/* 설명 + 글쓰기 (그룹 이름과 탭은 레이아웃) */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-muted-foreground break-keep">
          {group.description ?? `게시글 ${(totalCount ?? 0).toLocaleString()}개`}
        </p>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/g/${slug}/write`}>글쓰기</Link>}
        />
      </div>

      {/* 게시글 목록 */}
      {posts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>
              아직 게시글이 없습니다. 첫 번째 글을 작성해보세요!
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={`/g/${slug}/write`}>첫 글 작성하기</Link>}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup className="gap-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} groupSlug={slug} />
          ))}
        </ItemGroup>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination className="pt-2" aria-label="페이지 이동">
          <PaginationContent>
            {page > 1 && (
              <PaginationItem>
                <Button
                  variant="ghost"
                  className="pl-1.5!"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/g/${slug}?page=${page - 1}`}
                      aria-label="이전 페이지"
                    />
                  }
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  <span className="hidden sm:block">이전</span>
                </Button>
              </PaginationItem>
            )}
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
            </PaginationItem>
            {page < totalPages && (
              <PaginationItem>
                <Button
                  variant="ghost"
                  className="pr-1.5!"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/g/${slug}?page=${page + 1}`}
                      aria-label="다음 페이지"
                    />
                  }
                >
                  <span className="hidden sm:block">다음</span>
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
