import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/viewer";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "홈",
};

// 홈은 목업이 아직 없다(PRD §9: 최근 방문 그룹 바로가기 + 최신 글). 그동안 워드마크 바와 소개만 둔다
export default async function HomePage() {
  const viewer = await getViewer();

  return (
    <>
      <TopBar
        big
        title="idoluniv"
        // 모바일은 전역 헤더가 없으므로 로그인 진입점을 이 바에 둔다
        actions={
          !viewer && (
            <Link
              href="/login"
              className="relative mr-2 inline-flex h-9 items-center rounded-xl bg-ink px-3 text-sm font-semibold text-on-ink after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] md:hidden"
            >
              로그인
            </Link>
          )
        }
      />
      <div className="mx-auto max-w-[640px] px-4 py-4 md:p-0">
        <section className="space-y-2 rounded-2xl bg-card p-6 text-center shadow-card dark:shadow-none">
          <h2 className="text-xl font-bold text-text-strong break-keep">그룹을 넘나드는 팬 커뮤니티</h2>
          <p className="text-sm text-text-subtle break-keep">
            공식 서비스가 아닌, 팬이 운영하는 커뮤니티예요. 그룹을 골라 게시판과 라운지에 들어가 보세요.
          </p>
          <Link href="/g" className="inline-block pt-2 text-sm font-semibold text-text-strong underline underline-offset-4">
            그룹 둘러보기
          </Link>
        </section>
      </div>
    </>
  );
}
