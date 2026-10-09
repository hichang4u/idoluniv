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

// 글 상세 오른쪽 위 더보기(⋯) 메뉴 (목업 02): 작성자는 수정·삭제, 다른 사람은 신고.
// 하단 반응 줄에서 수정·삭제를 빼 모바일에서 버튼이 두 줄로 엉키지 않게 한다. 상위에 Reportable 이 있어야 한다
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
          className="-m-2 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <MoreHorizontal className="size-4" />
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
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      )}
    </>
  );
}
