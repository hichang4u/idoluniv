import Link from "next/link";
import { SearchX } from "lucide-react";
import { StatusScreen } from "@/components/layout/StatusScreen";
import { Button } from "@/components/ui/button";

// 어떤 라우트에도 맞지 않는 주소. (main) 셸 밖이라 상단 바·탭바 없이 가운데에 둔다
export default function RootNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <StatusScreen
        icon={<SearchX aria-hidden="true" />}
        title="페이지를 찾을 수 없어요"
        description="주소를 다시 확인해 주세요."
      >
        <Button size="touch" nativeButton={false} render={<Link href="/">IdolUniv 홈으로</Link>} />
      </StatusScreen>
    </main>
  );
}
