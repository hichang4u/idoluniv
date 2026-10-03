import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
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
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <OnboardingForm next={next} />
    </main>
  );
}
