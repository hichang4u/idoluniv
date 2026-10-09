import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatFullDateTime } from "@/lib/format";
import { OG_BASE } from "@/lib/site";
import { getViewer } from "@/lib/viewer";
import { CommentSection, type CommentAccess } from "@/components/board/CommentSection";
import { PostActions } from "@/components/board/PostActions";
import { Button } from "@/components/ui/button";
import { getPostReactions, recordPostView } from "@/app/actions/reaction";
import { ChevronLeft, Pencil, Eye, EyeOff, Heart } from "lucide-react";
import { DeletePostButton } from "@/components/board/DeletePostButton";
import { Reportable, ReportedMask, ReportedText, ReportMenu, type ReportAccess } from "@/components/report/Reportable";
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

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <Link
        href={`/g/${groupSlug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        {post.idol_group?.name ?? "게시판"} 목록
      </Link>

      {post.is_hidden && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          <EyeOff className="size-4 shrink-0" />
          숨김 처리된 글입니다 — {isAuthor ? "나에게만 보여요." : "작성자와 관리자에게만 보여요."}
        </p>
      )}

      {/* 게시글 본문. 내가 신고한 글이면 제목·본문을 가린다 (F7-4) */}
      <Reportable targetType="post" targetId={post.id} initialReported={reported} access={access}>
      <article className="rounded-xl border border-border bg-card p-6 space-y-4">
        {/* 제목 + 메타 */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold leading-snug">
            <ReportedText label="신고한 글입니다">{post.title}</ReportedText>
          </h1>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">
                {post.author?.nickname ?? "익명"}
              </span>
              <time dateTime={post.created_at}>{formatFullDateTime(post.created_at)}</time>
              {isEdited(post.created_at, post.updated_at) && <span>수정됨</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {post.view_count.toLocaleString()}
              </span>
              {canReport && <ReportMenu />}
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* 본문 */}
        <ReportedMask>
          {/* body-lg 16/1.75, 긴 URL 은 아무 데서나 줄바꿈 (TOKENS §4.2) */}
          <div className="whitespace-pre-wrap text-base leading-[1.75] text-foreground [overflow-wrap:anywhere]">
            {post.content}
          </div>
        </ReportedMask>

        {/* 반응 + 작성자 액션 */}
        <div className="flex items-center justify-between pt-2">
          {post.is_hidden ? (
            // 숨김 글에는 반응할 수 없다(서버도 거부). 수치만 보여 준다
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="size-3.5" />
              {post.like_count.toLocaleString()}
            </span>
          ) : (
            <PostActions
              postId={post.id}
              initialLikeCount={post.like_count}
              initialLiked={reactions.liked}
              initialScrapped={reactions.scrapped}
            />
          )}
          {isAuthor && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!post.is_hidden && (
                <Button
                  variant="ghost"
                  size="touch"
                  className="gap-1"
                  nativeButton={false}
                  render={
                    <Link href={`${postPath}/edit`}>
                      <Pencil className="size-3.5" />
                      수정
                    </Link>
                  }
                />
              )}
              <DeletePostButton postId={postId} />
            </div>
          )}
        </div>
      </article>
      </Reportable>

      {/* 댓글 */}
      <CommentSection
        postId={postId}
        commentCount={post.comment_count}
        viewerId={viewer?.id ?? null}
        access={commentAccess}
        returnPath={postPath}
      />
    </div>
  );
}
