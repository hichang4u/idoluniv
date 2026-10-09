"use client";

import "./globals.css";

// 루트 레이아웃까지 실패했을 때. 레이아웃을 대신하므로 html·body 를 직접 그린다(Next 16 global-error)
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
        <title>문제가 생겼어요 | IdolUniv</title>
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-bold text-text-strong">문제가 생겼어요</h1>
          <p className="text-sm text-muted-foreground break-keep">
            잠시 후 다시 시도해 주세요.
            {error.digest && <span className="mt-1 block text-xs tabular-nums">오류 코드 {error.digest}</span>}
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-11 items-center rounded-lg bg-ink px-4 text-sm font-medium text-on-ink"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
