"use client";

import { useState, useTransition } from "react";
import { Flag, MessageSquareX, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { deleteComment } from "@/app/actions/comment";
import { useCommentComposer } from "@/components/board/CommentComposer";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { Reportable, ReportedMask, useReportable, type ReportAccess } from "@/components/report/Reportable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { CommentWithAuthor } from "@/types/database";

interface CommentItemProps {
  comment: CommentWithAuthor;
  isReply?: boolean;
  isMine: boolean;
  /** 글쓴이의 댓글이면 "작성자" 표시 */
  isPostAuthor: boolean;
  /** 답글을 달 최상위 댓글 id. null 이면 답글 버튼을 숨긴다 */
  replyParentId: string | null;
  /** null 이면 신고 버튼을 두지 않는다(숨김 글 화면) */
  reportAccess: ReportAccess | null;
  /** 내가 이미 신고한 댓글 (F7-4) */
  reported: boolean;
}

// 본문 앞의 `@닉네임 ` 을 그룹의 진한 톤으로 강조한다 (목업 02)
function Content({ text }: { text: string }) {
  const m = /^@(\S+)\s/.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="font-semibold text-group-text">@{m[1]}</span>
      {text.slice(m[1].length + 1)}
    </>
  );
}

// 댓글 한 줄 (목업 02): 아바타 + 닉네임·작성자·시간 + 본문(15/1.7) + 답글·더보기. 대댓글은 1단계 들여쓰기
export function CommentItem({
  comment,
  isReply = false,
  isMine,
  isPostAuthor,
  replyParentId,
  reportAccess,
  reported,
}: CommentItemProps) {
  const composer = useCommentComposer();
  const nickname = comment.author?.nickname ?? "알 수 없음";
  const canReport = !isMine && reportAccess !== null;

  return (
    <Reportable targetType="comment" targetId={comment.id} initialReported={reported} access={reportAccess ?? "guest"}>
      <div className={cn("flex gap-2.5", isReply && "pl-[42px]")}>
        <UserAvatar seed={comment.author_id ?? nickname} name={nickname} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="flex items-center gap-1.5 text-[12.5px] text-text-subtle">
            <span className="truncate text-[13px] font-semibold text-text-strong">{nickname}</span>
            {isPostAuthor && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-group-text px-1.5 text-[10.5px] leading-4 font-semibold text-group-text">
                <Pencil className="size-3" aria-hidden="true" />
                작성자
              </span>
            )}
            <time dateTime={comment.created_at} className="shrink-0" suppressHydrationWarning>
              {formatRelative(comment.created_at)}
            </time>
          </p>

          <ReportedMask className="justify-self-start">
            <p className="text-[15px] leading-[1.7] whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
              <Content text={comment.content} />
            </p>
          </ReportedMask>

          {(replyParentId || isMine || canReport) && (
            <div className="flex items-center gap-3.5 text-[12.5px] font-medium text-text-subtle">
              {replyParentId && composer && (
                <button
                  type="button"
                  onClick={() =>
                    composer.startReply({
                      parentId: replyParentId,
                      nickname,
                      // 대댓글에 답하면 상대 닉네임을 앞에 붙인다 (F4-2)
                      mention: isReply,
                    })
                  }
                  className="-my-3 inline-flex min-h-11 items-center gap-[3px] transition-colors hover:text-text-strong"
                >
                  <Reply className="size-3.5" aria-hidden="true" />
                  답글
                </button>
              )}
              {(isMine || canReport) && <CommentMoreMenu commentId={comment.id} isMine={isMine} canReport={canReport} />}
            </div>
          )}
        </div>
      </div>
    </Reportable>
  );
}

// 댓글 더보기(⋯): 내 댓글은 삭제, 남의 댓글은 신고 (목업 02). 상위에 Reportable 이 있어야 한다
function CommentMoreMenu({ commentId, isMine, canReport }: { commentId: string; isMine: boolean; canReport: boolean }) {
  const { reported, openReport } = useReportable();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (!result.ok) setMessage(result.message);
    });
  };

  return (
    <>
      {message && (
        <span role="alert" className="text-destructive">
          {message}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="댓글 더보기"
          disabled={isPending}
          className="-my-3 -mr-3 ml-auto inline-grid size-11 place-items-center rounded-full transition-colors hover:bg-muted hover:text-text-strong disabled:opacity-50"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-32">
          {isMine && (
            <DropdownMenuItem variant="destructive" className="min-h-11 px-3" onClick={handleDelete}>
              <Trash2 />
              {isPending ? "삭제 중..." : "삭제"}
            </DropdownMenuItem>
          )}
          {canReport && (
            <DropdownMenuItem variant="destructive" className="min-h-11 px-3" disabled={reported} onClick={openReport}>
              <Flag />
              {reported ? "신고했어요" : "신고"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/** 삭제됐거나 가려진 최상위 댓글 자리. 대댓글이 고아가 되지 않게 남긴다 (F4-3) */
export function CommentPlaceholder({ reason }: { reason: "deleted" | "hidden" }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-text-subtle" aria-hidden="true">
        <MessageSquareX className="size-3.5" />
      </span>
      <p className="text-sm text-text-subtle">{reason === "deleted" ? "삭제된 댓글입니다" : "가려진 댓글입니다"}</p>
    </div>
  );
}
