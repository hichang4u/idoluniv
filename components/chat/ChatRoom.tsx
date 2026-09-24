"use client";

import {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/chat";
import { MessageItem } from "./MessageItem";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import type { ChatMessage } from "@/types/database";

const NICKNAME_KEY = "idoluniv_chat_nickname";

// localStorage 의 저장된 닉네임을 외부 스토어로 구독 (다른 탭 변경은 storage 이벤트로 반영)
function subscribeNickname(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getStoredNickname() {
  try {
    return localStorage.getItem(NICKNAME_KEY);
  } catch {
    return null;
  }
}

function getServerNickname() {
  return null;
}

interface Props {
  roomId: string;
  initialMessages: ChatMessage[];
}

export function ChatRoom({ roomId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const storedNickname = useSyncExternalStore(
    subscribeNickname,
    getStoredNickname,
    getServerNickname
  );
  // null = 사용자가 아직 입력하지 않음 → 저장된 닉네임 사용
  const [nicknameInput, setNicknameInput] = useState<string | null>(null);
  const nickname = nicknameInput ?? storedNickname ?? "익명";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat_room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 새 메시지 오면 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 닉네임 변경 시 localStorage 저장
  const handleNicknameChange = (value: string) => {
    const trimmed = value.slice(0, 20);
    setNicknameInput(trimmed);
    if (trimmed) {
      try {
        localStorage.setItem(NICKNAME_KEY, trimmed);
      } catch {
        // 저장 불가(사생활 보호 모드 등) 시 현재 세션 값만 사용
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    const fd = new FormData();
    fd.set("roomId", roomId);
    fd.set("content", trimmed);
    fd.set("nickname", nickname || "익명");

    setContent("");
    setError(null);

    startTransition(async () => {
      const result = await sendMessage(fd);
      if (result?.error) {
        setError(result.error);
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
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyDescription>첫 메시지를 보내보세요!</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-xs text-destructive mt-1.5 px-1">{error}</p>
      )}

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="mt-3 flex shrink-0 gap-2">
        <Input
          type="text"
          value={nickname}
          onChange={(e) => handleNicknameChange(e.target.value)}
          placeholder="닉네임"
          maxLength={20}
          className="w-24 shrink-0"
        />

        <InputGroup className="flex-1">
          <InputGroupInput
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요… (Enter 전송)"
            disabled={isPending}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              disabled={isPending || !content.trim()}
              aria-label="전송"
            >
              {isPending ? <Spinner /> : <Send />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>

      <p className="mt-1.5 px-1 text-xs text-muted-foreground">
        {content.length}/500
      </p>
    </div>
  );
}
