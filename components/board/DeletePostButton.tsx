"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePost } from "@/app/actions/post";
import { cn } from "@/lib/utils";

interface Props {
  postId: string;
  groupSlug: string;
}

export function DeletePostButton({ postId, groupSlug }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      await deletePost(postId, groupSlug);
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        isPending && "opacity-50 cursor-not-allowed"
      )}
    >
      <Trash2 className="size-3.5" />
      {isPending ? "삭제 중..." : "삭제"}
    </button>
  );
}
