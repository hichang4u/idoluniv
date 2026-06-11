"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return sessionId;
}

export async function togglePostLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const supabase = await createClient();
  const sessionId = await getOrCreateSessionId();

  const { data, error } = await supabase.rpc("toggle_post_like", {
    p_post_id: postId,
    p_session_id: sessionId,
  });

  if (error) throw new Error("좋아요 처리 실패");

  const liked = !!data;

  const { data: post } = await supabase
    .from("posts")
    .select("like_count")
    .eq("id", postId)
    .single();

  return { liked, likeCount: post?.like_count ?? 0 };
}

export async function togglePostScrap(postId: string): Promise<{ scrapped: boolean }> {
  const supabase = await createClient();
  const sessionId = await getOrCreateSessionId();

  const { data, error } = await supabase.rpc("toggle_post_scrap", {
    p_post_id: postId,
    p_session_id: sessionId,
  });

  if (error) throw new Error("스크랩 처리 실패");

  return { scrapped: !!data };
}

export async function getPostReactions(
  postId: string
): Promise<{ liked: boolean; scrapped: boolean }> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) return { liked: false, scrapped: false };

  const { data } = await supabase
    .from("reactions")
    .select("reaction_type")
    .eq("session_id", sessionId)
    .eq("target_type", "post")
    .eq("target_id", postId);

  const types = new Set((data ?? []).map((r) => r.reaction_type));
  return {
    liked: types.has("like"),
    scrapped: types.has("scrap"),
  };
}
