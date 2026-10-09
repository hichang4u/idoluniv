"use client";

import { createContext, useContext, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { ReportSheet } from "@/components/report/ReportSheet";
import { cn } from "@/lib/utils";
import type { ReportTargetType } from "@/lib/report-reasons";

/** 신고할 수 있는 상태. guest·onboarding 은 누르면 로그인·닉네임 화면으로 보낸다 (TECH-DESIGN §7.7) */
export type ReportAccess = "member" | "guest" | "onboarding";

type ReportableState = {
  reported: boolean;
  revealed: boolean;
  reveal: () => void;
  openReport: () => void;
};

const ReportableContext = createContext<ReportableState | null>(null);

export function useReportable() {
  const ctx = useContext(ReportableContext);
  if (!ctx) throw new Error("Reportable 안에서만 쓸 수 있어요.");
  return ctx;
}

interface ReportableProps {
  targetType: ReportTargetType;
  targetId: string;
  /** 서버가 조회한 "내가 이미 신고한 대상" 여부 (AD-10) */
  initialReported: boolean;
  access: ReportAccess;
  children: React.ReactNode;
}

/**
 * 신고 대상 하나의 상태(신고 여부·가림 해제)를 아래 트리거와 가림 요소가 공유한다.
 * 신고 후에는 새로 그리지 않고 이 상태만 바꾼다(F7-4).
 */
export function Reportable({ targetType, targetId, initialReported, access, children }: ReportableProps) {
  const [reported, setReported] = useState(initialReported);
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  // 목록의 모든 항목이 시트를 미리 만들지 않도록 처음 열 때 붙인다
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const openReport = () => {
    const next = encodeURIComponent(pathname);
    if (access === "guest") router.push(`/login?next=${next}`);
    else if (access === "onboarding") router.push(`/onboarding?next=${next}`);
    else {
      setMounted(true);
      setOpen(true);
    }
  };

  return (
    <ReportableContext.Provider value={{ reported, revealed, reveal: () => setRevealed(true), openReport }}>
      {children}
      {mounted && (
        <ReportSheet
          open={open}
          onOpenChange={setOpen}
          targetType={targetType}
          targetId={targetId}
          onReported={() => {
            setReported(true);
            setRevealed(false);
          }}
        />
      )}
    </ReportableContext.Provider>
  );
}

/** 내가 신고한 콘텐츠를 자리표시로 바꾼다. "보기" 를 누르면 원래 내용을 보여 준다 */
export function ReportedMask({
  children,
  label = "신고한 콘텐츠입니다",
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const { reported, revealed, reveal } = useReportable();
  if (!reported || revealed) return <>{children}</>;
  return (
    <p className={cn("rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground", className)}>
      {label} ·{" "}
      <button type="button" onClick={reveal} className="font-medium text-foreground underline underline-offset-4">
        보기
      </button>
    </p>
  );
}

/** 가림 상태일 때만 대체 문구를 보여 주고 "보기" 버튼은 두지 않는다(제목처럼 짧은 자리용) */
export function ReportedText({ children, label }: { children: React.ReactNode; label: string }) {
  const { reported, revealed } = useReportable();
  return <>{reported && !revealed ? label : children}</>;
}

/** 댓글·메시지에 붙는 작은 신고 버튼. 이미 신고했으면 숨긴다 */
export function ReportButton({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const { reported, openReport } = useReportable();
  if (reported) return null;
  return (
    <button
      type="button"
      onClick={openReport}
      aria-label="신고"
      className={cn(
        // 보이는 크기는 작게, 누르는 영역은 44px (세로 음수 여백으로 줄 높이 유지)
        "-my-2.5 flex min-h-11 min-w-11 items-center justify-center gap-1 px-1 text-xs text-muted-foreground transition-colors hover:text-destructive",
        className
      )}
    >
      <Flag className="size-3" />
      {!iconOnly && "신고"}
    </button>
  );
}
