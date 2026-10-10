import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    // 데스크톱 전역 헤더 50px (TOKENS §5). 모바일은 화면마다 자기 상단 바(TopBar)를 쓰고 하단 탭바로 이동한다 (목업 01~08)
    <header className="sticky top-0 z-50 hidden h-[50px] shrink-0 items-center gap-2 border-b border-border bg-background/80 md:flex px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <Link
        href="/"
        // 잉크 단색 워드마크: 서비스는 고유색이 없고 색은 그룹만 가진다 (TOKENS §1, D-15=A)
        className="text-lg font-bold tracking-tight text-text-strong"
      >
        IdolUniv
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <form action="/auth/signout" method="POST">
            <Button variant="ghost" type="submit" className="relative h-9 px-3 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']">
              로그아웃
            </Button>
          </form>
        ) : (
          <Button
            // 보이는 높이 36px, 누르는 영역은 가상 요소로 44px (50px 상단 바 안에서 꽉 차 보이지 않게)
            className="relative h-9 px-3 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
            nativeButton={false}
            render={<Link href="/login">로그인</Link>}
          />
        )}
      </div>
    </header>
  );
}
