import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CommentItem, CommentPlaceholder } from "@/components/board/CommentItem";
import { CommentForm } from "@/components/board/CommentForm";
import type { CommentWithAuthor } from "@/types/database";

/** 댓글을 쓸 수 있는 상태. locked 는 숨김 글(작성자·관리자만 보는 화면) */
export type CommentAccess = "member" | "guest" | "onboarding" | "locked";

interface CommentSectionProps {
  postId: string;
  /** posts.comment_count — 트리거가 보이는 댓글만 센다 (F4-4) */
  commentCount: number;
  viewerId: string | null;
  access: CommentAccess;
  /** 로그인·온보딩 뒤 돌아올 주소 */
  returnPath: string;
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

export async function CommentSection({ postId, commentCount, viewerId, access, returnPath }: CommentSectionProps) {
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
  const next = encodeURIComponent(returnPath);
  const canReply = access === "member";

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold">댓글 {commentCount.toLocaleString()}개</h2>

      {access === "member" && <CommentForm postId={postId} />}
      {access === "guest" && (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <Link href={`/login?next=${next}`} className="font-medium text-foreground underline underline-offset-4">
            로그인
          </Link>
          하고 댓글을 남겨 보세요.
        </p>
      )}
      {access === "onboarding" && (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <Link href={`/onboarding?next=${next}`} className="font-medium text-foreground underline underline-offset-4">
            닉네임을 정하면
          </Link>{" "}
          댓글을 쓸 수 있어요.
        </p>
      )}

      {threads.length > 0 && (
        <div className="divide-y divide-border pt-2">
          {threads.map((t) => (
            <div key={t.key}>
              {t.state === "visible" ? (
                <CommentItem
                  comment={t.comment}
                  postId={postId}
                  isMine={!!viewerId && t.comment.author_id === viewerId}
                  replyParentId={canReply ? t.comment.id : null}
                />
              ) : (
                <CommentPlaceholder reason={t.state} />
              )}
              {t.replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  postId={postId}
                  isReply
                  isMine={!!viewerId && r.author_id === viewerId}
                  // 삭제·숨김 부모에는 새 답글을 달 수 없다 (INVALID_PARENT)
                  replyParentId={canReply && t.state === "visible" ? t.key : null}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
