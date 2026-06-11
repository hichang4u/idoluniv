import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateChatRoom } from "@/app/actions/chat";
import { ChatRoom } from "@/components/chat/ChatRoom";
import type { ChatMessage, IdolGroup } from "@/types/database";

interface Props {
  params: Promise<{ groupSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupSlug } = await params;
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("idol_groups")
    .select("name")
    .eq("slug", groupSlug)
    .single();

  return { title: group ? `${group.name} 채팅` : "채팅" };
}

export default async function ChatRoomPage({ params }: Props) {
  const { groupSlug } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("idol_groups")
    .select("id, name, name_ko, slug, cover_url")
    .eq("slug", groupSlug)
    .single();

  if (!group) notFound();

  const typedGroup = group as IdolGroup;
  const roomId = await getOrCreateChatRoom(typedGroup.id);

  if (!roomId) notFound();

  // 최근 메시지 50개 (오래된 순)
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, room_id, author_id, session_id, nickname, content, is_hidden, created_at")
    .eq("room_id", roomId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true })
    .limit(50);

  const initialMessages = (messages ?? []) as ChatMessage[];

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 9rem)" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          채팅 목록
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          {typedGroup.cover_url ? (
            <img
              src={typedGroup.cover_url}
              alt={typedGroup.name}
              className="size-6 rounded object-cover"
            />
          ) : (
            <div className="size-6 rounded bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-bold text-primary">
              {typedGroup.name[0]}
            </div>
          )}
          <span className="text-sm font-semibold">{typedGroup.name}</span>
        </div>
      </div>

      <ChatRoom roomId={roomId} initialMessages={initialMessages} />
    </div>
  );
}
