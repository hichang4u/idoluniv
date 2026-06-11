import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CommentSection } from "@/components/board/CommentSection";
import { PostActions } from "@/components/board/PostActions";
import { Button } from "@/components/ui/button";
import type { PostWithRelations } from "@/types/database";
import { incrementViewCount } from "@/app/actions/post";
import { getPostReactions } from "@/app/actions/reaction";
import { ChevronLeft, Pencil, Eye } from "lucide-react";
import { DeletePostButton } from "@/components/board/DeletePostButton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  params: Promise<{ groupSlug: string; postId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title")
    .eq("id", postId)
    .single();

  return { title: post?.title ?? "게시글" };
}

export default async function PostDetailPage({ params }: Props) {
  const { groupSlug, postId } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      `id, title, content, post_type, like_count, comment_count,
       view_count, is_hidden, created_at, updated_at,
       author:author_id(id, nickname, avatar_url),
       idol_group:idol_group_id(id, name, slug)`
    )
    .eq("id", postId)
    .single();

  if (!post || post.is_hidden) notFound();

  const typedPost = post as unknown as PostWithRelations;

  // 조회수 증가 + 반응 상태 (병렬)
  const [reactions] = await Promise.all([
    getPostReactions(postId),
    incrementViewCount(postId),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 뒤로가기 */}
      <Link
        href={`/board/${groupSlug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        {typedPost.idol_group?.name ?? "게시판"} 목록
      </Link>

      {/* 게시글 본문 */}
      <article className="rounded-xl border border-border bg-card p-6 space-y-4">
        {/* 제목 + 메타 */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold leading-snug">{typedPost.title}</h1>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">
                {typedPost.author?.nickname ?? "익명"}
              </span>
              <span>{formatDate(typedPost.created_at)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {typedPost.view_count.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* 본문 */}
        <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {typedPost.content}
        </div>

        {/* 반응 + 작성자 액션 */}
        <div className="flex items-center justify-between pt-2">
          <PostActions
            postId={typedPost.id}
            groupSlug={groupSlug}
            initialLikeCount={typedPost.like_count}
            initialLiked={reactions.liked}
            initialScrapped={reactions.scrapped}
          />
          <div className="flex items-center gap-2">
            <Link href={`/board/${groupSlug}/${postId}/edit`}>
              <Button variant="ghost" size="sm" className="gap-1">
                <Pencil className="size-3.5" />
                수정
              </Button>
            </Link>
            <DeletePostButton postId={postId} groupSlug={groupSlug} />
          </div>
        </div>
      </article>

      {/* 댓글 */}
      <CommentSection postId={postId} />
    </div>
  );
}
