"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { moderateTarget } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { REPORT_REASONS, type ReportTargetType } from "@/lib/report-reasons";

export type QueueItem = {
  targetType: ReportTargetType;
  targetId: string;
  reportCount: number;
  reasons: string[];
  details: string[];
  urgent: boolean;
  firstAt: string;
  lastAt: string;
  /** null 이면 원문이 지워졌다 */
  isHidden: boolean | null;
  snapshot: {
    title: string | null;
    content: string | null;
    authorNickname: string | null;
    createdAt: string | null;
    groupSlug: string | null;
    postId: string | null;
  };
  /** 원문 링크. 채팅은 원문 페이지가 없어 null */
  href: string | null;
};

const TYPE_LABEL: Record<ReportTargetType, string> = { post: "글", comment: "댓글", chat_message: "라운지" };
const REASON_LABEL = new Map<string, string>(REPORT_REASONS.map((r) => [r.code, r.label]));
const DONE_LABEL = { hide: "숨겼어요.", unhide: "숨김을 해제했어요.", dismiss: "기각했어요." } as const;

export function ReportCard({ item, status }: { item: QueueItem; status: "open" | "actioned" | "dismissed" }) {
  const [state, formAction, pending] = useActionState(moderateTarget, null);
  const [note, setNote] = useState("");
  const isOpen = status === "open";
  const { snapshot } = item;

  return (
    <article className="space-y-3 rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary">{TYPE_LABEL[item.targetType]}</Badge>
        {item.urgent && <Badge variant="destructive">긴급</Badge>}
        <span className="font-medium">신고 {item.reportCount}건</span>
        <span className="text-muted-foreground">
          {item.reasons.map((r) => REASON_LABEL.get(r) ?? r).join(" · ")}
        </span>
        <span className="ml-auto text-muted-foreground">
          {item.isHidden === null ? "원문 삭제됨" : item.isHidden ? "숨김 중" : "공개 중"}
        </span>
      </header>

      {/* 신고 시점 스냅샷 — 원문이 바뀌거나 지워져도 이것으로 판단한다 */}
      <div className="space-y-1 rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          {snapshot.authorNickname ?? "알 수 없음"}
          {snapshot.createdAt && ` · ${formatDateTime(snapshot.createdAt)}`}
        </p>
        {snapshot.title && <p className="text-sm font-semibold break-words">{snapshot.title}</p>}
        <p className="line-clamp-6 text-sm whitespace-pre-wrap break-words">
          {snapshot.content || <span className="text-muted-foreground">(내용 없음)</span>}
        </p>
      </div>

      {item.details.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {item.details.map((d, i) => (
            <li key={i} className="break-words">“{d}”</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          첫 신고 {formatDateTime(item.firstAt)}
          {item.reportCount > 1 && ` · 마지막 ${formatDateTime(item.lastAt)}`}
        </span>
        {item.href && item.isHidden !== null && (
          <Link href={item.href} target="_blank" className="inline-flex items-center gap-1 underline underline-offset-4">
            원문 보기 <ExternalLink className="size-3" />
          </Link>
        )}
      </div>

      <form action={formAction} className="space-y-2 border-t border-border pt-3">
        <input type="hidden" name="targetType" value={item.targetType} />
        <input type="hidden" name="targetId" value={item.targetId} />
        <Textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="처리 메모 (선택, 처리 기록에 남아요)"
          aria-label="처리 메모"
          className="resize-none"
        />
        <div className="flex flex-wrap justify-end gap-2">
          {isOpen && (
            <Button type="submit" name="intent" value="dismiss" variant="outline" size="sm" disabled={pending}>
              기각
            </Button>
          )}
          {item.isHidden === true && (
            <Button type="submit" name="intent" value="unhide" variant="outline" size="sm" disabled={pending}>
              숨김 해제
            </Button>
          )}
          {item.isHidden !== null && (isOpen || !item.isHidden) && (
            <Button type="submit" name="intent" value="hide" variant="destructive" size="sm" disabled={pending}>
              {item.isHidden ? "숨김 확정" : "숨김"}
            </Button>
          )}
        </div>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
            {state.ok ? DONE_LABEL[state.data.intent] : state.message}
          </p>
        )}
      </form>
    </article>
  );
}
