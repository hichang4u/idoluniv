"use client";

import { useActionState, useRef } from "react";
import { createComment } from "@/app/actions/comment";
import { Button } from "@/components/ui/button";

interface CommentFormProps {
  postId: string;
  parentId?: string;
  groupSlug?: string;
  onCancel?: () => void;
  compact?: boolean;
}

type ActionState = { error?: string } | null;

export function CommentForm({
  postId,
  parentId,
  groupSlug = "",
  onCancel,
  compact = false,
}: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createComment(formData);
      if (!result?.error) formRef.current?.reset();
      return result ?? null;
    },
    null
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="groupSlug" value={groupSlug} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      <textarea
        name="content"
        required
        rows={compact ? 2 : 3}
        maxLength={1000}
        placeholder={parentId ? "대댓글을 입력하세요..." : "댓글을 입력하세요..."}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />

      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "등록 중..." : "등록"}
        </Button>
      </div>
    </form>
  );
}
