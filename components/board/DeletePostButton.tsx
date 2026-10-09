"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePost } from "@/app/actions/post";
import { cn } from "@/lib/utils";

export function DeletePostButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    setMessage(null);
    startTransition(async () => {
      // 성공하면 서버가 목록으로 redirect 한다
      const result = await deletePost(postId);
      if (!result.ok) setMessage(result.message);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={cn(
          "inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors",
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          isPending && "opacity-50 cursor-not-allowed"
        )}
      >
        <Trash2 className="size-3.5" />
        {isPending ? "삭제 중..." : "삭제"}
      </button>
      {message && (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      )}
    </>
  );
}
