import Link from "next/link";
import { SearchX } from "lucide-react";
import { StatusScreen } from "@/components/layout/StatusScreen";
import { Button } from "@/components/ui/button";

// notFound() — 없는 그룹·글, 숨김 글(작성자·관리자가 아닐 때), 관리자 아닌 사람의 /admin
export default function MainNotFound() {
  return (
    <StatusScreen
      icon={<SearchX aria-hidden="true" />}
      title="페이지를 찾을 수 없어요"
      description="주소가 바뀌었거나, 삭제되었거나, 볼 수 없는 페이지예요."
    >
      <Button size="touch" nativeButton={false} render={<Link href="/g">그룹 둘러보기</Link>} />
      <Button size="touch" variant="outline" nativeButton={false} render={<Link href="/">홈으로</Link>} />
    </StatusScreen>
  );
}
