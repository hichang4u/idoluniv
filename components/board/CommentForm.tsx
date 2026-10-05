"use client";

import { useActionState, useState } from "react";
import { createComment } from "@/app/actions/comment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/limits";
import type { ActionResult } from "@/lib/action-result";

interface CommentFormProps {
  postId: string;
  parentId?: string;
  /** 대댓글에 답할 때 채워 두는 `@닉네임 ` (N15) */
  initialContent?: string;
  onCancel?: () => void;
  onDone?: () => void;
  compact?: boolean;
}

export function CommentForm({ postId, parentId, initialContent = "", onCancel, onDone, compact = false }: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(async (_prev, formData) => {
    const result = await createComment(formData);
    if (result.ok) {
      setContent("");
      onDone?.();
    }
    return result;
  }, null);

  const error = state && !state.ok ? state.message : null;

  return (
    <form action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      <Textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={compact ? 2 : 3}
        maxLength={LIMITS.comment}
        autoFocus={!!parentId}
        placeholder={parentId ? "답글을 입력하세요" : "댓글을 입력하세요"}
        aria-label={parentId ? "답글" : "댓글"}
        className="resize-none"
      />

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-xs tabular-nums text-muted-foreground">
          {content.length.toLocaleString()} / {LIMITS.comment.toLocaleString()}
        </span>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending || content.trim().length === 0}>
          {pending ? "등록 중..." : "등록"}
        </Button>
      </div>
    </form>
  );
}
