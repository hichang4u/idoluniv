"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PostType } from "@/types/database";

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }
  return userId;
}

export async function createPost(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const groupSlug = formData.get("groupSlug") as string;
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const postType = (formData.get("post_type") as PostType) ?? "text";

  if (!groupSlug || !title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }
  if (title.length > 100) {
    return { error: "제목은 100자 이내로 입력해주세요." };
  }

  const { data: group } = await supabase
    .from("idol_groups")
    .select("id")
    .eq("slug", groupSlug)
    .single();

  if (!group) return { error: "존재하지 않는 게시판입니다." };

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      idol_group_id: group.id,
      author_id: userId,
      title,
      content,
      post_type: postType,
    })
    .select("id")
    .single();

  if (error) return { error: "게시글 저장에 실패했습니다." };
  if (!post?.id) return { error: "게시글 저장에 실패했습니다." };

  revalidatePath(`/board/${groupSlug}`);
  redirect(`/board/${groupSlug}/${post.id}`);
}

export async function updatePost(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const postId = formData.get("postId") as string;
  const groupSlug = formData.get("groupSlug") as string;
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const postType = (formData.get("post_type") as PostType) ?? "text";

  if (!postId || !title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  const { error } = await supabase
    .from("posts")
    .update({
      title,
      content,
      post_type: postType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("author_id", userId);

  if (error) return { error: "게시글 수정에 실패했습니다." };

  revalidatePath(`/board/${groupSlug}/${postId}`);
  redirect(`/board/${groupSlug}/${postId}`);
}

export async function deletePost(postId: string, groupSlug: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", userId);

  if (error) return { error: "게시글 삭제에 실패했습니다." };

  revalidatePath(`/board/${groupSlug}`);
  redirect(`/board/${groupSlug}`);
}

export async function incrementViewCount(postId: string) {
  const supabase = await createClient();
  await supabase.rpc("increment_view_count", { p_post_id: postId }).maybeSingle();
}
