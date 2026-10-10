import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { PostForm } from "@/components/board/PostForm";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = { title: "게시글 수정", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { slug: groupSlug, id: postId } = await params;
  const path = `/g/${groupSlug}/posts/${postId}/edit`;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`);

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id, title, content, post_type, is_hidden, idol_group:idol_group_id(slug)")
    .eq("id", postId)
    .maybeSingle();

  // 작성자만 수정한다. 남의 글이면 존재 여부를 드러내지 않게 404 (F3-5).
  // 숨김 글은 내용을 바꿔 다시 노출시키지 못하게 수정 화면을 열지 않는다 🟡
  if (!post || post.author_id !== viewer.id || post.is_hidden) notFound();
  if (post.idol_group && post.idol_group.slug !== groupSlug) {
    redirect(`/g/${post.idol_group.slug}/posts/${postId}/edit`);
  }

  return (
    <>
      <TopBar back={`/g/${groupSlug}/posts/${postId}`} backLabel="글로 돌아가기" title="게시글 수정" />
      <div className="px-4 py-4 md:p-0">
        <div className="rounded-2xl bg-card p-5 shadow-card md:p-6 dark:shadow-none">
          <PostForm groupSlug={groupSlug} post={post} />
        </div>
      </div>
    </>
  );
}
