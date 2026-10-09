"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { submitReport } from "@/app/actions/report";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from "@/lib/report-reasons";

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: "글",
  comment: "댓글",
  chat_message: "메시지",
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

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DrawerContent>
        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col">
          <DrawerHeader>
            <DrawerTitle>{TARGET_LABEL[targetType]} 신고</DrawerTitle>
            <DrawerDescription>
              신고는 운영자만 봐요. 서로 다른 세 명이 신고하면 검토 전까지 자동으로 가려져요.
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <fieldset className="space-y-1">
              <legend className="sr-only">신고 사유</legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.code}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted",
                    reason === r.code && "bg-muted"
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.code}
                    checked={reason === r.code}
                    onChange={() => setReason(r.code)}
                    className="mt-1 size-4 shrink-0 accent-foreground"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="block text-xs text-muted-foreground break-keep">{r.example}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="report-detail" className="text-sm font-medium">
                  설명 <span className="font-normal text-muted-foreground">(선택)</span>
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {detail.length}/{LIMITS.reportDetail}
                </span>
              </div>
              <Textarea
                id="report-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={LIMITS.reportDetail}
                rows={3}
                placeholder="운영자가 판단하는 데 도움이 되는 내용을 적어 주세요"
                className="resize-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DrawerFooter className="flex-row justify-end pt-2">
            <Button type="button" variant="outline" onClick={close}>
              취소
            </Button>
            <Button type="submit" variant="destructive" disabled={!reason || pending}>
              {pending ? "보내는 중..." : "신고하기"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
