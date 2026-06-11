"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  if (!userId) throw new Error("로그인이 필요합니다.");
  return userId;
}

async function getGroupSlugByPostId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string
) {
  const { data: post } = await supabase
    .from("posts")
    .select("idol_group_id")
    .eq("id", postId)
    .single();

  const groupId = post?.idol_group_id;
  if (!groupId) return null;

  const { data: group } = await supabase
    .from("idol_groups")
    .select("slug")
    .eq("id", groupId)
    .single();

  return group?.slug ?? null;
}

export async function createComment(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const postId = formData.get("postId") as string;
  const groupSlug = formData.get("groupSlug") as string;
  const parentId = (formData.get("parentId") as string) || null;
  const content = (formData.get("content") as string)?.trim();

  if (!postId || !content) return { error: "내용을 입력해주세요." };
  if (content.length > 1000) return { error: "댓글은 1000자 이내로 입력해주세요." };

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    parent_id: parentId,
    content,
    author_id: userId,
  });

  if (error) return { error: "댓글 저장에 실패했습니다." };

  revalidatePath(`/board/${groupSlug}/${postId}`);
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const groupSlug = await getGroupSlugByPostId(supabase, postId);
  if (!groupSlug) return { error: "게시글을 찾을 수 없습니다." };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", userId);

  if (error) return { error: "댓글 삭제에 실패했습니다." };

  revalidatePath(`/board/${groupSlug}/${postId}`);
}
