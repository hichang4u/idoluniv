"use client";

import { useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { deleteComment } from "@/app/actions/comment";
import { CommentForm } from "@/components/board/CommentForm";
import { Button } from "@/components/ui/button";
import type { Comment } from "@/types/database";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

interface CommentItemProps {
  comment: Comment & { replies?: Comment[] };
  postId: string;
  isReply?: boolean;
}

export function CommentItem({ comment, postId, isReply = false }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleDelete = async () => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await deleteComment(comment.id, postId);
  };

  return (
    <div className={isReply ? "ml-6 border-l-2 border-border pl-4" : ""}>
      <div className="py-3 space-y-1.5">
        {/* 작성자 + 날짜 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground">
            {comment.author?.nickname ?? "익명"}
          </span>
          <span className="text-muted-foreground">{formatDate(comment.created_at)}</span>
        </div>

        {/* 내용 */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>

        {/* 액션 */}
        <div className="flex items-center gap-3">
          {!isReply && (
            <button
              type="button"
              onClick={() => setShowReplyForm((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="size-3" />
              답글
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3" />
            삭제
          </button>
        </div>

        {/* 대댓글 폼 */}
        {showReplyForm && (
          <div className="mt-2">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              compact
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}
      </div>

      {/* 대댓글 목록 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} postId={postId} isReply />
          ))}
        </div>
      )}
    </div>
  );
}
