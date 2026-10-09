// 날짜 표시. 서버(Vercel, UTC)와 브라우저가 같은 문자열을 만들도록 시간대를 한국으로 고정한다.
// 게시판·댓글의 기존 formatDate 는 T11 에서 이쪽으로 옮긴다.
const DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string) {
  return DATE_TIME.format(new Date(iso));
}
