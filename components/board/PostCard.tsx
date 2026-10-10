import Link from "next/link";
import { Eye, EyeOff, Feather, Heart, MessageSquare } from "lucide-react";
import { IconChip } from "@/components/common/IconChip";
import { formatRelative } from "@/lib/format";
import type { PostListItem } from "@/types/database";

// 기존 image·video 글은 라벨만 남긴다. 일반 글은 라벨을 달지 않고 팬픽만 깃펜 라벨 (TOKENS §6.0)
const LEGACY_LABEL: Record<string, string> = { image: "이미지", video: "영상" };

interface PostCardProps {
  post: PostListItem;
  groupSlug: string;
  /** 내가 신고한 글이면 제목·미리보기를 가린다. 상세에서 "보기" 로 열 수 있다 (F7-4) */
  reported?: boolean;
}

// 게시판 목록 한 줄 (목업 01): 제목 2줄 + 메타, 오른쪽에 댓글 수 상자
export function PostCard({ post, groupSlug, reported = false }: PostCardProps) {
  const href = `/g/${groupSlug}/posts/${post.id}`;

  if (reported) {
    return (
      <Link href={href} className="flex min-h-14 items-center gap-2.5 px-4 py-3 text-[13px] text-text-subtle transition-colors hover:bg-muted/50">
        <IconChip icon={EyeOff} color="greige" size="sm" />
        <span className="flex-1">신고한 글이에요</span>
        <span className="font-medium text-text-strong underline underline-offset-[3px]">보기</span>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="grid min-w-0 flex-1 gap-0.5">
        {post.post_type === "fanfic" && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-group-text">
            <Feather className="size-3.5" aria-hidden="true" />
            팬픽
          </span>
        )}
        {LEGACY_LABEL[post.post_type] && (
          <span className="text-xs font-medium text-text-subtle">{LEGACY_LABEL[post.post_type]}</span>
        )}
        <h3 className="line-clamp-2 text-[15px] leading-[1.45] font-semibold text-text-strong [overflow-wrap:anywhere]">
          {post.title}
        </h3>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] text-text-subtle">
          <span className="min-w-0 truncate">
            {post.author?.nickname ?? "탈퇴한 사용자"} ·{" "}
            <time dateTime={post.created_at} suppressHydrationWarning>
              {formatRelative(post.created_at)}
            </time>
          </span>
          <span className="inline-flex items-center gap-[3px] tabular-nums">
            <Eye className="size-3.5" aria-hidden="true" />
            <span className="sr-only">조회</span>
            {post.view_count.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-[3px] tabular-nums">
            <Heart className="size-3.5" aria-hidden="true" />
            <span className="sr-only">좋아요</span>
            {post.like_count.toLocaleString()}
          </span>
        </p>
      </div>
      <span className="flex w-[42px] shrink-0 flex-col items-center gap-px rounded-[10px] bg-surface-2 pt-[7px] pb-[5px] text-[13px] leading-[1.2] font-semibold text-text-strong tabular-nums">
        <MessageSquare className="size-4 text-text-subtle" aria-hidden="true" />
        <span className="sr-only">댓글</span>
        {post.comment_count.toLocaleString()}
      </span>
    </Link>
  );
}
