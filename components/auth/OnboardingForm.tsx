"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { completeOnboarding } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIMITS } from "@/lib/limits";

export function OnboardingForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(completeOnboarding, null);
  const [nickname, setNickname] = useState("");
  const [ageOver14, setAgeOver14] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const error = state && !state.ok ? state : null;
  const nicknameError = error?.fields?.nickname ? error.message : null;
  const formError = error && !nicknameError ? error.message : null;
  const canSubmit = nickname.trim().length > 0 && ageOver14 && agreeTerms && !pending;

  return (
    <form action={formAction} className="w-full max-w-sm space-y-6" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight break-keep">닉네임을 정해 주세요</h1>
        <p className="text-sm leading-6 text-muted-foreground break-keep">
          게시판과 라운지에서 이 이름으로 활동해요. 정한 뒤 30일 동안은 바꿀 수 없어요.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="nickname" className="text-sm font-medium">
          닉네임
        </label>
        <Input
          id="nickname"
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={LIMITS.nickname.max}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={nicknameError ? true : undefined}
          aria-describedby="nickname-help nickname-error"
          className="h-12 text-base"
        />
        {nicknameError && (
          <p id="nickname-error" role="alert" className="text-sm text-destructive">
            {nicknameError}
          </p>
        )}
        <p id="nickname-help" className="text-xs text-muted-foreground">
          {LIMITS.nickname.min}~{LIMITS.nickname.max}자, 한글·영문·숫자·밑줄(_)
        </p>
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="ageOver14"
            checked={ageOver14}
            onChange={(e) => setAgeOver14(e.target.checked)}
            className="size-5 accent-foreground"
          />
          만 14세 이상이에요
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="size-5 accent-foreground"
          />
          <span className="break-keep">
            <Link href="/terms" target="_blank" className="underline underline-offset-4">
              이용약관
            </Link>
            {" "}·{" "}
            <Link href="/privacy" target="_blank" className="underline underline-offset-4">
              개인정보처리방침
            </Link>
            에 동의해요
          </span>
        </label>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" className="h-12 w-full text-base" disabled={!canSubmit}>
        {pending ? "확인 중..." : "시작하기"}
      </Button>
    </form>
  );
}
