"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/limits";
import { safeNext } from "@/lib/safe-next";
import { TERMS_VERSION } from "@/lib/legal/config";
import { fail, fromDbError, ok, type ActionResult } from "@/lib/action-result";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// DB(normalize_nickname)와 같은 규칙. 최종 판정은 DB 가 한다.
function normalizeNickname(raw: string): string {
  return raw.normalize("NFC").trim();
}

function formatKoreanDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

/** 온보딩: 닉네임 + 만 14세 확인 + 약관 동의. 성공하면 next 로 이동한다. */
export async function completeOnboarding(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const nickname = normalizeNickname(readText(formData, "nickname"));
  const ageOver14 = formData.get("ageOver14") === "on";
  const agreeTerms = formData.get("agreeTerms") === "on";
  const next = safeNext(readText(formData, "next"));

  if (!LIMITS.nickname.pattern.test(nickname)) {
    return fail("NICKNAME_INVALID", { fields: { nickname: "NICKNAME_INVALID" } });
  }
  if (!ageOver14 || !agreeTerms) {
    return fail("CONSENT_REQUIRED");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_nickname: nickname,
    p_age_over_14: ageOver14,
    p_agree_terms: agreeTerms,
    p_terms_version: TERMS_VERSION,
  });

  if (error) {
    const code = fromDbError(error, "NICKNAME_TAKEN");
    if (code === "AUTH_REQUIRED") redirect(`/login?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}`)}`);
    return fail(code, code.startsWith("NICKNAME_") ? { fields: { nickname: code } } : {});
  }

  redirect(next);
}

/** 닉네임 변경(30일에 한 번). 성공하면 다음에 바꿀 수 있는 시각을 돌려준다. */
export async function changeNickname(
  _prev: ActionResult<{ nextChangeAt: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ nextChangeAt: string }>> {
  const nickname = normalizeNickname(readText(formData, "nickname"));
  if (!LIMITS.nickname.pattern.test(nickname)) {
    return fail("NICKNAME_INVALID", { fields: { nickname: "NICKNAME_INVALID" } });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("change_nickname", { p_nickname: nickname });

  if (error) {
    const code = fromDbError(error, "NICKNAME_TAKEN");
    if (code === "NICKNAME_COOLDOWN" && error.details) {
      return fail(code, {
        message: `닉네임은 ${formatKoreanDate(error.details)}부터 바꿀 수 있어요.`,
        fields: { nickname: code },
      });
    }
    return fail(code, code.startsWith("NICKNAME_") ? { fields: { nickname: code } } : {});
  }

  refresh();
  return ok({ nextChangeAt: data });
}
