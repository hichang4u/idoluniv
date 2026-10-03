import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getViewer, nextNicknameChangeAt } from "@/lib/viewer";
import { ChangeNicknameForm } from "@/components/me/ChangeNicknameForm";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "마이",
  robots: { index: false },
};

const LINKS = [
  { href: "/guidelines", label: "커뮤니티 가이드라인" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
];

// MVP 최소판 (TECH-DESIGN §7.1): 닉네임 표시·변경, 약관 링크, 로그아웃.
// 최근 방문 그룹·화면 모드·뷰어 글꼴은 디자인 적용(T11)과 함께.
export default async function MePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=%2Fme");
  if (!viewer.onboarded) redirect("/onboarding?next=%2Fme");

  const nextChange = nextNicknameChangeAt(viewer);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-bold">마이</h1>

      <section aria-labelledby="profile-h" className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-xl font-semibold" aria-hidden="true">
            {viewer.nickname?.[0] ?? "?"}
          </span>
          <div className="min-w-0">
            <h2 id="profile-h" className="truncate text-lg font-semibold">
              {viewer.nickname}
            </h2>
            <p className="text-sm text-muted-foreground">
              {nextChange
                ? `닉네임은 ${nextChange.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}부터 바꿀 수 있어요`
                : "닉네임을 바꿀 수 있어요 (30일에 한 번)"}
            </p>
          </div>
        </div>
        {!nextChange && <ChangeNicknameForm current={viewer.nickname ?? ""} />}
      </section>

      <nav aria-label="정책" className="rounded-xl border border-border bg-card">
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-12 items-center justify-between px-5 text-sm hover:bg-muted/50 ${i > 0 ? "border-t border-border" : ""}`}
          >
            {link.label}
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <form action="/auth/signout" method="POST">
        <Button type="submit" variant="outline" className="h-11 w-full">
          로그아웃
        </Button>
      </form>
    </div>
  );
}
