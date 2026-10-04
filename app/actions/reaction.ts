"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fail, fromDbError, ok, type ActionResult } from "@/lib/action-result";

// 좋아요·스크랩은 로그인 + 온보딩이 필요하다(D-1=A, D-13). 신원은 DB 가 auth.uid() 로 판단한다.

export async function togglePostLike(
  postId: string,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_post_like", { p_post_id: postId }).single();
  if (error) return fail(fromDbError(error));
  return ok({ liked: data.liked, likeCount: data.like_count });
}

export async function togglePostScrap(postId: string): Promise<ActionResult<{ scrapped: boolean }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_post_scrap", { p_post_id: postId });
  if (error) return fail(fromDbError(error));
  return ok({ scrapped: data });
}

/** 현재 사용자의 좋아요·스크랩 여부. 비로그인이면 둘 다 false. RLS 가 본인 행만 돌려준다. */
export async function getPostReactions(postId: string): Promise<{ liked: boolean; scrapped: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { liked: false, scrapped: false };

  const { data } = await supabase
    .from("reactions")
    .select("reaction_type")
    .eq("target_type", "post")
    .eq("target_id", postId);

  const types = new Set((data ?? []).map((r) => r.reaction_type));
  return { liked: types.has("like"), scrapped: types.has("scrap") };
}

/**
 * 조회 기록(24시간 중복 제거, DB 가 판단). 로그인 사용자는 auth.uid() 로, 비로그인은 proxy 가 발급한
 * vid 쿠키로 센다. 렌더 중에 호출하므로 쿠키를 읽기만 한다(설정은 proxy 담당).
 */
export async function recordPostView(postId: string): Promise<void> {
  const cookieStore = await cookies();
  const vid = cookieStore.get("vid")?.value ?? null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_post_view", {
    p_post_id: postId,
    p_anon_key: vid && /^[0-9a-f-]{36}$/.test(vid) ? vid : undefined,
  });
  if (error) console.error("[view] record_post_view failed", { code: error.code, message: error.message });
}
