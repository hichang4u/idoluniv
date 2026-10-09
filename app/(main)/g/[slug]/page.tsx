import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeftIcon, ChevronRightIcon, Clock, Feather, Flame, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupBySlug } from "@/lib/groups";
import { getViewer } from "@/lib/viewer";
import { getMyReportedIds } from "@/lib/reports";
import { PostCard } from "@/components/board/PostCard";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { PostListItem } from "@/types/database";

const PAGE_SIZE = 20;

// 정렬 칩 (TECH-DESIGN §7.2). 인기는 "최근 7일 안에 작성된 글"의 좋아요 순이다 — 칩 라벨로 의미를 드러낸다 🟡
const SORTS = [
  { value: "latest", label: "최신", icon: Clock, empty: "아직 게시글이 없어요" },
  { value: "popular", label: "인기 7일", icon: Flame, empty: "최근 7일 동안 올라온 글이 없어요" },
  { value: "fanfic", label: "팬픽", icon: Feather, empty: "아직 팬픽이 없어요" },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon; empty: string }[];
type Sort = (typeof SORTS)[number]["value"];

// 요청 시각 기준 n일 전 (렌더 함수 밖에 둔다 — 서버 컴포넌트도 렌더 중 Date.now() 호출은 lint 가 막는다)
function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getActiveGroupBySlug(slug);
  return { title: group ? `${group.name} 게시판` : "게시판" };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr, sort: sortParam } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  // 알 수 없는 sort 값은 최신
  const sort: Sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "latest";

  // 레이아웃이 이미 확인했지만 페이지 단독 렌더에도 안전하도록 다시 확인한다(요청 내 캐시)
  const group = await getActiveGroupBySlug(slug);
  if (!group) notFound();

  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(
      `id, title, content, post_type, like_count, comment_count,
       view_count, created_at, updated_at,
       author:author_id(id, nickname, avatar_url),
       idol_group:idol_group_id(id, name, slug)`,
      { count: "exact" }
    )
    .eq("idol_group_id", group.id)
    .eq("is_hidden", false);
  if (sort === "popular") {
    query = query.gte("created_at", daysAgoIso(7)).order("like_count", { ascending: false });
  }
  if (sort === "fanfic") query = query.eq("post_type", "fanfic");
  const { data: postsData, count: totalCount, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  // 빈 목록과 조회 실패를 구분한다: 실패는 error.tsx 로 (디자인 리뷰 S10)
  if (error) throw error;

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);
  const posts: PostListItem[] = postsData ?? [];
  // 내가 신고한 글은 목록에서도 제목을 가린다 (F7-4, 페이지 글 id 로 1회 조회)
  const viewer = await getViewer();
  const reportedIds = await getMyReportedIds(viewer?.id ?? null, [{ type: "post", ids: posts.map((p) => p.id) }]);

  const href = (next: { sort?: Sort; page?: number }) => {
    const sp = new URLSearchParams();
    const s = next.sort ?? sort;
    if (s !== "latest") sp.set("sort", s);
    if ((next.page ?? 1) > 1) sp.set("page", String(next.page));
    const qs = sp.toString();
    return `/g/${slug}${qs ? `?${qs}` : ""}`;
  };
  const current = SORTS.find((s) => s.value === sort)!;

  return (
    <div className="space-y-3">
      {/* 정렬 칩. 선택은 그룹의 진한 톤(group-text) — 파스텔은 글자색으로 쓰지 않는다 */}
      <nav aria-label="정렬" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {SORTS.map(({ value, label, icon: Icon }) => {
          const active = value === sort;
          return (
            <Link
              key={value}
              href={href({ sort: value })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
                active
                  ? "border-group-text/40 bg-group-soft font-semibold text-group-text"
                  : "border-border bg-card text-text-subtle hover:text-text-strong"
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {posts.length === 0 ? (
        <Empty className="rounded-2xl bg-card py-12">
          <EmptyHeader>
            <EmptyTitle className="text-base font-semibold text-text-strong break-keep">{current.empty}</EmptyTitle>
            <EmptyDescription className="break-keep">첫 글의 주인공이 되어 보세요.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="touch" nativeButton={false} render={<Link href={`/g/${slug}/write`}>글쓰기</Link>} />
          </EmptyContent>
        </Empty>
      ) : (
        // 일반 글은 카드가 아니라 텍스트 목록 (D-25, 팬 커뮤니티 관습)
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card dark:shadow-none">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} groupSlug={slug} reported={reportedIds.has(post.id)} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <Pagination className="pt-2" aria-label="페이지 이동">
          <PaginationContent>
            {page > 1 && (
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="touch"
                  nativeButton={false}
                  render={<Link href={href({ page: page - 1 })} aria-label="이전 페이지" />}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  <span className="hidden sm:block">이전</span>
                </Button>
              </PaginationItem>
            )}
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
            </PaginationItem>
            {page < totalPages && (
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="touch"
                  nativeButton={false}
                  render={<Link href={href({ page: page + 1 })} aria-label="다음 페이지" />}
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
