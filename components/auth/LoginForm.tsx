"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, Feather, List, MessagesSquare, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { IconChip } from "@/components/common/IconChip";
import { GROUP_COLORS } from "@/lib/group-colors";
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

  // 목업 05: 위는 응원봉 줄 · 워드마크 · 기능 세 가지 · 비공식 표기, 아래는 로그인 버튼
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-sm grid-rows-[1fr_auto] px-6 pt-8 pb-[calc(28px+env(safe-area-inset-bottom))]">
      <div className="grid content-center gap-[18px]">
        <CheerSticks />
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.04em] text-text-strong">
          idoluniv
          <span className="mt-2 block text-[19px] leading-[1.4] font-medium tracking-[-0.02em] text-text-subtle">
            그룹을 넘나드는 팬 커뮤니티
          </span>
        </h1>
        <ul className="grid gap-2">
          {FEATURES.map(({ icon, color, label }) => (
            <li key={label} className="flex items-center gap-2.5 text-[14.5px] text-text-strong">
              <IconChip icon={icon} color={color} />
              {label}
            </li>
          ))}
        </ul>
        <p className="inline-flex items-center gap-[5px] text-[12.5px] text-text-subtle">
          <Tag className="size-3.5 shrink-0" aria-hidden="true" />
          공식 서비스가 아닌, 팬이 운영하는 커뮤니티예요
        </p>
      </div>

      <div className="grid gap-2.5 pt-8">
        {message && (
          <p role="alert" className="flex items-center gap-1.5 rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {message}
          </p>
        )}
        {providers.map((id) => (
          <button
            key={id}
            type="button"
            disabled={loading !== null}
            onClick={() => handleLogin(id)}
            className="inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[14px] border border-line-strong bg-card text-[15px] font-semibold text-text-strong transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <span
              className="inline-grid size-[22px] place-items-center rounded-md border border-current text-[13px] font-bold"
              aria-hidden="true"
            >
              {PROVIDERS[id].icon}
            </span>
            {loading === id ? "연결 중..." : PROVIDERS[id].label}
          </button>
        ))}
        <p className="text-center text-[12.5px] leading-[1.6] text-text-subtle">
          <Link href="/g" className="underline underline-offset-[3px]">
            둘러보기
          </Link>
          는 로그인 없이 할 수 있어요
        </p>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: List, color: "baby", label: "그룹별 게시판에서 정보 나누기" },
  { icon: MessagesSquare, color: "mint", label: "라운지에서 실시간으로 수다" },
  { icon: Feather, color: "peach", label: "팬픽 쓰고 읽기" },
] as const;

// 그룹 색 24개로 만든 응원봉 줄 (목업 05). 머리는 파스텔, 막대는 잉크. 동작 줄이기 설정이면 멈춘다
function CheerSticks() {
  return (
    <div className="grid w-full max-w-[280px] grid-cols-12 gap-x-1.5 gap-y-1" aria-hidden="true">
      {GROUP_COLORS.map(({ key }, i) => (
        <svg
          key={key}
          data-group-color={key}
          viewBox="0 0 24 40"
          className="block h-auto w-full origin-[50%_95%] motion-safe:animate-[iu-sway_2.8s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * -0.23}s` }}
        >
          <circle cx="12" cy="11" r="9" className="fill-group-solid" />
          <circle cx="9" cy="8" r="2.4" fill="#fff" opacity={0.55} />
          <rect x="10" y="20" width="4" height="17" rx="2" className="fill-text-strong" opacity={0.8} />
        </svg>
      ))}
    </div>
  );
}
