import Link from "next/link";
import { MessageCircle, Heart, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
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
    <Item
      variant="outline"
      render={<Link href={`/board/${groupSlug}/${post.id}`} />}
    >
      <ItemHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {POST_TYPE_LABEL[post.post_type] ?? post.post_type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {post.author?.nickname ?? "익명"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(post.created_at)}
          </span>
        </div>
      </ItemHeader>

      <ItemContent>
        <ItemTitle>{post.title}</ItemTitle>
        {post.content && (
          <ItemDescription>
            {post.content.replace(/[#*`>\-]/g, "").trim()}
          </ItemDescription>
        )}
      </ItemContent>

      <ItemFooter className="text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
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
        </div>
      </ItemFooter>
    </Item>
  );
}
