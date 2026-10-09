"use server";

import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/limits";
import { type ActionResult, fail, fromDbError, ok } from "@/lib/action-result";
import { REPORT_TARGET_TYPES, isReportReason, type ReportTargetType } from "@/lib/report-reasons";

/**
 * 신고 (F7). 본인 콘텐츠·중복·빈도 제한·자동 숨김은 submit_report(0011)가 처리한다.
 * 화면을 다시 그리지 않는다: 3번째 신고로 글이 자동 숨김되면 새로 그린 상세가 404 가 되므로,
 * 신고한 사람 화면은 클라이언트 상태로 "신고한 콘텐츠" 자리표시만 바꾼다(F7-4).
 */
export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  detail: string,
): Promise<ActionResult<{ reportId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("AUTH_REQUIRED");

  const trimmed = detail.trim();
  if (!REPORT_TARGET_TYPES.includes(targetType) || !targetId) return fail("NOT_FOUND");
  if (!isReportReason(reason)) return fail("VALIDATION", { message: "신고 사유를 골라 주세요." });
  if (trimmed.length > LIMITS.reportDetail)
    return fail("VALIDATION", { message: `설명은 ${LIMITS.reportDetail}자까지 쓸 수 있어요.` });

  const { data, error } = await supabase.rpc("submit_report", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_detail: trimmed || undefined,
  });
  if (error || !data) return fail(fromDbError(error));
  return ok({ reportId: data });
}
