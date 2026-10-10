"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, Clock, Eye, MessagesSquare, ShieldCheck, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/chat";
import { MessageItem } from "./MessageItem";
import { Reportable } from "@/components/report/Reportable";
import { IconChip } from "@/components/common/IconChip";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS } from "@/lib/limits";
import { LOUNGE_MESSAGE_COLUMNS, type LoungeMessage } from "@/types/database";

// 장시간 방송 중 메모리가 계속 늘지 않도록 오래된 메시지부터 버린다 🟡 (TECH-DESIGN §7.6)
const MAX_MESSAGES = 200;

/** 라운지 입력 자격. 화면 분기용이고 최종 판단은 DB 트리거가 한다 */
export type LoungeAccess = "member" | "guest" | "onboarding";

type Connection = "connecting" | "live" | "lost";

// 숨김 전파 이벤트 (F6-7, 0010 chat_moderation_events). 숨긴 메시지는 RLS 때문에 UPDATE 이벤트가
// 오지 않으므로 이 테이블의 INSERT 로 알게 된다.
type ModerationEvent = { id: number; message_id: string; action: string };

// PostgREST 와 Realtime 의 timestamptz 문자열 형식이 같다는 보장이 없어(Realtime 은 서버 값을 그대로 넘긴다)
// 정렬·비교 전에 ISO(UTC, 밀리초)로 맞춘다. 마이크로초가 잘려도 재연결 보정은 gte + id 중복 제거라 안전하다.
function normalizeTime(value: string) {
  const ms = Date.parse(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isNaN(ms) ? value : new Date(ms).toISOString();
}

// id 로 중복을 없애고 시간순으로 정렬한 뒤 최근 MAX_MESSAGES 개만 남긴다
function mergeMessages(prev: LoungeMessage[], incoming: LoungeMessage[]) {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, { ...m, created_at: normalizeTime(m.created_at) });
  return [...byId.values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .slice(-MAX_MESSAGES);
}

interface Props {
  roomId: string;
  initialMessages: LoungeMessage[];
  /** 입장 시점에 내가 이미 신고한 메시지 id */
  initialReportedIds: string[];
  currentUserId: string | null;
  access: LoungeAccess;
  /** 로그인·온보딩 뒤 돌아올 주소 */
  returnPath: string;
}

export function ChatRoom({ roomId, initialMessages, initialReportedIds, currentUserId, access, returnPath }: Props) {
  const [reportedIds] = useState(() => new Set(initialReportedIds));
  const [messages, setMessages] = useState<LoungeMessage[]>(() => mergeMessages([], initialMessages));
  // 입장 뒤 관리자·자동 숨김으로 가려진 메시지
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [connection, setConnection] = useState<Connection>("connecting");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  // 빈도 제한·도배 거부는 경고 톤 안내(목업 03), 그 외 실패는 오류
  const [error, setError] = useState<{ text: string; tone: "warn" | "error" } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 재연결 보정에서 "마지막으로 가진 메시지" 시각을 읽기 위한 최신값
  const lastAtRef = useRef<string | null>(null);
  // 숨김 이벤트 보정 범위(가진 메시지 중 가장 오래된 시각)
  const firstAtRef = useRef<string | null>(null);
  const router = useRouter();
  const next = encodeURIComponent(returnPath);

  useEffect(() => {
    lastAtRef.current = messages.at(-1)?.created_at ?? null;
    firstAtRef.current = messages[0]?.created_at ?? null;
  }, [messages]);

  // Realtime 구독 + 연결 상태 추적
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    // 이미 반영한 마지막 이벤트 id. 실시간 이벤트와 보정 조회가 겹쳐도 순서가 뒤집히지 않게 한다
    let lastEventId = 0;

    const applyEvents = (events: ModerationEvent[]) => {
      const fresh = events.filter((e) => e.id > lastEventId).sort((a, b) => a.id - b.id);
      if (fresh.length === 0) return;
      lastEventId = fresh[fresh.length - 1].id;
      // 같은 메시지에 여러 이벤트가 있으면 마지막 것이 최종 상태다
      const finalAction = new Map(fresh.map((e) => [e.message_id, e.action]));
      setHiddenIds((prev) => {
        const nextIds = new Set(prev);
        for (const [id, action] of finalAction) {
          if (action === "hide") nextIds.add(id);
          else nextIds.delete(id);
        }
        return nextIds;
      });
      // 입장 전에 숨겨져 목록에 없던 메시지가 해제되면 가져와 합친다
      const unhidden = [...finalAction].filter(([, action]) => action === "unhide").map(([id]) => id);
      if (unhidden.length > 0) {
        void supabase
          .from("chat_messages")
          .select(LOUNGE_MESSAGE_COLUMNS)
          .in("id", unhidden)
          .eq("is_hidden", false)
          .then(({ data }) => {
            if (!disposed && data && data.length > 0) setMessages((prev) => mergeMessages(prev, data));
          });
      }
    };

    // (재)구독 때마다 가진 메시지 범위의 숨김 이벤트를 다시 읽는다(끊긴 동안 놓친 숨김 보정)
    const backfillEvents = async () => {
      let query = supabase
        .from("chat_moderation_events")
        .select("id, message_id, action")
        .eq("room_id", roomId)
        .order("id", { ascending: true })
        .limit(500);
      if (firstAtRef.current) query = query.gte("created_at", firstAtRef.current);
      const { data } = await query;
      if (!disposed && data) applyEvents(data);
    };

    // 구독이 (다시) 성립할 때마다 마지막 메시지 이후를 조회해 합친다.
    // 첫 구독도 포함한다: 서버 렌더와 구독 성립 사이에 온 메시지를 놓치지 않기 위해서다.
    // 같은 시각의 메시지가 있을 수 있어 gte 로 가져오고 id 로 중복을 없앤다.
    const backfill = async () => {
      let query = supabase
        .from("chat_messages")
        .select(LOUNGE_MESSAGE_COLUMNS)
        .eq("room_id", roomId)
        // 관리자에게는 RLS 가 숨김 메시지도 돌려주므로 거른다
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(MAX_MESSAGES);
      if (lastAtRef.current) query = query.gte("created_at", lastAtRef.current);
      const { data } = await query;
      if (!disposed && data && data.length > 0) setMessages((prev) => mergeMessages(prev, data));
    };

    const channel = supabase
      .channel(`lounge:${roomId}`)
      .on<LoungeMessage>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => setMessages((prev) => mergeMessages(prev, [payload.new])),
      )
      .on<ModerationEvent>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_moderation_events", filter: `room_id=eq.${roomId}` },
        (payload) => applyEvents([payload.new]),
      )
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          setConnection("live");
          void backfill();
          void backfillEvents();
        } else {
          // CHANNEL_ERROR·TIMED_OUT·CLOSED. 클라이언트가 소켓을 다시 연결하면 SUBSCRIBED 가 다시 온다
          setConnection("lost");
        }
      });

    return () => {
      disposed = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 새 메시지 오면 목록만 맨 아래로 스크롤한다(scrollIntoView 는 창까지 움직여 상단 바를 밀어낸다)
  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    setContent("");
    setError(null);

    startTransition(async () => {
      const result = await sendMessage(roomId, trimmed);
      if (result.ok) {
        // Realtime 이 늦거나 끊겨도 보낸 메시지는 바로 보인다(같은 id 는 합쳐진다)
        setMessages((prev) => mergeMessages(prev, [result.data]));
      } else if (result.code === "AUTH_REQUIRED") {
        router.push(`/login?next=${next}`);
      } else if (result.code === "ONBOARDING_REQUIRED") {
        router.push(`/onboarding?next=${next}`);
      } else {
        const warn = result.code === "RATE_LIMITED" || result.code === "DUPLICATE_MESSAGE";
        setError({ text: result.message, tone: warn ? "warn" : "error" });
        setContent(trimmed);
      }
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 한글 등 IME 조합 중 Enter 는 조합 확정용이므로 전송하지 않는다.
    // Safari 는 확정 Enter 의 keydown 에서 isComposing=false, keyCode=229 를 보낸다.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 글자 수는 한도에 가까워질 때만 보여 준다 (목업 03 은 입력창만)
  const nearLimit = content.length >= LIMITS.chat - 50;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {connection === "lost" && (
        <p
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-2 px-4 py-2 text-xs text-text-subtle"
        >
          <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
          연결이 끊겼어요. 다시 연결하는 중이에요…
        </p>
      )}

      {/* 메시지 목록 */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* 메시지가 적을 때도 입력창 가까이 붙도록 아래로 모은다 */}
        <div className="flex min-h-full flex-col justify-end gap-3 px-4 pt-2 pb-2.5">
          <p className="flex items-center justify-center gap-1.5 px-4 pt-2 pb-1 text-xs text-text-subtle">
            <IconChip icon={ShieldCheck} color="mint" size="xs" />
            <span>
              서로 존중해 주세요 ·{" "}
              <Link href="/guidelines" className="font-medium text-foreground underline underline-offset-2">
                라운지 규칙
              </Link>
            </span>
          </p>
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-subtle">첫 메시지를 보내 보세요.</p>
          ) : (
            messages.map((msg) => {
              const isMine = !!currentUserId && msg.author_id === currentUserId;
              return (
                <Reportable
                  key={msg.id}
                  targetType="chat_message"
                  targetId={msg.id}
                  initialReported={reportedIds.has(msg.id)}
                  access={access}
                >
                  <MessageItem
                    message={msg}
                    isMine={isMine}
                    hidden={hiddenIds.has(msg.id)}
                    canReport={!isMine && !hiddenIds.has(msg.id)}
                  />
                </Reportable>
              );
            })
          )}
        </div>
      </div>

      {/* 입력 영역 */}
      {access === "member" ? (
        <>
          {error && (
            <p
              role="alert"
              className={
                error.tone === "warn"
                  ? "flex shrink-0 items-center gap-1.5 px-4 pb-1.5 text-[12.5px] text-warning-text"
                  : "flex shrink-0 items-center gap-1.5 px-4 pb-1.5 text-[12.5px] text-destructive"
              }
            >
              {error.tone === "warn" ? (
                <Clock className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              )}
              {error.text}
            </p>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 items-center gap-2 border-t border-border px-3 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))]"
          >
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, LIMITS.chat))}
              onKeyDown={handleKeyDown}
              maxLength={LIMITS.chat}
              placeholder="메시지를 입력하세요"
              aria-label="메시지"
              aria-describedby={nearLimit ? "chat-count" : undefined}
              enterKeyHint="send"
              className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface-0 px-4 text-[15px] text-foreground outline-none placeholder:text-text-subtle focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            {nearLimit && (
              <span id="chat-count" className="shrink-0 text-xs text-text-subtle tabular-nums">
                {content.length}/{LIMITS.chat}
              </span>
            )}
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              aria-label="보내기"
              className="inline-grid size-11 shrink-0 place-items-center rounded-full bg-group-solid text-group-on-solid transition-[filter,opacity] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              {isPending ? <Spinner /> : <ArrowRight className="size-5" aria-hidden="true" />}
            </button>
          </form>
        </>
      ) : (
        // 비로그인·온보딩 전: 입력창 대신 참여 유도 (목업 04)
        <div className="grid shrink-0 gap-2.5 border-t border-border px-4 pt-3.5 pb-[calc(18px+env(safe-area-inset-bottom))] text-center">
          <p className="inline-flex items-center justify-center gap-1.5 text-[13.5px] text-text-subtle break-keep">
            <Eye className="size-4 shrink-0" aria-hidden="true" />
            {access === "guest"
              ? "대화는 누구나 볼 수 있어요. 참여하려면 로그인이 필요해요."
              : "대화에 참여하려면 닉네임을 정해 주세요."}
          </p>
          <Link
            href={access === "guest" ? `/login?next=${next}` : `/onboarding?next=${next}`}
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-group-solid text-sm font-semibold text-group-on-solid transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <MessagesSquare className="size-[18px]" aria-hidden="true" />
            {access === "guest" ? "로그인하고 참여하기" : "닉네임 정하고 참여하기"}
          </Link>
        </div>
      )}
    </div>
  );
}
