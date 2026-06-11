import Link from "next/link";
import { MessageCircle, Heart, Bookmark, Eye } from "lucide-react";
import type { PostWithRelations } from "@/types/database";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

const POST_TYPE_LABEL: Record<string, string> = {
  text: "일반",
  image: "이미지",
  video: "영상",
  fanfic: "팬픽",
};

interface PostCardProps {
  post: PostWithRelations;
  groupSlug: string;
}

export function PostCard({ post, groupSlug }: PostCardProps) {
  return (
    <article className="group rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-colors">
      <Link href={`/board/${groupSlug}/${post.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary">
                {POST_TYPE_LABEL[post.post_type] ?? post.post_type}
              </span>
              <span className="text-xs text-muted-foreground">
                {post.author?.nickname ?? "익명"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(post.created_at)}
              </span>
            </div>

            <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>

            {post.content && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {post.content.replace(/[#*`>\-]/g, "").trim()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="size-3" />
            {post.view_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="size-3" />
            {post.like_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3" />
            {post.comment_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="size-3" />
          </span>
        </div>
      </Link>
    </article>
  );
}
