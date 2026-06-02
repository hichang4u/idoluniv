"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Provider = "google" | "kakao" | "twitter";

const providers: { id: Provider; label: string; icon: string }[] = [
  { id: "google", label: "Google로 계속하기", icon: "G" },
  { id: "kakao", label: "카카오로 계속하기", icon: "K" },
  { id: "twitter", label: "X(Twitter)로 계속하기", icon: "𝕏" },
];

export function LoginForm() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const supabase = createClient();

  async function handleLogin(provider: Provider) {
    setLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(null);
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* 로고 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          IdolUniv
        </h1>
        <p className="text-sm text-muted-foreground">
          아이돌 팬덤 올인원 커뮤니티
        </p>
      </div>

      {/* 소셜 로그인 버튼 */}
      <div className="space-y-3">
        {providers.map(({ id, label, icon }) => (
          <Button
            key={id}
            variant="outline"
            className="w-full h-12 text-sm font-medium"
            disabled={loading !== null}
            onClick={() => handleLogin(id)}
          >
            <span className="mr-2 text-base font-bold">{icon}</span>
            {loading === id ? "연결 중..." : label}
          </Button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        로그인 시{" "}
        <span className="underline cursor-pointer">이용약관</span>
        {" "}및{" "}
        <span className="underline cursor-pointer">개인정보처리방침</span>
        에 동의합니다.
      </p>
    </div>
  );
}
