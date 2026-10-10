"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deletePost } from "@/app/actions/post";
import { useReportable } from "@/components/report/Reportable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostMoreMenuProps {
  postId: string;
  isAuthor: boolean;
  /** 수정 화면 주소. 숨김 글처럼 수정할 수 없으면 null */
  editHref: string | null;
  /** 남의 글이고 숨김이 아니면 신고할 수 있다 */
  canReport: boolean;
}

// 글 상세 상단 바 오른쪽 더보기(⋯) 메뉴 (목업 02): 작성자는 수정·삭제, 다른 사람은 신고.
// 상위에 Reportable 이 있어야 한다
export function PostMoreMenu({ postId, isAuthor, editHref, canReport }: PostMoreMenuProps) {
  const { reported, openReport } = useReportable();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!isAuthor && !canReport) return null;

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
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="더보기"
          disabled={isPending}
          className="inline-flex size-11 items-center justify-center rounded-full text-text-strong transition-colors hover:bg-muted disabled:opacity-50"
        >
          <MoreHorizontal className="size-[22px]" strokeWidth={1.9} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-36">
          {isAuthor && editHref && (
            <DropdownMenuItem className="min-h-11 px-3" onClick={() => router.push(editHref)}>
              <Pencil />
              수정
            </DropdownMenuItem>
          )}
          {isAuthor && (
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
      {message && (
        // 상단 바 높이를 바꾸지 않도록 바 아래에 띄운다
        <p
          role="alert"
          className="absolute top-full right-3 mt-1 rounded-lg bg-popover px-3 py-2 text-xs text-destructive shadow-overlay"
        >
          {message}
        </p>
      )}
    </>
  );
}
