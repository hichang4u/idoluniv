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
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
          liked
            ? "border-red-500/40 bg-red-500/10 text-red-400"
            : "border-border text-muted-foreground hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400"
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
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
          scrapped
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
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
