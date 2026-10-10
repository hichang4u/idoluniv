import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, FileText, LockKeyhole, LogOut, ShieldCheck, Tag, Wrench, type LucideIcon } from "lucide-react";
import { getViewer, nextNicknameChangeAt } from "@/lib/viewer";
import { IconChip } from "@/components/common/IconChip";
import { TopBar } from "@/components/layout/TopBar";
import { ProfileCard } from "@/components/me/ProfileCard";
import { RecentGroups } from "@/components/me/RecentGroups";
import { ThemeSetting } from "@/components/me/ThemeSetting";
import type { GroupColorKey } from "@/lib/group-colors";
import pkg from "@/package.json";

export const metadata: Metadata = {
  title: "마이",
  robots: { index: false },
};

// 설정 행의 아이콘 칩 색은 항목마다 고정한다 (TOKENS §6.0)
const LINKS: { href: string; label: string; icon: LucideIcon; color: GroupColorKey }[] = [
  { href: "/guidelines", label: "커뮤니티 가이드라인", icon: ShieldCheck, color: "mint" },
  { href: "/terms", label: "이용약관", icon: FileText, color: "sky" },
  { href: "/privacy", label: "개인정보처리방침", icon: LockKeyhole, color: "baby" },
];

const row = "flex min-h-[50px] items-center gap-3 border-t border-border px-4 text-[15px] text-text-strong";

// MVP 최소판 (목업 08, TECH-DESIGN §6.5): 닉네임, 최근 방문 그룹(기기 저장), 설정, 로그아웃.
// 뷰어 글꼴은 팬픽 뷰어(TOKENS §6.1)가 생길 때 함께 넣는다. 레벨·배지·스크랩 목록은 2단계
export default async function MePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=%2Fme");
  if (!viewer.onboarded) redirect("/onboarding?next=%2Fme");

  const nextChange = nextNicknameChangeAt(viewer);

  return (
    <div className="mx-auto max-w-[640px]">
      <TopBar big title="마이" />

      <ProfileCard
        userId={viewer.id}
        nickname={viewer.nickname ?? ""}
        nextChangeLabel={nextChange ? nextChange.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : null}
      />

      <RecentGroups />

      <section aria-label="설정" className="mt-2 bg-card md:overflow-hidden md:rounded-2xl">
        <ThemeSetting />
        {viewer.isAdmin && (
          <Link href="/admin" className={`${row} transition-colors hover:bg-muted/50`}>
            <IconChip icon={Wrench} color="cobalt" size="sm" />
            관리자
            <ChevronRight className="ml-auto size-4 text-text-subtle" aria-hidden="true" />
          </Link>
        )}
        {LINKS.map(({ href, label, icon, color }) => (
          <Link key={href} href={href} className={`${row} transition-colors hover:bg-muted/50`}>
            <IconChip icon={icon} color={color} size="sm" />
            {label}
            <ChevronRight className="ml-auto size-4 text-text-subtle" aria-hidden="true" />
          </Link>
        ))}
        <form action="/auth/signout" method="POST">
          <button type="submit" className={`${row} w-full text-text-subtle transition-colors hover:bg-muted/50`}>
            <IconChip icon={LogOut} color="greige" size="sm" />
            로그아웃
          </button>
        </form>
      </section>

      <p className="flex items-center justify-center gap-1 py-3.5 text-[11.5px] text-text-disabled">
        <Tag className="size-3" aria-hidden="true" />
        비공식 팬 커뮤니티 · v{pkg.version.split(".").slice(0, 2).join(".")}
      </p>
    </div>
  );
}
