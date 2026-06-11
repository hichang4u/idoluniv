"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/chat";
import { MessageItem } from "./MessageItem";
import type { ChatMessage } from "@/types/database";
import { cn } from "@/lib/utils";

const NICKNAME_KEY = "idoluniv_chat_nickname";

interface Props {
  roomId: string;
  initialMessages: ChatMessage[];
}

export function ChatRoom({ roomId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("익명");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // localStorage에서 닉네임 복원
  useEffect(() => {
    const saved = localStorage.getItem(NICKNAME_KEY);
    if (saved) setNickname(saved);
  }, []);

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
    setNickname(trimmed);
    if (trimmed) localStorage.setItem(NICKNAME_KEY, trimmed);
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
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              첫 메시지를 보내보세요!
            </p>
          </div>
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
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 mt-3 shrink-0"
      >
        <input
          type="text"
          value={nickname}
          onChange={(e) => handleNicknameChange(e.target.value)}
          placeholder="닉네임"
          maxLength={20}
          className="w-24 shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
        />
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요... (Enter 전송)"
          disabled={isPending}
          className={cn(
            "flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors",
            "focus:border-primary/60",
            isPending && "opacity-60"
          )}
        />
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className={cn(
            "flex items-center justify-center rounded-lg px-4 py-2 transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            (isPending || !content.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Send className="size-4" />
        </button>
      </form>

      <p className="text-xs text-muted-foreground mt-1.5 px-1">
        {content.length}/500
      </p>
    </div>
  );
}
