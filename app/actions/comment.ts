"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/limits";

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  if (!userId) throw new Error("로그인이 필요합니다.");
  return userId;
}

export async function createComment(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const postId = formData.get("postId") as string;
  const parentId = (formData.get("parentId") as string) || null;
  const content = (formData.get("content") as string)?.trim();

  if (!postId || !content) return { error: "내용을 입력해주세요." };
  if (content.length > LIMITS.comment) return { error: `댓글은 ${LIMITS.comment}자 이내로 입력해주세요.` };

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    parent_id: parentId,
    content,
    author_id: userId,
  });

  if (error) return { error: "댓글 저장에 실패했습니다." };

  // 지금 보고 있는 상세 화면을 다시 그린다. 클라이언트가 보낸 slug 로 경로를 만들지 않는다 (N2)
  refresh();
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", userId);

  if (error) return { error: "댓글 삭제에 실패했습니다." };

  // 지금 보고 있는 상세 화면을 다시 그린다. 클라이언트가 보낸 slug 로 경로를 만들지 않는다 (N2)
  refresh();
}
