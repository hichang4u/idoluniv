"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("sid")?.value;
  if (existing) return existing;
  const newId = crypto.randomUUID();
  cookieStore.set("sid", newId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return newId;
}

export async function getOrCreateChatRoom(groupId: string): Promise<string | null> {
  const supabase = await createClient();

  // chat_rooms 직접 insert 는 RLS 로 차단되어 있다 (0004_rls_hardening.sql)
  const { data, error } = await supabase.rpc("get_or_create_chat_room", {
    p_group_id: groupId,
  });

  if (error) return null;
  return (data as string | null) ?? null;
}

export async function sendMessage(formData: FormData): Promise<{ error: string | null }> {
  const roomId = formData.get("roomId") as string;
  const content = (formData.get("content") as string)?.trim();
  const nickname = ((formData.get("nickname") as string)?.trim() || "익명").slice(0, 20);

  if (!roomId || !content) return { error: "내용을 입력해주세요." };
  if (content.length > 500) return { error: "500자 이내로 입력해주세요." };

  const sessionId = await getOrCreateSessionId();
  const supabase = await createClient();

  const { error } = await supabase.from("chat_messages").insert({
    room_id: roomId,
    content,
    nickname,
    session_id: sessionId,
    // TODO: author_id = (await supabase.auth.getUser()).data.user?.id
  });

  if (error) return { error: "메시지 전송에 실패했습니다." };
  return { error: null };
}
