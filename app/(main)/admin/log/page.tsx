import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "처리 기록" };

const ACTION_LABEL: Record<string, string> = {
  hide: "숨김",
  unhide: "숨김 해제",
  auto_hide: "자동 숨김",
  dismiss: "기각",
};
const TYPE_LABEL: Record<string, string> = { post: "글", comment: "댓글", chat_message: "라운지" };

// 최근 처리 100건 (F8-3 감사 로그). moderation_actions 는 관리자만 읽는다(0011)
export default async function AdminLogPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moderation_actions")
    .select("id, action, target_type, target_id, note, created_at, actor:actor_id(nickname)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return <p role="alert" className="text-sm text-destructive">처리 기록을 불러오지 못했어요.</p>;
  if (!data?.length)
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        아직 처리 기록이 없어요.
      </p>
    );

  return (
    <ol className="divide-y divide-border rounded-xl border border-border bg-card">
      {data.map((a) => (
        <li key={a.id} className="space-y-1 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{ACTION_LABEL[a.action] ?? a.action}</span>
            <span className="text-muted-foreground">
              {TYPE_LABEL[a.target_type] ?? a.target_type} <code className="text-xs">{a.target_id.slice(0, 8)}</code>
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {a.actor?.nickname ?? (a.action === "auto_hide" ? "시스템" : "알 수 없음")}
            {a.note && <span className="break-words"> · {a.note}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}
