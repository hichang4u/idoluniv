"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Tag, User } from "lucide-react";
import { completeOnboarding } from "@/app/actions/auth";
import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";

// 목업 06: 명찰 + 제목 · 닉네임 입력 · 동의 두 개 · 바닥의 시작하기. 조건을 다 채우기 전엔 비활성
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
    <form action={formAction} className="flex min-h-[calc(100dvh-50px)] flex-col" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="grid flex-1 content-start gap-[18px] px-5 pt-2">
        <div className="grid gap-2.5">
          <span
            data-group-color="lemon"
            aria-hidden="true"
            className="inline-grid -rotate-[4deg] grid-cols-[auto_auto] items-center justify-self-start gap-x-1.5 rounded-[10px] bg-group-solid px-3 pt-1.5 pb-[7px] text-group-on-solid"
          >
            <Tag className="row-span-2 size-5" />
            <b className="text-sm tracking-[0.08em]">HELLO</b>
            <i className="col-start-2 -mt-0.5 text-[10.5px] not-italic">my name is</i>
          </span>
          <h1 className="text-[22px] leading-[1.35] font-bold tracking-[-0.02em] text-text-strong break-keep">
            닉네임을 정해 주세요
          </h1>
          <p className="text-[14.5px] leading-[1.7] text-text-subtle break-keep">
            게시판과 라운지에서 이 이름으로 활동해요. 정한 뒤 30일 동안은 바꿀 수 없어요.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="nickname" className="text-[13px] font-semibold text-text-strong">
            닉네임
          </label>
          <div
            className={cn(
              "flex h-[52px] items-center gap-2 rounded-xl border-[1.5px] bg-card px-3.5 focus-within:ring-3",
              nicknameError ? "border-destructive focus-within:ring-destructive/20" : "border-line-strong focus-within:border-ring focus-within:ring-ring/30"
            )}
          >
            <User className="size-[18px] shrink-0 text-text-subtle" aria-hidden="true" />
            <input
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
              className="h-full min-w-0 flex-1 bg-transparent text-base text-text-strong outline-none"
            />
            <span className="shrink-0 text-[12.5px] text-text-subtle tabular-nums" aria-hidden="true">
              {nickname.length}/{LIMITS.nickname.max}
            </span>
          </div>
          {nicknameError && (
            <p id="nickname-error" role="alert" className="flex items-center gap-1.5 text-[13px] text-destructive">
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              {nicknameError}
            </p>
          )}
          <p id="nickname-help" className="text-[12.5px] text-text-subtle">
            {LIMITS.nickname.min}~{LIMITS.nickname.max}자, 한글·영문·숫자·밑줄(_)
          </p>
        </div>

        <div className="grid gap-1 border-t border-border pt-2.5">
          <CheckRow name="ageOver14" checked={ageOver14} onChange={setAgeOver14}>
            만 14세 이상이에요
          </CheckRow>
          <CheckRow
            name="agreeTerms"
            checked={agreeTerms}
            onChange={setAgreeTerms}
            // 이용약관 화면에서 개인정보처리방침으로도 이어진다
            trailing={
              <Link href="/terms" target="_blank" className="ml-auto shrink-0 text-[13px] text-text-subtle underline underline-offset-[3px]">
                보기
              </Link>
            }
          >
            이용약관 · 개인정보처리방침 동의
          </CheckRow>
        </div>

        {formError && (
          <p role="alert" className="flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {formError}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 bg-card px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-ink text-sm font-semibold text-on-ink transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-surface-3 disabled:text-text-disabled"
        >
          {pending ? "확인 중..." : "시작하기"}
        </button>
      </div>
    </form>
  );
}

// 직접 그린 체크박스(22px, 켜지면 잉크). 실제 입력은 숨긴 checkbox 라 키보드·스크린 리더가 그대로 쓴다
function CheckRow({
  name,
  checked,
  onChange,
  trailing,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-[15px] text-text-strong">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="inline-grid size-[22px] shrink-0 place-items-center rounded-md border-[1.5px] border-line-strong text-transparent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-on-ink peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
        >
          <Check className="size-4" strokeWidth={2.4} />
        </span>
        <span className="break-keep">{children}</span>
      </label>
      {trailing}
    </div>
  );
}
