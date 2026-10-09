"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { deleteComment } from "@/app/actions/comment";
import { CommentForm } from "@/components/board/CommentForm";
import { Reportable, ReportButton, ReportedMask, type ReportAccess } from "@/components/report/Reportable";
import { cn } from "@/lib/utils";
import type { CommentWithAuthor } from "@/types/database";

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
  comment: CommentWithAuthor;
  postId: string;
  isReply?: boolean;
  isMine: boolean;
  /** 답글을 달 최상위 댓글 id. null 이면 답글 버튼을 숨긴다 */
  replyParentId: string | null;
  /** null 이면 신고 버튼을 두지 않는다(숨김 글 화면) */
  reportAccess: ReportAccess | null;
  /** 내가 이미 신고한 댓글 (F7-4) */
  reported: boolean;
}

export function CommentItem({
  comment,
  postId,
  isReply = false,
  isMine,
  replyParentId,
  reportAccess,
  reported,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const nickname = comment.author?.nickname ?? "알 수 없음";

  const handleDelete = () => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (!result.ok) setMessage(result.message);
    });
  };

  const canReport = !isMine && reportAccess !== null;

  return (
    <Reportable targetType="comment" targetId={comment.id} initialReported={reported} access={reportAccess ?? "guest"}>
    <div className={cn("py-3 space-y-1.5", isReply && "ml-6 border-l-2 border-border pl-4")}>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-foreground">{nickname}</span>
        <span className="text-muted-foreground">{formatDate(comment.created_at)}</span>
      </div>

      <ReportedMask>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
      </ReportedMask>

      {(replyParentId || isMine || canReport) && (
        <div className="flex items-center gap-3">
          {replyParentId && (
            <button
              type="button"
              onClick={() => setShowReplyForm((v) => !v)}
              aria-expanded={showReplyForm}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="size-3" />
              답글
            </button>
          )}
          {isMine && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            >
              <Trash2 className="size-3" />
              {isPending ? "삭제 중..." : "삭제"}
            </button>
          )}
          {canReport && <ReportButton />}
        </div>
      )}

      {message && (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      )}

      {showReplyForm && replyParentId && (
        <div className="mt-2">
          <CommentForm
            postId={postId}
            parentId={replyParentId}
            // 대댓글에 답하면 같은 부모 아래에 달고 상대 닉네임을 앞에 붙인다 (F4-2)
            initialContent={isReply && comment.author?.nickname ? `@${comment.author.nickname} ` : ""}
            compact
            onCancel={() => setShowReplyForm(false)}
            onDone={() => setShowReplyForm(false)}
          />
        </div>
      )}
    </div>
    </Reportable>
  );
}

/** 삭제됐거나 가려진 최상위 댓글 자리. 대댓글이 고아가 되지 않게 남긴다 (F4-3) */
export function CommentPlaceholder({ reason }: { reason: "deleted" | "hidden" }) {
  return (
    <p className="py-3 text-sm text-muted-foreground">
      {reason === "deleted" ? "삭제된 댓글입니다." : "가려진 댓글입니다."}
    </p>
  );
}
