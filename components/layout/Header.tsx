import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* 로고 */}
        <Link
          href="/"
          className="text-lg font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        >
          IdolUniv
        </Link>

        {/* 우측 액션 */}
        <div className="flex items-center gap-2">
          {user ? (
            <form action="/auth/signout" method="POST">
              <Button variant="ghost" size="sm" type="submit">
                로그아웃
              </Button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-[min(var(--radius-md),12px)] px-2.5 h-7 text-[0.8rem] font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
