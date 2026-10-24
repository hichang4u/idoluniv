import * as Sentry from "@sentry/nextjs";
import { reportClientError } from "@/lib/client-errors";
import { sentryOptions } from "@/lib/sentry-options";

// 브라우저 오류 수집 (F9-6, D-31). Sentry 가 처리되지 않은 오류·거부된 Promise 를 직접 모은다.
Sentry.init(sentryOptions);

// Vercel 로그 쪽 기록(1시간 보관)도 그대로 둔다: Sentry 가 막히거나(광고 차단) 한도를 넘어도 최근 오류는 볼 수 있게
window.addEventListener("error", (event) => reportClientError("error", event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportClientError("unhandledrejection", event.reason));
