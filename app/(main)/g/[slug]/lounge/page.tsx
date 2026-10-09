import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupBySlug } from "@/lib/groups";
import { getViewer } from "@/lib/viewer";
import { getMyReportedIds } from "@/lib/reports";
import { getOrCreateChatRoom } from "@/app/actions/chat";
import { ChatRoom, type LoungeAccess } from "@/components/chat/ChatRoom";
import { LOUNGE_MESSAGE_COLUMNS } from "@/types/database";

// loading.tsx 와 같은 값
const LOUNGE_HEIGHT = "h-[calc(100dvh-178px)] lg:h-[calc(100dvh-194px)]";

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

  const [roomId, viewer] = await Promise.all([getOrCreateChatRoom(group.id), getViewer()]);
  if (!roomId) notFound();

  // 최근 메시지 50개: 최신순으로 50개를 가져온 뒤 오래된→최신 순으로 뒤집는다.
  // 숨김 메시지는 RLS 가 관리자에게만 돌려주므로 여기서도 거른다(관리자 화면이 아니다)
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("chat_messages")
    .select(LOUNGE_MESSAGE_COLUMNS)
    .eq("room_id", roomId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const initialMessages = (messages ?? []).reverse();
  const access: LoungeAccess = !viewer ? "guest" : viewer.onboarded ? "member" : "onboarding";
  // 입장 시 최근 메시지 중 내가 신고한 것. 이후 신고분은 클라이언트 상태로 가린다 (F7-4)
  const reportedIds = await getMyReportedIds(viewer?.id ?? null, [
    { type: "chat_message", ids: initialMessages.map((m) => m.id) },
  ]);

  // 그룹 이름·탭은 레이아웃이 그린다. 라운지는 하단 탭바를 숨기고 남은 높이를 채운다.
  // 빼는 높이: 상단 바 50 + 그룹 이름·탭 96 + 본문 위아래 여백(모바일 32, lg 48) — LOUNGE_HEIGHT 참고
  return (
    <div className={`flex min-h-80 flex-col ${LOUNGE_HEIGHT}`}>
      <ChatRoom
        roomId={roomId}
        initialMessages={initialMessages}
        initialReportedIds={[...reportedIds]}
        currentUserId={viewer?.id ?? null}
        access={access}
        returnPath={`/g/${group.slug}/lounge`}
      />
    </div>
  );
}
