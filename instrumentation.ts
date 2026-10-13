import type { Instrumentation } from "next";
import * as Sentry from "@sentry/nextjs";

// 서버 런타임마다 Sentry 를 한 번 초기화한다 (F9-6, D-31)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const { sentryOptions } = await import("./lib/sentry-options");
    Sentry.init(sentryOptions);
  }
}

// 서버 오류 수집 (F9-6). Sentry 로 보내고(30일 보관), Vercel 로그에도 한 줄 JSON 으로 남긴다(Hobby 는 1시간 보관).
// digest 는 화면의 "오류 코드"와 같아서 사용자 문의와 로그를 맞춰 볼 수 있다.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  Sentry.captureRequestError(error, request, context);
  const err = error as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      source: "server",
      digest: err.digest,
      route: context.routePath,
      routeType: context.routeType,
      method: request.method,
      // 쿼리 문자열은 남기지 않는다
      path: request.path.split("?")[0],
      message: err.message?.slice(0, 500),
    })
  );
};
