import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  nickname: string | null;
  onboarded: boolean;
  isAdmin: boolean;
  nicknameChangedAt: string | null;
};

// 현재 로그인 사용자의 상태(TECH-DESIGN §6.1). 요청당 한 번만 조회한다.
// 권한 판단의 최종 근거는 DB(RLS·RPC)이고, 이 값은 화면 분기·안내용이다.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("get_viewer").maybeSingle();
  if (error) {
    console.error("[viewer] get_viewer failed", { code: error.code, message: error.message });
    // 상태를 모르면 온보딩 전으로 취급한다(쓰기는 어차피 DB 가 막는다)
    return { id: user.id, nickname: null, onboarded: false, isAdmin: false, nicknameChangedAt: null };
  }
  if (!data) {
    return { id: user.id, nickname: null, onboarded: false, isAdmin: false, nicknameChangedAt: null };
  }
  return {
    id: data.id,
    nickname: data.nickname,
    onboarded: data.onboarded,
    isAdmin: data.is_admin,
    nicknameChangedAt: data.nickname_changed_at,
  };
});

/** 닉네임을 다시 바꿀 수 있는 시각(30일 쿨다운, D-11) */
export function nextNicknameChangeAt(viewer: Viewer): Date | null {
  if (!viewer.nicknameChangedAt) return null;
  const at = new Date(viewer.nicknameChangedAt);
  at.setDate(at.getDate() + 30);
  return at > new Date() ? at : null;
}
