import type { ErrorEvent } from "@sentry/nextjs";

// Sentry 공통 설정 (F9-6, D-31). 서버·브라우저가 같이 쓴다.
// DSN 이 없으면(로컬·미설정) 아무것도 보내지 않는다. 오류만 모으고 성능 추적·세션 리플레이는 쓰지 않는다(무료 한도·개인정보).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// 쿼리 문자열에는 검색어·next 같은 사용자 입력이 섞일 수 있어 보내지 않는다(instrumentation.ts 의 로그와 같은 기준)
function stripQuery(url: string | undefined) {
  return url?.split("?")[0];
}

function scrub(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request.url = stripQuery(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.headers;
  }
  // 서버 오류에는 Next.js 가 요청 경로를 쿼리째 붙인다
  const nextjs = event.contexts?.nextjs;
  if (nextjs && typeof nextjs.request_path === "string") nextjs.request_path = stripQuery(nextjs.request_path);
  if (event.transaction) event.transaction = stripQuery(event.transaction);
  for (const crumb of event.breadcrumbs ?? []) {
    if (typeof crumb.data?.url === "string") crumb.data.url = stripQuery(crumb.data.url);
    if (typeof crumb.data?.to === "string") crumb.data.to = stripQuery(crumb.data.to);
    if (typeof crumb.data?.from === "string") crumb.data.from = stripQuery(crumb.data.from);
  }
  return event;
}

export const sentryOptions = {
  dsn,
  enabled: !!dsn && process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: scrub,
};
