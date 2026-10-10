"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { submitReport } from "@/app/actions/report";
import {
  Ban,
  CircleAlert,
  CircleEllipsis,
  CircleHelp,
  Clock,
  Copyright,
  Drama,
  LockKeyhole,
  Megaphone,
  MessageSquareX,
  type LucideIcon,
} from "lucide-react";
import { IconChip } from "@/components/common/IconChip";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { GroupColorKey } from "@/lib/group-colors";
import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from "@/lib/report-reasons";

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: "글",
  comment: "댓글",
  chat_message: "메시지",
};

// 사유마다 고정한 파스텔 아이콘 칩 (목업 07, TOKENS §6.0)
const REASON_CHIP: Record<ReportReason, { icon: LucideIcon; color: GroupColorKey }> = {
  spam: { icon: Megaphone, color: "apricot" },
  abuse: { icon: MessageSquareX, color: "coral" },
  privacy: { icon: LockKeyhole, color: "baby" },
  sexual: { icon: Ban, color: "rose" },
  rumor: { icon: CircleHelp, color: "butter" },
  copyright: { icon: Copyright, color: "sky" },
  impersonation: { icon: Drama, color: "lavender" },
  other: { icon: CircleEllipsis, color: "greige" },
};

interface ReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** 신고가 접수됐거나 이미 신고한 대상일 때 */
  onReported: () => void;
}

/** 신고 시트 (F7-2): 사유 8종 + 선택 설명 300자 */
export function ReportSheet({ open, onOpenChange, targetType, targetId, onReported }: ReportSheetProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const close = () => {
    onOpenChange(false);
    setReason(null);
    setDetail("");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitReport(targetType, targetId, reason, detail);
      if (result.ok || result.code === "ALREADY_REPORTED") {
        onReported();
        close();
        return;
      }
      const next = encodeURIComponent(pathname);
      if (result.code === "AUTH_REQUIRED") router.push(`/login?next=${next}`);
      else if (result.code === "ONBOARDING_REQUIRED") router.push(`/onboarding?next=${next}`);
      else setError(result.message);
    });
  };

  // 목업 07: 머리(칩 + 제목) · 사유 목록(칩 · 이름 · 우선 처리 · 오른쪽 라디오) · 설명 · 잉크 접수 버튼
  return (
    <Drawer open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DrawerContent>
        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col">
          <span aria-hidden="true" className="mx-auto mt-2 mb-1 block h-1 w-9 shrink-0 rounded-full bg-line-strong" />
          <div className="flex items-center gap-3 px-4 pt-1 pb-1">
            <IconChip icon={CircleAlert} color="rose" />
            <div className="min-w-0">
              <DrawerTitle className="text-[19px] font-bold tracking-[-0.02em] text-text-strong">
                신고하기<span className="sr-only"> — {TARGET_LABEL[targetType]}</span>
              </DrawerTitle>
              <DrawerDescription className="text-[13.5px] text-text-subtle">어떤 문제인지 하나를 골라 주세요</DrawerDescription>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-2">
            <fieldset>
              <legend className="sr-only">신고 사유</legend>
              {REPORT_REASONS.map((r, i) => {
                const chip = REASON_CHIP[r.code];
                const on = reason === r.code;
                return (
                  <label
                    key={r.code}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2.5 py-1.5 text-[14.5px] text-text-strong",
                      i > 0 && "border-t border-border"
                    )}
                  >
                    <IconChip icon={chip.icon} color={chip.color} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block">{r.label}</span>
                      {/* 예시는 고른 사유에만 보여 준다 (목업 07) */}
                      {on && <span className="block text-xs leading-[1.4] text-text-subtle break-keep">{r.example}</span>}
                    </span>
                    {"urgent" in r && r.urgent && (
                      <span className="inline-flex shrink-0 items-center gap-[3px] text-[11px] font-semibold whitespace-nowrap text-destructive">
                        <Clock className="size-3" aria-hidden="true" />
                        우선 처리
                      </span>
                    )}
                    <input
                      type="radio"
                      name="reason"
                      value={r.code}
                      checked={on}
                      onChange={() => setReason(r.code)}
                      className="peer sr-only"
                    />
                    {/* 오른쪽 라디오: 켜지면 잉크 두꺼운 테두리 */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "ml-1 size-5 shrink-0 rounded-full border-[1.5px] border-line-strong peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                        on && "border-[6px] border-ink"
                      )}
                    />
                  </label>
                );
              })}
            </fieldset>

            <div className="mt-2 grid gap-1">
              <label htmlFor="report-detail" className="sr-only">
                설명 (선택)
              </label>
              <textarea
                id="report-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={LIMITS.reportDetail}
                rows={2}
                placeholder={`설명 (선택, ${LIMITS.reportDetail}자까지)`}
                className="min-h-[60px] w-full resize-none rounded-xl border border-line-strong bg-card px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-text-subtle focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
              {detail.length > 0 && (
                <span className="justify-self-end text-xs text-text-subtle tabular-nums">
                  {detail.length}/{LIMITS.reportDetail}
                </span>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] text-destructive">
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
          </div>

          <div className="grid gap-2 px-4 pt-2 pb-[calc(18px+env(safe-area-inset-bottom))]">
            {/* 접수 버튼은 그룹 색이 아닌 잉크 (목업 07) */}
            <button
              type="submit"
              disabled={!reason || pending}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-ink text-sm font-semibold text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-surface-3 disabled:text-text-disabled"
            >
              {pending ? "보내는 중..." : "신고 접수"}
            </button>
            <p className="text-center text-xs leading-[1.6] text-text-subtle break-keep">
              신고는 운영자만 봐요. 서로 다른 세 명이 신고하면 검토 전까지 자동으로 가려져요.
            </p>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
