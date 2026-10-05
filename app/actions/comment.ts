"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/limits";
import { type ActionResult, fail, fromDbError, ok } from "@/lib/action-result";

// 성공하면 지금 보고 있는 상세 화면을 다시 그린다.
// 클라이언트가 보낸 slug 로 경로를 만들지 않는다 (N2)

export async function createComment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("AUTH_REQUIRED");

  const postId = String(formData.get("postId") ?? "");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const content = String(formData.get("content") ?? "").trim();

  if (!postId) return fail("POST_NOT_FOUND");
  if (!content) return fail("VALIDATION", { message: "내용을 입력해 주세요." });
  if (content.length > LIMITS.comment)
    return fail("VALIDATION", { message: `댓글은 ${LIMITS.comment.toLocaleString()}자까지 쓸 수 있어요.` });

  // 온보딩·글 존재·부모 검증·빈도 제한은 DB 트리거가 한다
  // (ONBOARDING_REQUIRED, POST_NOT_FOUND, INVALID_PARENT, RATE_LIMITED)
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    parent_id: parentId,
    content,
    author_id: user.id,
  });
  if (error) return fail(fromDbError(error));

  refresh();
  return ok();
}

/** 대댓글이 있으면 자리를 남기고(tombstoned) 없으면 지운다(deleted) — AD-11 */
export async function deleteComment(commentId: string): Promise<ActionResult<"deleted" | "tombstoned">> {
  const supabase = await createClient();
  // anon 은 EXECUTE 권한이 없어 42501(FORBIDDEN)이 나므로 로그인 여부를 먼저 본다
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("AUTH_REQUIRED");

  const { data, error } = await supabase.rpc("delete_comment", { p_comment_id: commentId });
  if (error) return fail(fromDbError(error));

  refresh();
  return ok(data === "tombstoned" ? "tombstoned" : "deleted");
}
