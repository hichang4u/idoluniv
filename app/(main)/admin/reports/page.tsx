import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReportCard, type QueueItem } from "@/components/admin/ReportCard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "신고 큐" };

const PAGE_SIZE = 20;
const STATUSES = [
  { value: "open", label: "미처리" },
  { value: "actioned", label: "숨김 처리" },
  { value: "dismissed", label: "기각" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

type Snapshot = QueueItem["snapshot"];

// 신고 시점 스냅샷(jsonb, 0011 submit_report). 모양이 다르면 빈 값으로 둔다
function parseSnapshot(raw: unknown): Snapshot {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : null);
  return {
    title: str("title"),
    content: str("content"),
    authorNickname: str("author_nickname"),
    createdAt: str("created_at"),
    groupSlug: str("group_slug"),
    postId: str("post_id"),
  };
}

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status: Status = STATUSES.some((s) => s.value === params.status) ? (params.status as Status) : "open";
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();
  // 한 개 더 받아 다음 쪽이 있는지 본다
  const { data, error } = await supabase.rpc("admin_report_queue", {
    p_status: status,
    p_limit: PAGE_SIZE + 1,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) console.error("[admin] report queue failed", { code: error.code, message: error.message });

  const rows = (data ?? []).slice(0, PAGE_SIZE);
  const hasNext = (data?.length ?? 0) > PAGE_SIZE;

  // 댓글 원문 링크에는 글의 그룹 slug 가 필요하다(관리자는 RLS 상 숨김 글도 읽는다)
  const snapshots = rows.map((r) => parseSnapshot(r.latest_snapshot));
  const postIds = [...new Set(snapshots.map((s) => s.postId).filter((id): id is string => !!id))];
  const slugByPost = new Map<string, string>();
  if (postIds.length > 0) {
    const { data: posts } = await supabase.from("posts").select("id, idol_group:idol_group_id(slug)").in("id", postIds);
    for (const p of posts ?? []) if (p.idol_group) slugByPost.set(p.id, p.idol_group.slug);
  }

  const items: QueueItem[] = rows.map((r, i) => {
    const snapshot = snapshots[i];
    const href =
      r.target_type === "post" && snapshot.groupSlug
        ? `/g/${snapshot.groupSlug}/posts/${r.target_id}`
        : r.target_type === "comment" && snapshot.postId && slugByPost.has(snapshot.postId)
          ? `/g/${slugByPost.get(snapshot.postId)}/posts/${snapshot.postId}`
          : null;
    return {
      targetType: r.target_type as QueueItem["targetType"],
      targetId: r.target_id,
      reportCount: r.report_count,
      reasons: r.reasons,
      details: r.details,
      urgent: r.urgent,
      firstAt: r.first_at,
      lastAt: r.last_at,
      // 대상이 지워졌으면 null 이 온다(생성 타입은 boolean 으로만 적힌다)
      isHidden: (r.is_hidden as boolean | null) ?? null,
      snapshot,
      href,
    };
  });

  const query = (next: Partial<{ status: Status; page: number }>) => {
    const sp = new URLSearchParams({ status: next.status ?? status });
    const p = next.page ?? 1;
    if (p > 1) sp.set("page", String(p));
    return `/admin/reports?${sp}`;
  };

  return (
    <div className="space-y-4">
      <nav aria-label="신고 상태" className="flex gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={query({ status: s.value })}
            aria-current={s.value === status ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-4 text-sm",
              s.value === status
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {status === "open" && (
        <p className="text-xs text-muted-foreground break-keep">
          긴급(개인정보·성적 콘텐츠)이 먼저, 그다음 오래된 순이에요. 목표 처리 시간: 긴급 12시간, 일반 48시간.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">신고 큐를 불러오지 못했어요.</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {status === "open" ? "처리할 신고가 없어요." : "기록이 없어요."}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={`${item.targetType}:${item.targetId}`}>
              <ReportCard item={item} status={status} />
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <div className="flex justify-between text-sm">
          {page > 1 ? <Link href={query({ page: page - 1 })} className="underline underline-offset-4">이전</Link> : <span />}
          {hasNext && <Link href={query({ page: page + 1 })} className="underline underline-offset-4">다음</Link>}
        </div>
      )}
    </div>
  );
}
