import { createClient } from "@/lib/supabase/server";
import { CommentItem } from "@/components/board/CommentItem";
import { CommentForm } from "@/components/board/CommentForm";
import type { Comment } from "@/types/database";

interface CommentSectionProps {
  postId: string;
}

export async function CommentSection({ postId }: CommentSectionProps) {
  const supabase = await createClient();

  const { data: rawComments } = await supabase
    .from("comments")
    .select(
      `id, post_id, parent_id, content, like_count, is_hidden, created_at, updated_at,
       author:author_id(id, nickname, avatar_url)`
    )
    .eq("post_id", postId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  const allComments = (rawComments ?? []) as unknown as Comment[];

  // 부모/자식 분리 — parent_id가 null인 것이 최상위
  const topLevel = allComments.filter((c) => !c.parent_id);
  const replies = allComments.filter((c) => !!c.parent_id);
  const commentTree = topLevel.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parent_id === c.id),
  }));

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold">
        댓글 {allComments.length.toLocaleString()}개
      </h2>

      {/* 댓글 작성 */}
      <CommentForm postId={postId} />

      {/* 댓글 목록 */}
      {commentTree.length > 0 && (
        <div className="space-y-1 pt-2">
          {commentTree.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} />
          ))}
        </div>
      )}
    </section>
  );
}
