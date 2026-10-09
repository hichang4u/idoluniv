import { createClient } from "@/lib/supabase/server";
import type { ReportTargetType } from "@/lib/report-reasons";

/**
 * 화면에 보이는 대상 중 내가 신고한 것의 id (F7-4, AD-10).
 * 가림은 보안이 아니라 표시 단계의 UX 라 RLS 가 아니라 여기서 한다.
 * 관리자는 RLS 상 모든 신고를 읽으므로 reporter_id 를 꼭 건다.
 */
export async function getMyReportedIds(
  viewerId: string | null,
  targets: { type: ReportTargetType; ids: string[] }[],
): Promise<Set<string>> {
  const wanted = targets.filter((t) => t.ids.length > 0);
  if (!viewerId || wanted.length === 0) return new Set();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("reporter_id", viewerId)
    .in("target_type", wanted.map((t) => t.type))
    .in("target_id", wanted.flatMap((t) => t.ids));
  if (error) {
    console.error("[reports] my reported ids failed", { code: error.code, message: error.message });
    return new Set();
  }
  // 다른 유형의 같은 id 는 사실상 없지만(uuid) 유형까지 맞춰 본다
  const allowed = new Map(wanted.map((t) => [t.type, new Set(t.ids)]));
  return new Set(
    (data ?? [])
      .filter((r) => allowed.get(r.target_type as ReportTargetType)?.has(r.target_id))
      .map((r) => r.target_id),
  );
}
