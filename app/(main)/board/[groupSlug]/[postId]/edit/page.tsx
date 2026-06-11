import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/board/PostForm";

export const metadata: Metadata = { title: "게시글 수정" };

interface Props {
  params: Promise<{ groupSlug: string; postId: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { groupSlug, postId } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id, title, content, post_type, is_hidden")
    .eq("id", postId)
    .single();

  if (!post || post.is_hidden) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">게시글 수정</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <PostForm groupSlug={groupSlug} post={post} />
      </div>
    </div>
  );
}
