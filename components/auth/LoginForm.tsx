"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";

// 노출할 공급자는 NEXT_PUBLIC_AUTH_PROVIDERS(쉼표 구분)로 정한다. 베타는 google 하나(D-2).
// X 를 추가할 때는 OAuth 2.0 공급자 "x" 를 쓴다(1.0a "twitter" 는 폐기 예정).
type Provider = "google" | "kakao" | "x";

const PROVIDERS: Record<Provider, { label: string; icon: string }> = {
  google: { label: "Google로 계속하기", icon: "G" },
  kakao: { label: "카카오로 계속하기", icon: "K" },
  x: { label: "X로 계속하기", icon: "𝕏" },
};

function enabledProviders(): Provider[] {
  const raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "google";
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is Provider => p in PROVIDERS);
}

export function LoginForm({ next, error }: { next: string; error: string | null }) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [message, setMessage] = useState<string | null>(error);
  const providers = enabledProviders();

  async function handleLogin(provider: Provider) {
    setLoading(provider);
    setMessage(null);
    const supabase = createClient();
    // 빈 문자열이면 상대 주소가 되어 OAuth 복귀가 깨지므로 SITE_URL(빈 값은 null)을 쓴다
    const origin = SITE_URL ?? window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // 성공하면 공급자 페이지로 이동하므로 여기에는 실패할 때만 도달한다
    if (oauthError) {
      setMessage("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">idoluniv</h1>
        <p className="text-sm text-muted-foreground">그룹을 넘나드는 팬 커뮤니티</p>
      </div>

      {message && (
        <p role="alert" className="rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
          {message}
        </p>
      )}

      <div className="space-y-3">
        {providers.map((id) => (
          <Button
            key={id}
            variant="outline"
            className="w-full h-12 text-sm font-medium"
            disabled={loading !== null}
            onClick={() => handleLogin(id)}
          >
            <span className="mr-2 text-base font-bold" aria-hidden="true">
              {PROVIDERS[id].icon}
            </span>
            {loading === id ? "연결 중..." : PROVIDERS[id].label}
          </Button>
        ))}
      </div>

      <p className="text-center text-xs leading-5 text-muted-foreground break-keep">
        둘러보기는 로그인 없이 할 수 있어요. 처음이면 로그인 후 닉네임을 정하고{" "}
        <Link href="/terms" className="underline underline-offset-4">이용약관</Link>
        {" "}및{" "}
        <Link href="/privacy" className="underline underline-offset-4">개인정보처리방침</Link>
        에 동의하면 시작할 수 있어요.
      </p>
    </div>
  );
}
