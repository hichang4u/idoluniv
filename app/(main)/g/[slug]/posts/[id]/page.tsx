import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatFullDateTime, formatRelative } from "@/lib/format";
import { OG_BASE } from "@/lib/site";
import { getViewer } from "@/lib/viewer";
import { CommentSection, type CommentAccess } from "@/components/board/CommentSection";
import { CommentComposerProvider } from "@/components/board/CommentComposer";
import { PostActions } from "@/components/board/PostActions";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { TopBar } from "@/components/layout/TopBar";
import { getPostReactions, recordPostView } from "@/app/actions/reaction";
import { Eye, EyeOff, Feather, Heart, MessageSquare, Pencil } from "lucide-react";
import { PostMoreMenu } from "@/components/board/PostMoreMenu";
import { Reportable, ReportedMask, ReportedText, type ReportAccess } from "@/components/report/Reportable";
import { getMyReportedIds } from "@/lib/reports";

// 제목·본문·유형이 바뀔 때만 트리거가 updated_at 을 갱신한다(0009). 1분 안의 차이는 무시 (F3-8)
function isEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000;
}

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

// generateMetadata 와 페이지가 같은 요청에서 한 번만 조회하도록 캐시한다.
// RLS 가 숨김 글은 작성자·관리자에게만 돌려준다 (0009)
const getPost = cache(async (postId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(
      `id, author_id, title, content, post_type, like_count, comment_count,
       view_count, is_hidden, created_at, updated_at,
       author:author_id(id, nickname, avatar_url),
       idol_group:idol_group_id(id, name, slug)`
    )
    .eq("id", postId)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: postId } = await params;
  const post = await getPost(postId);
  if (!post) return { title: "게시글" };
  const description = post.content.replace(/\s+/g, " ").trim().slice(0, 120);
  const canonical = post.idol_group ? `/g/${post.idol_group.slug}/posts/${post.id}` : undefined;
  return {
    title: post.title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: { ...OG_BASE, type: "article", title: post.title, description, publishedTime: post.created_at },
    // 숨김 글은 작성자·관리자에게만 보이는 화면이라 색인하지 않는다
    ...(post.is_hidden && { robots: { index: false } }),
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug: groupSlug, id: postId } = await params;
  const post = await getPost(postId);

  // 숨김 글은 작성자·관리자에게만 온다. 그 외에는 여기서 404 (N3, F2-4)
  if (!post) notFound();
  // URL 의 그룹과 글의 실제 그룹이 다르면 정식 주소로 보낸다 (N5)
  if (post.idol_group && post.idol_group.slug !== groupSlug) {
    redirect(`/g/${post.idol_group.slug}/posts/${postId}`);
  }

  // 반응 상태 + 보는 사람 + 조회수 기록 (병렬)
  const [reactions, viewer] = await Promise.all([
    getPostReactions(postId),
    getViewer(),
    // 24시간 중복 제거는 DB(record_post_view)가 한다 (F3-7)
    recordPostView(postId),
  ]);
  const isAuthor = !!viewer && viewer.id === post.author_id;
  const postPath = `/g/${groupSlug}/posts/${postId}`;
  const access: ReportAccess = !viewer ? "guest" : viewer.onboarded ? "member" : "onboarding";
  const commentAccess: CommentAccess = post.is_hidden ? "locked" : access;
  // 본인 글·숨김 글은 신고할 수 없다(DB 도 거부: CANNOT_REPORT_OWN, NOT_FOUND)
  const canReport = !isAuthor && !post.is_hidden;
  const reported = canReport && (await getMyReportedIds(viewer?.id ?? null, [{ type: "post", ids: [post.id] }])).has(post.id);

  const groupName = post.idol_group?.name ?? "게시판";
  const nickname = post.author?.nickname ?? "탈퇴한 사용자";

  // 목업 02: 상단 바(뒤로 · 게시판 이름 · 더보기) → 본문 → 댓글 → 바닥 입력창. 하단 탭바는 숨긴다.
  // 내가 신고한 글이면 제목·본문을 가린다 (F7-4) — 더보기 메뉴도 같은 신고 상태를 쓰므로 화면 전체를 감싼다
  return (
    <Reportable targetType="post" targetId={post.id} initialReported={reported} access={access}>
      <TopBar
        back={`/g/${groupSlug}`}
        backLabel={`${groupName} 게시판으로`}
        title={`${groupName} 게시판`}
        titleAs="p"
        actions={
          <PostMoreMenu
            postId={post.id}
            isAuthor={isAuthor}
            editHref={post.is_hidden ? null : `${postPath}/edit`}
            canReport={canReport}
          />
        }
      />

      {post.is_hidden && (
        <p
          role="status"
          className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3 text-[13px] text-text-subtle md:mb-2 md:rounded-xl md:border-0"
        >
          <EyeOff className="size-4 shrink-0" aria-hidden="true" />
          숨김 처리된 글입니다 — {isAuthor ? "나에게만 보여요." : "작성자와 관리자에게만 보여요."}
        </p>
      )}

      <CommentComposerProvider postId={postId} access={commentAccess} returnPath={postPath}>
        {/* 바닥 입력창(모바일 고정)에 마지막 댓글이 가리지 않도록 아래 여백을 둔다 */}
        <div className={commentAccess === "locked" ? "" : "pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-0"}>
          <article className="grid gap-2.5 bg-card px-4 pt-4 pb-3.5 md:rounded-2xl md:px-5 md:pt-5">
            {post.post_type === "fanfic" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-group-text">
                <Feather className="size-3.5" aria-hidden="true" />
                팬픽
              </span>
            )}
            <h1 className="text-xl leading-[1.4] font-bold tracking-[-0.02em] text-text-strong [overflow-wrap:anywhere]">
              <ReportedText label="신고한 글입니다">{post.title}</ReportedText>
            </h1>

            <div className="flex items-center gap-2.5">
              <UserAvatar seed={post.author_id ?? nickname} name={nickname} className="size-8 text-[13px]" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-text-strong">{nickname}</p>
                <p className="flex items-center gap-2 text-xs text-text-subtle">
                  <time dateTime={post.created_at} title={formatFullDateTime(post.created_at)} suppressHydrationWarning>
                    {formatRelative(post.created_at)}
                  </time>
                  <span className="inline-flex items-center gap-[3px] tabular-nums">
                    <Eye className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">조회</span>
                    {post.view_count.toLocaleString()}
                  </span>
                  {isEdited(post.created_at, post.updated_at) && (
                    <span className="inline-flex items-center gap-[3px]">
                      <Pencil className="size-3" aria-hidden="true" />
                      수정됨
                    </span>
                  )}
                </p>
              </div>
            </div>

            <ReportedMask>
              {/* body-lg 16/1.75, 긴 URL 은 아무 데서나 줄바꿈 (TOKENS §4.2) */}
              <div className="whitespace-pre-wrap text-base leading-[1.75] text-foreground [overflow-wrap:anywhere]">
                {post.content}
              </div>
            </ReportedMask>

            {/* 반응 (수정·삭제·신고는 오른쪽 위 더보기 메뉴) */}
            <div className="pt-1">
              {post.is_hidden ? (
                // 숨김 글에는 반응할 수 없다(서버도 거부). 수치만 보여 준다
                <p className="flex items-center gap-3 text-[13px] text-text-subtle tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-4" aria-hidden="true" />
                    <span className="sr-only">좋아요</span>
                    {post.like_count.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-4" aria-hidden="true" />
                    <span className="sr-only">댓글</span>
                    {post.comment_count.toLocaleString()}
                  </span>
                </p>
              ) : (
                <PostActions
                  postId={post.id}
                  initialLikeCount={post.like_count}
                  initialLiked={reactions.liked}
                  initialScrapped={reactions.scrapped}
                  commentCount={post.comment_count}
                />
              )}
            </div>
          </article>

          <CommentSection
            postId={postId}
            commentCount={post.comment_count}
            viewerId={viewer?.id ?? null}
            postAuthorId={post.author_id}
            access={commentAccess}
          />
        </div>
      </CommentComposerProvider>
    </Reportable>
  );
}
