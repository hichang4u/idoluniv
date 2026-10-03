import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getViewer } from "@/lib/viewer";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  auth_callback_failed: "로그인에 실패했어요. 다시 시도해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const errorKey = typeof params.error === "string" ? params.error : null;

  const viewer = await getViewer();
  if (viewer) redirect(viewer.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <LoginForm next={next} error={errorKey ? (ERRORS[errorKey] ?? ERRORS.auth_callback_failed) : null} />
    </main>
  );
}
