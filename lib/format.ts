// 날짜 표시. 서버(Vercel, UTC)와 브라우저가 같은 문자열을 만들도록 시간대를 한국으로 고정한다.
const TZ = "Asia/Seoul";

const DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const FULL_DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TZ,
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const SHORT_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, month: "short", day: "numeric" });
const TIME = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

/** 10월 9일 오후 09:30 */
export function formatDateTime(iso: string) {
  return DATE_TIME.format(new Date(iso));
}

/** 2026년 10월 9일 오후 09:30 — 글 상세 */
export function formatFullDateTime(iso: string) {
  return FULL_DATE_TIME.format(new Date(iso));
}

/** 21:38 — 라운지 메시지 */
export function formatTime(iso: string) {
  return TIME.format(new Date(iso));
}

/**
 * 방금 전 · n분 전 · n시간 전 · 10월 9일 — 목록·댓글.
 * 서버 렌더와 하이드레이션 사이에 분이 바뀔 수 있어 쓰는 곳의 <time> 에 suppressHydrationWarning 을 둔다.
 */
export function formatRelative(iso: string, now: Date = new Date()) {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return SHORT_DATE.format(new Date(iso));
}
