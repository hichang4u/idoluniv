"use client";

import { useState, useTransition } from "react";
import { Heart, Bookmark } from "lucide-react";
import { togglePostLike, togglePostScrap } from "@/app/actions/reaction";
import { cn } from "@/lib/utils";

interface PostActionsProps {
  postId: string;
  groupSlug: string;
  initialLikeCount: number;
  initialLiked?: boolean;
  initialScrapped?: boolean;
}

export function PostActions({
  postId,
  groupSlug,
  initialLikeCount,
  initialLiked = false,
  initialScrapped = false,
}: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [scrapped, setScrapped] = useState(initialScrapped);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likePending, startLikeTransition] = useTransition();
  const [scrapPending, startScrapTransition] = useTransition();

  const handleLike = () => {
    // Optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(c - 1, 0)));

    startLikeTransition(async () => {
      try {
        const result = await togglePostLike(postId);
        setLiked(result.liked);
        setLikeCount(result.likeCount);
      } catch {
        // rollback
        setLiked(liked);
        setLikeCount(likeCount);
      }
    });
  };

  const handleScrap = () => {
    const nextScrapped = !scrapped;
    setScrapped(nextScrapped);

    startScrapTransition(async () => {
      try {
        const result = await togglePostScrap(postId);
        setScrapped(result.scrapped);
      } catch {
        setScrapped(scrapped);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
}
