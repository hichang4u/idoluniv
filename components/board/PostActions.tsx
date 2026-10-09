"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Bookmark } from "lucide-react";
import { togglePostLike, togglePostScrap } from "@/app/actions/reaction";
import { cn } from "@/lib/utils";
import type { ErrorCode } from "@/lib/action-result";

interface PostActionsProps {
  postId: string;
  initialLikeCount: number;
  initialLiked?: boolean;
  initialScrapped?: boolean;
}

export function PostActions({
  postId,
  initialLikeCount,
  initialLiked = false,
  initialScrapped = false,
}: PostActionsProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleLike}
        disabled={likePending}
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium tabular-nums transition-colors",
          liked
            ? "border-group-text/40 bg-group-soft text-group-text"
            : "border-border text-muted-foreground hover:bg-group-soft hover:text-group-text"
        )}
      >
        <Heart className={cn("size-3.5", liked && "fill-current")} />
        {likeCount.toLocaleString()}
      </button>

      <button
        type="button"
        onClick={handleScrap}
        disabled={scrapPending}
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium tabular-nums transition-colors",
          scrapped
            ? "border-group-text/40 bg-group-soft text-group-text"
            : "border-border text-muted-foreground hover:bg-group-soft hover:text-group-text"
        )}
      >
        <Bookmark className={cn("size-3.5", scrapped && "fill-current")} />
        {scrapped ? "스크랩됨" : "스크랩"}
      </button>
      {message && (
        <p role="alert" className="w-full text-xs text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
