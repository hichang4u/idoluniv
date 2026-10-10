import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { TopBar } from "@/components/layout/TopBar";
import { getViewer } from "@/lib/viewer";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "닉네임 정하기",
  robots: { index: false },
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}`)}`);
  if (viewer.onboarded) redirect(next);

  return (
    // 목업 06: 화면 전체가 흰 면(surface-1). 뒤로는 홈으로 — 닉네임 없이도 둘러보기는 된다
    <main className="mx-auto min-h-dvh max-w-md bg-card">
      <TopBar back="/" backLabel="홈으로" titleAs="p" className="md:static md:h-[50px] md:bg-card md:px-4" />
      <OnboardingForm next={next} />
    </main>
  );
}
