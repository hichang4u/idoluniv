"use server";

import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/limits";
import { type ActionResult, fail, fromDbError, ok } from "@/lib/action-result";
import { LOUNGE_MESSAGE_COLUMNS, type LoungeMessage } from "@/types/database";

export async function getOrCreateChatRoom(groupId: string): Promise<string | null> {
  const supabase = await createClient();

  // chat_rooms 직접 insert 는 RLS 로 차단되어 있다 (0004_rls_hardening.sql)
  const { data, error } = await supabase.rpc("get_or_create_chat_room", {
    p_group_id: groupId,
  });

  if (error) return null;
  return data ?? null;
}

/**
 * 라운지 메시지 전송. 발신자·닉네임은 DB 트리거가 채운다(0010, AD-5).
 * 보낸 메시지를 돌려줘서 Realtime 이 늦거나 끊겨도 보낸 사람 화면에는 바로 보이게 한다.
 */
export async function sendMessage(roomId: string, rawContent: string): Promise<ActionResult<LoungeMessage>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("AUTH_REQUIRED");

  const content = rawContent.trim();
  if (!roomId) return fail("ROOM_NOT_FOUND");
  if (!content) return fail("VALIDATION", { message: "내용을 입력해 주세요." });
  if (content.length > LIMITS.chat)
    return fail("VALIDATION", { message: `메시지는 ${LIMITS.chat}자까지 쓸 수 있어요.` });

  // 온보딩·방·빈도 제한·연속 중복은 DB 트리거가 검사한다
  // (ONBOARDING_REQUIRED, ROOM_NOT_FOUND, RATE_LIMITED, DUPLICATE_MESSAGE)
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ room_id: roomId, content })
    .select(LOUNGE_MESSAGE_COLUMNS)
    .single();

  if (error || !data) return fail(fromDbError(error));
  return ok(data);
}
