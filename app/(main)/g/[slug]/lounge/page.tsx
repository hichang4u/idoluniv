import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupBySlug } from "@/lib/groups";
import { getOrCreateChatRoom } from "@/app/actions/chat";
import { ChatRoom } from "@/components/chat/ChatRoom";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getActiveGroupBySlug(slug);
  return { title: group ? `${group.name} 라운지` : "라운지" };
}

export default async function LoungePage({ params }: Props) {
  const { slug } = await params;
  const group = await getActiveGroupBySlug(slug);
  if (!group) notFound();

  const roomId = await getOrCreateChatRoom(group.id);
  if (!roomId) notFound();

  // 최근 메시지 50개: 최신순으로 50개를 가져온 뒤 오래된→최신 순으로 뒤집는다
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, room_id, author_id, session_id, nickname, content, is_hidden, created_at")
    .eq("room_id", roomId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const initialMessages = (messages ?? []).reverse();

  // 그룹 이름·탭은 레이아웃이 그린다. 높이는 화면 맞춤(디자인 적용 T11 에서 탭바 숨김과 함께 다듬는다)
  return (
    <div className="flex min-h-96 flex-col" style={{ height: "calc(100dvh - 16rem)" }}>
      <ChatRoom roomId={roomId} initialMessages={initialMessages} />
    </div>
  );
}
