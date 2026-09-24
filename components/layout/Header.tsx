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
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <Link
        href="/"
        className="bg-gradient-to-r from-primary to-accent bg-clip-text text-lg font-extrabold text-transparent"
      >
        IdolUniv
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <form action="/auth/signout" method="POST">
            <Button variant="ghost" size="sm" type="submit">
              로그아웃
            </Button>
          </form>
        ) : (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/login">로그인</Link>}
          />
        )}
      </div>
    </header>
  );
}
