"use client";

import { useState } from "react";
import { Clock, Pencil } from "lucide-react";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { ChangeNicknameForm } from "@/components/me/ChangeNicknameForm";

interface ProfileCardProps {
  userId: string;
  nickname: string;
  /** 다음에 닉네임을 바꿀 수 있는 날. null 이면 지금 바꿀 수 있다 */
  nextChangeLabel: string | null;
}

// 마이 프로필 (목업 08): 아바타 60 + 닉네임 + 변경 가능일 + [변경]. 변경을 누르면 아래에 입력칸이 열린다
export function ProfileCard({ userId, nickname, nextChangeLabel }: ProfileCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <section aria-labelledby="profile-h" className="bg-card px-4 py-[18px] md:rounded-2xl">
      <div className="flex items-center gap-3.5">
        <UserAvatar seed={userId} name={nickname} className="size-[60px] text-2xl" />
        <div className="min-w-0 flex-1">
          <h2 id="profile-h" className="truncate text-[19px] font-bold tracking-[-0.02em] text-text-strong">
            {nickname}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-text-subtle">
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            {nextChangeLabel ? `${nextChangeLabel}부터 닉네임 변경 가능` : "지금 닉네임을 바꿀 수 있어요"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          disabled={!!nextChangeLabel}
          aria-expanded={editing}
          className="relative inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-line-strong px-3 text-[13px] font-semibold text-text-strong transition-colors after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] hover:bg-muted disabled:border-border disabled:text-text-disabled"
        >
          <Pencil className="size-4" aria-hidden="true" />
          변경
        </button>
      </div>
      {editing && !nextChangeLabel && (
        <div className="mt-4">
          <ChangeNicknameForm current={nickname} />
        </div>
      )}
    </section>
  );
}
