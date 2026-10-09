// 신고 사유 코드 (PRD 6.1). DB CHECK(0011 reports.reason, submit_report)와 같은 목록이다.
// 순서는 신고 시트에 보이는 순서다.
export const REPORT_REASONS = [
  { code: "spam", label: "스팸·광고·도배", example: "외부 판매 링크 반복, 같은 글 복붙" },
  { code: "abuse", label: "욕설·혐오·괴롭힘", example: "특정 팬·멤버 비하, 타 팬덤 공격" },
  { code: "privacy", label: "개인정보·사생활 침해", example: "비공개 일정·항공편·숙소, 사생 사진, 일반인 신상" },
  { code: "sexual", label: "성적 콘텐츠", example: "실존 인물 성적 묘사, 성적 합성물(딥페이크)" },
  { code: "rumor", label: "허위사실·명예훼손", example: "근거 없는 열애·범죄 루머" },
  { code: "copyright", label: "저작권·초상권 침해", example: "유료 콘텐츠 전재, 공식 사진 무단 상업 이용" },
  { code: "impersonation", label: "사칭", example: "아이돌·운영자·다른 사용자 사칭" },
  { code: "other", label: "기타", example: "위에 없는 문제" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["code"];
export type ReportTargetType = "post" | "comment" | "chat_message";

export const REPORT_TARGET_TYPES: readonly ReportTargetType[] = ["post", "comment", "chat_message"];

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASONS.some((r) => r.code === value);
}
