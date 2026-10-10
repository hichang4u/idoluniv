import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CommentItem, CommentPlaceholder } from "@/components/board/CommentItem";
import { getMyReportedIds } from "@/lib/reports";
import type { CommentWithAuthor } from "@/types/database";

/** 댓글을 쓸 수 있는 상태. locked 는 숨김 글(작성자·관리자만 보는 화면) */
export type CommentAccess = "member" | "guest" | "onboarding" | "locked";

interface CommentSectionProps {
  postId: string;
  /** posts.comment_count — 트리거가 보이는 댓글만 센다 (F4-4) */
  commentCount: number;
  viewerId: string | null;
  /** 글쓴이. 그의 댓글에 "작성자" 를 붙인다 */
  postAuthorId: string | null;
  access: CommentAccess;
}

type Thread =
  | { key: string; state: "visible"; comment: CommentWithAuthor; replies: CommentWithAuthor[]; at: string }
  | { key: string; state: "deleted" | "hidden"; replies: CommentWithAuthor[]; at: string };

const isVisible = (c: CommentWithAuthor) => !c.is_hidden && !c.deleted_at;

// 최상위 + 대댓글(1단계) 트리. 부모가 삭제(tombstone)·숨김이거나 RLS 로 아예 오지 않았는데
// 보이는 대댓글이 있으면 부모 자리에 자리표시를 남긴다(TECH-DESIGN §7.4).
function buildThreads(rows: CommentWithAuthor[]): Thread[] {
  const byId = new Map(rows.map((c) => [c.id, c]));
  const repliesByParent = new Map<string, CommentWithAuthor[]>();
  for (const c of rows) {
    if (!c.parent_id || !isVisible(c)) continue;
    const list = repliesByParent.get(c.parent_id) ?? [];
    list.push(c);
    repliesByParent.set(c.parent_id, list);
  }

  const threads: Thread[] = [];
  for (const c of rows) {
    if (c.parent_id) continue;
    const replies = repliesByParent.get(c.id) ?? [];
    if (isVisible(c)) threads.push({ key: c.id, state: "visible", comment: c, replies, at: c.created_at });
    else if (replies.length > 0)
      threads.push({ key: c.id, state: c.deleted_at ? "deleted" : "hidden", replies, at: c.created_at });
  }
  for (const [parentId, replies] of repliesByParent) {
    if (!byId.has(parentId)) threads.push({ key: parentId, state: "hidden", replies, at: replies[0].created_at });
  }
  return threads.sort((a, b) => a.at.localeCompare(b.at));
}

// 댓글 목록 (목업 02). 입력창은 화면 바닥의 CommentComposer 하나이고 "답글" 이 그것을 답글 모드로 바꾼다
export async function CommentSection({ postId, commentCount, viewerId, postAuthorId, access }: CommentSectionProps) {
  const supabase = await createClient();

  // 숨김 필터를 걸지 않는다: 숨김 부모 자리표시를 만들려면 필요하고, 남의 숨김 댓글은 RLS 가 애초에 주지 않는다
  const { data } = await supabase
    .from("comments")
    .select(
      `id, post_id, parent_id, author_id, content, like_count, is_hidden, deleted_at, created_at, updated_at,
       author:author_id(id, nickname, avatar_url)`
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const rows: CommentWithAuthor[] = data ?? [];
  const threads = buildThreads(rows);
  const canReply = access === "member";
  // 숨김 글(locked)의 댓글은 작성자·관리자만 보는 화면이라 신고 진입점을 두지 않는다
  const reportAccess = access === "locked" ? null : access;
  const reportedIds = reportAccess
    ? await getMyReportedIds(viewerId, [{ type: "comment", ids: rows.filter(isVisible).map((c) => c.id) }])
    : new Set<string>();

  const isPostAuthor = (c: CommentWithAuthor) => !!postAuthorId && c.author_id === postAuthorId;

  return (
    <section
      id="comments"
      aria-labelledby="comments-h"
      className="mt-2 grid scroll-mt-14 gap-3.5 bg-card px-4 pt-3 pb-5 md:rounded-2xl md:px-5"
    >
      <h2 id="comments-h" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-strong">
        <MessagesSquare className="size-4" aria-hidden="true" />
        댓글 <span className="tabular-nums">{commentCount.toLocaleString()}</span>
      </h2>

      {access === "locked" && <p className="text-[13px] text-text-subtle">숨김 처리된 글에는 댓글을 달 수 없어요.</p>}
      {threads.length === 0 && access !== "locked" && (
        <p className="py-4 text-center text-[13px] text-text-subtle">첫 댓글을 남겨 보세요.</p>
      )}

      {threads.map((t) => (
        <div key={t.key} className="grid gap-3.5">
          {t.state === "visible" ? (
            <CommentItem
              comment={t.comment}
              isMine={!!viewerId && t.comment.author_id === viewerId}
              isPostAuthor={isPostAuthor(t.comment)}
              replyParentId={canReply ? t.comment.id : null}
              reportAccess={reportAccess}
              reported={reportedIds.has(t.comment.id)}
            />
          ) : (
            <CommentPlaceholder reason={t.state} />
          )}
          {t.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              isReply
              isMine={!!viewerId && r.author_id === viewerId}
              isPostAuthor={isPostAuthor(r)}
              reportAccess={reportAccess}
              reported={reportedIds.has(r.id)}
              // 삭제·숨김 부모에는 새 답글을 달 수 없다 (INVALID_PARENT)
              replyParentId={canReply && t.state === "visible" ? t.key : null}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
