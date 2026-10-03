"use client";

import { useActionState, useState } from "react";
import { changeNickname } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIMITS } from "@/lib/limits";

export function ChangeNicknameForm({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState(changeNickname, null);
  const [nickname, setNickname] = useState(current);
  const error = state && !state.ok ? state.message : null;
  const unchanged = nickname.normalize("NFC").trim() === current;

  return (
    <form action={formAction} className="space-y-2" noValidate>
      <label htmlFor="nickname" className="text-sm font-medium">
        새 닉네임
      </label>
      <div className="flex gap-2">
        <Input
          id="nickname"
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={LIMITS.nickname.max}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby="nickname-msg"
          className="h-11 text-base"
        />
        <Button type="submit" className="h-11 shrink-0" disabled={pending || unchanged}>
          {pending ? "바꾸는 중..." : "바꾸기"}
        </Button>
      </div>
      <p id="nickname-msg" role={error ? "alert" : undefined} className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
        {error ?? `바꾸면 30일 동안 다시 바꿀 수 없어요. ${LIMITS.nickname.min}~${LIMITS.nickname.max}자, 한글·영문·숫자·밑줄(_)`}
      </p>
    </form>
  );
}
