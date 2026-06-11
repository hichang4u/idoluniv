import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/board/PostForm";

export const metadata: Metadata = { title: "글쓰기" };

interface Props {
  params: Promise<{ groupSlug: string }>;
}

export default async function NewPostPage({ params }: Props) {
  const { groupSlug } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("idol_groups")
    .select("id, name, slug")
    .eq("slug", groupSlug)
    .single();

  if (!group) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">글쓰기</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {group.name} 게시판에 글을 작성합니다.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <PostForm groupSlug={groupSlug} />
      </div>
    </div>
  );
}
