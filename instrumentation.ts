import type { Instrumentation } from "next";

// 서버 오류 수집 (F9-6). 수집처는 Vercel 로그(D-5) — 한 줄 JSON 으로 남겨 검색하기 쉽게 한다.
// digest 는 화면의 "오류 코드"와 같아서 사용자 문의와 로그를 맞춰 볼 수 있다.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
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
