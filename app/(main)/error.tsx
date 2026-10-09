"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { StatusScreen } from "@/components/layout/StatusScreen";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-errors";

// 화면을 그리다 난 오류 (디자인 리뷰 S10). 서버 오류는 메시지 대신 digest 만 오므로 문의용으로 보여 준다.
export default function MainError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // 서버 오류는 instrumentation.ts 가 이미 남겼고, 여기서는 같은 digest 로 화면 쪽 기록을 남긴다
    reportClientError("boundary", error, error.digest);
  }, [error]);

  return (
    <StatusScreen
      icon={<CircleAlert aria-hidden="true" />}
      title="문제가 생겼어요"
      description={
        <>
          잠시 후 다시 시도해 주세요.
          {error.digest && <span className="mt-1 block text-xs tabular-nums">오류 코드 {error.digest}</span>}
        </>
      }
    >
      <Button size="touch" onClick={() => unstable_retry()}>
        다시 시도
      </Button>
      <Button size="touch" variant="outline" nativeButton={false} render={<Link href="/">홈으로</Link>} />
    </StatusScreen>
  );
}
