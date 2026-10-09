// 브라우저 오류를 /api/client-errors 로 보낸다 (F9-6). instrumentation-client.ts 와 error.tsx 가 쓴다.
// 같은 오류가 되풀이되며 로그를 채우지 않도록 페이지당 10건까지만, 같은 메시지는 한 번만 보낸다.
const MAX_REPORTS = 10;
const seen = new Set<string>();

export function reportClientError(kind: "error" | "unhandledrejection" | "boundary", reason: unknown, digest?: string) {
  if (typeof window === "undefined") return;
  const err = reason instanceof Error ? reason : null;
  const message = err?.message ?? (typeof reason === "string" ? reason : "unknown");
  const key = `${kind}:${digest ?? message}`;
  if (seen.size >= MAX_REPORTS || seen.has(key)) return;
  seen.add(key);

  const body = JSON.stringify({ kind, route: window.location.pathname, message, stack: err?.stack, digest });
  try {
    // 페이지를 떠나는 중에도 보내지도록 sendBeacon 을 먼저 쓴다
    if (!navigator.sendBeacon?.("/api/client-errors", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/client-errors", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      });
    }
  } catch {
    // 수집 실패는 무시한다
  }
}
