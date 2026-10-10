"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, MessageSquare, X } from "lucide-react";
import { createComment } from "@/app/actions/comment";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS } from "@/lib/limits";
import type { CommentAccess } from "@/components/board/CommentSection";

/** 답글 대상. mention 은 대댓글에 답할 때 앞에 붙이는 상대 닉네임 (F4-2, N15) */
type ReplyTarget = { parentId: string; nickname: string; mention: boolean };

type ComposerState = {
  replyTo: ReplyTarget | null;
  startReply: (target: ReplyTarget) => void;
};

const ComposerContext = createContext<ComposerState | null>(null);

/** 댓글 목록의 "답글" 이 하단 입력창을 답글 모드로 바꾼다. 입력창은 화면에 하나만 둔다 (목업 02) */
export function useCommentComposer() {
  return useContext(ComposerContext);
}

export function CommentComposerProvider({
  postId,
  access,
  returnPath,
  children,
}: {
  postId: string;
  access: CommentAccess;
  returnPath: string;
  children: React.ReactNode;
}) {
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const startReply = (target: ReplyTarget) => {
    setReplyTo(target);
    setError(null);
    // 대댓글에 답하면 같은 부모 아래에 달고 상대 닉네임을 앞에 붙인다
    if (target.mention) setContent((c) => (c.startsWith(`@${target.nickname} `) ? c : `@${target.nickname} ${c}`));
    inputRef.current?.focus();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || pending) return;
    setError(null);
    const formData = new FormData();
    formData.set("postId", postId);
    if (replyTo) formData.set("parentId", replyTo.parentId);
    formData.set("content", trimmed);
    startTransition(async () => {
      const result = await createComment(formData);
      if (result.ok) {
        setContent("");
        setReplyTo(null);
        return;
      }
      const next = encodeURIComponent(pathname);
      if (result.code === "AUTH_REQUIRED") router.push(`/login?next=${next}`);
      else if (result.code === "ONBOARDING_REQUIRED") router.push(`/onboarding?next=${next}`);
      else setError(result.message);
    });
  };

  const next = encodeURIComponent(returnPath);
  const nearLimit = content.length >= LIMITS.comment - 100;

  return (
    <ComposerContext.Provider value={{ replyTo, startReply }}>
      {children}

      {access !== "locked" && (
        // 화면 바닥에 붙는 입력 바. 모바일은 하단 탭바 자리, 데스크톱은 본문 열의 바닥에 붙는다
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:sticky md:mt-2 md:rounded-2xl md:border">
          {access === "member" ? (
            <form onSubmit={submit} className="mx-auto max-w-[640px] px-3 pt-2.5 pb-[calc(14px+env(safe-area-inset-bottom))] md:pb-3.5">
              {replyTo && (
                <p className="flex items-center gap-1 px-1 pb-2 text-[12.5px] text-text-subtle">
                  <span className="min-w-0 truncate">
                    <b className="font-semibold text-group-text">{replyTo.nickname}</b>님에게 답글
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="답글 취소"
                    className="-my-3 ml-auto inline-grid size-11 shrink-0 place-items-center rounded-full hover:bg-muted"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </p>
              )}
              {error && (
                <p role="alert" className="flex items-center gap-1.5 px-1 pb-2 text-[12.5px] text-destructive">
                  <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
              <div className="flex items-end gap-2">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[22px] border border-line-strong bg-surface-0 px-4 py-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
                  <MessageSquare className="size-[18px] shrink-0 self-start text-text-subtle" aria-hidden="true" />
                  <textarea
                    ref={inputRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, LIMITS.comment))}
                    rows={1}
                    maxLength={LIMITS.comment}
                    placeholder={replyTo ? "답글 남기기" : "댓글 남기기"}
                    aria-label={replyTo ? "답글" : "댓글"}
                    // 내용만큼 늘어나되 네 줄까지 (field-sizing 미지원 브라우저는 한 줄 + 스크롤)
                    className="max-h-[6.5em] min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-[1.45] text-foreground outline-none [field-sizing:content] placeholder:text-text-subtle"
                  />
                  {nearLimit && (
                    <span className="shrink-0 self-end text-xs text-text-subtle tabular-nums">
                      {content.length.toLocaleString()}/{LIMITS.comment.toLocaleString()}
                    </span>
                  )}
                </label>
                <button
                  type="submit"
                  disabled={pending || content.trim().length === 0}
                  aria-label="등록"
                  className="inline-grid size-11 shrink-0 place-items-center rounded-full bg-group-solid text-group-on-solid transition-[filter,opacity] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  {pending ? <Spinner /> : <ArrowRight className="size-5" aria-hidden="true" />}
                </button>
              </div>
            </form>
          ) : (
            // 비로그인·온보딩 전: 입력창 모양의 진입점
            <div className="mx-auto flex max-w-[640px] gap-2 px-3 pt-2.5 pb-[calc(14px+env(safe-area-inset-bottom))] md:pb-3.5">
              <Link
                href={access === "guest" ? `/login?next=${next}` : `/onboarding?next=${next}`}
                className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[22px] border border-line-strong bg-surface-0 px-4 text-[15px] text-text-subtle"
              >
                <MessageSquare className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {access === "guest" ? "로그인하고 댓글 남기기" : "닉네임을 정하고 댓글 남기기"}
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </ComposerContext.Provider>
  );
}
