"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupBySlug } from "@/lib/groups";
import { LIMITS } from "@/lib/limits";
import { type ActionResult, fail, fromDbError } from "@/lib/action-result";
import { WRITABLE_POST_TYPES, type WritablePostType } from "@/types/database";

type PostFields = { title: string; content: string; postType: WritablePostType | null };

// 폼 값 검사. DB CHECK(0009)가 최종 방어선이고 여기는 빠른 오류 메시지용이다.
// postType 이 고를 수 없는 값(기존 image·video 글의 hidden 값 등)이면 null 이다.
function readPostFields(formData: FormData): { fields: PostFields } | { error: ActionResult<never> } {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const rawType = String(formData.get("post_type") ?? "");
  const postType = (WRITABLE_POST_TYPES as readonly string[]).includes(rawType) ? (rawType as WritablePostType) : null;

  const errors: Record<string, string> = {};
  if (!title) errors.title = "제목을 입력해 주세요.";
  else if (title.length > LIMITS.postTitle) errors.title = `제목은 ${LIMITS.postTitle}자까지 쓸 수 있어요.`;
  if (!content) errors.content = "내용을 입력해 주세요.";
  else if (content.length > LIMITS.postContent)
    errors.content = `내용은 ${LIMITS.postContent.toLocaleString()}자까지 쓸 수 있어요.`;

  if (Object.keys(errors).length > 0) return { error: fail("VALIDATION", { fields: errors }) };
  return { fields: { title, content, postType } };
}

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createPost(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return fail("AUTH_REQUIRED");

  const read = readPostFields(formData);
  if ("error" in read) return read.error;
  const { title, content, postType } = read.fields;
  if (!postType) return fail("VALIDATION", { fields: { post_type: "글 유형을 골라 주세요." } });

  const group = await getActiveGroupBySlug(String(formData.get("groupSlug") ?? ""));
  if (!group) return fail("GROUP_NOT_FOUND");

  // 온보딩·빈도 제한은 DB 트리거가 검사한다(ONBOARDING_REQUIRED, RATE_LIMITED)
  const { data: post, error } = await supabase
    .from("posts")
    .insert({ idol_group_id: group.id, author_id: userId, title, content, post_type: postType })
    .select("id")
    .single();

  if (error || !post) return fail(fromDbError(error));

  redirect(`/g/${group.slug}/posts/${post.id}`);
}

export async function updatePost(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return fail("AUTH_REQUIRED");

  const postId = String(formData.get("postId") ?? "");
  if (!postId) return fail("NOT_FOUND_OR_FORBIDDEN");

  const read = readPostFields(formData);
  if ("error" in read) return read.error;
  const { title, content, postType } = read.fields;

  // updated_at 은 DB 트리거가 정한다(N9). 기존 image·video 글은 유형을 건드리지 않는다.
  const { data: rows, error } = await supabase
    .from("posts")
    .update(postType ? { title, content, post_type: postType } : { title, content })
    .eq("id", postId)
    .eq("author_id", userId)
    .select("id, idol_group:idol_group_id(slug)");

  if (error) return fail(fromDbError(error));
  // RLS 로 걸러지면 오류 없이 0행이다 (F3-5)
  const updated = rows?.[0];
  if (!updated) return fail("NOT_FOUND_OR_FORBIDDEN");

  redirect(updated.idol_group ? `/g/${updated.idol_group.slug}/posts/${updated.id}` : "/g");
}

export async function deletePost(postId: string): Promise<ActionResult<never>> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return fail("AUTH_REQUIRED");

  const { data: rows, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", userId)
    .select("id, idol_group:idol_group_id(slug)");

  if (error) return fail(fromDbError(error));
  const deleted = rows?.[0];
  if (!deleted) return fail("NOT_FOUND_OR_FORBIDDEN");

  redirect(deleted.idol_group ? `/g/${deleted.idol_group.slug}` : "/g");
}
