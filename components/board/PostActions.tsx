"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Bookmark, MessageSquare } from "lucide-react";
import { togglePostLike, togglePostScrap } from "@/app/actions/reaction";
import { cn } from "@/lib/utils";
import type { ErrorCode } from "@/lib/action-result";

interface PostActionsProps {
  postId: string;
  initialLikeCount: number;
  initialLiked?: boolean;
  initialScrapped?: boolean;
  /** 댓글 수 — 누르면 댓글 목록으로 */
  commentCount: number;
}

export function PostActions({
  postId,
  initialLikeCount,
  initialLiked = false,
  initialScrapped = false,
  commentCount,
}: PostActionsProps) {
  // 좋아요를 누를 때마다 하트를 한 번 튀긴다(동작 줄이기 설정이면 끈다, TOKENS §6.0)
  const [pop, setPop] = useState(0);
  const [liked, setLiked] = useState(initialLiked);
  const [scrapped, setScrapped] = useState(initialScrapped);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likePending, startLikeTransition] = useTransition();
  const [scrapPending, startScrapTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 로그인·온보딩이 필요하면 그 화면으로 보내고, 아니면 안내 문구를 보여 준다
  const handleFailure = (code: ErrorCode, text: string) => {
    const next = encodeURIComponent(pathname);
    if (code === "AUTH_REQUIRED") router.push(`/login?next=${next}`);
    else if (code === "ONBOARDING_REQUIRED") router.push(`/onboarding?next=${next}`);
    else setMessage(text);
  };

  const handleLike = () => {
    // Optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    if (nextLiked) setPop((n) => n + 1);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(c - 1, 0)));

    setMessage(null);
    startLikeTransition(async () => {
      const result = await togglePostLike(postId);
      if (result.ok) {
        setLiked(result.data.liked);
        setLikeCount(result.data.likeCount);
      } else {
        setLiked(liked);
        setLikeCount(likeCount);
        handleFailure(result.code, result.message);
      }
    });
  };

  const handleScrap = () => {
    const nextScrapped = !scrapped;
    setScrapped(nextScrapped);

    setMessage(null);
    startScrapTransition(async () => {
      const result = await togglePostScrap(postId);
      if (result.ok) {
        setScrapped(result.data.scrapped);
      } else {
        setScrapped(scrapped);
        handleFailure(result.code, result.message);
      }
    });
  };

  // 목업 02 반응 줄: 36px 알약 버튼. 켜진 상태는 그룹의 진한 톤 + 옅은 면, 아이콘을 채운다(색만으로 전달하지 않음)
  const pill = "relative inline-flex h-9 items-center gap-[5px] rounded-full border px-3 text-[13px] font-semibold tabular-nums transition-colors after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']";
  const on = "border-group-text bg-group-soft text-group-text";
  const off = "border-border text-text-strong hover:bg-group-soft";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleLike}
        disabled={likePending}
        aria-pressed={liked}
        aria-label={`좋아요 ${likeCount.toLocaleString()}`}
        className={cn(pill, liked ? on : off)}
      >
        <Heart
          key={pop}
          className={cn("size-[18px]", liked && "fill-current", pop > 0 && "motion-safe:animate-[iu-pop_0.32s_ease-out]")}
          aria-hidden="true"
        />
        {likeCount.toLocaleString()}
      </button>

      <button
        type="button"
        onClick={handleScrap}
        disabled={scrapPending}
        aria-pressed={scrapped}
        className={cn(pill, scrapped ? on : off)}
      >
        <Bookmark className={cn("size-[18px]", scrapped && "fill-current")} aria-hidden="true" />
        {scrapped ? "스크랩됨" : "스크랩"}
      </button>

      <Link href="#comments" aria-label={`댓글 ${commentCount.toLocaleString()}`} className={cn(pill, off)}>
        <MessageSquare className="size-[18px]" aria-hidden="true" />
        {commentCount.toLocaleString()}
      </Link>
      {message && (
        <p role="alert" className="w-full text-xs text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
