import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupBySlug } from "@/lib/groups";
import { getViewer } from "@/lib/viewer";
import { getMyReportedIds } from "@/lib/reports";
import { getOrCreateChatRoom } from "@/app/actions/chat";
import { ChatRoom, type LoungeAccess } from "@/components/chat/ChatRoom";
import { GroupTabs } from "@/components/group/GroupTabs";
import { RecordVisit } from "@/components/group/RecordVisit";
import { TopBar } from "@/components/layout/TopBar";
import { LOUNGE_MESSAGE_COLUMNS } from "@/types/database";

// loading.tsx 와 같은 값. 빼는 높이 — 모바일: 상단 바 50 + 탭 45.
// 데스크톱: 전역 헤더 50 + 본문 위아래 여백(md 32, lg 48) + 제목 줄 44·아래 여백 8 + 탭 45
const LOUNGE_HEIGHT = "h-[calc(100dvh-95px)] md:h-[calc(100dvh-179px)] lg:h-[calc(100dvh-195px)]";

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

  // 라운지는 하단 탭바를 숨기고 남은 높이를 채운다 (목업 03). 그룹 띠는 입력창 높이를 지키기 위해 두지 않는다
  return (
    <>
      <RecordVisit slug={group.slug} name={group.name} colorKey={group.color_key} />
      <TopBar back="/g" backLabel="그룹 목록" title={group.name} />
      <div className="md:overflow-hidden md:rounded-2xl md:shadow-card md:dark:shadow-none">
        <GroupTabs slug={group.slug} name={group.name} active="lounge" />
        <div className={`flex min-h-80 flex-col bg-card ${LOUNGE_HEIGHT}`}>
          <ChatRoom
            roomId={roomId}
            initialMessages={initialMessages}
            initialReportedIds={[...reportedIds]}
            currentUserId={viewer?.id ?? null}
            access={access}
            returnPath={`/g/${group.slug}/lounge`}
          />
        </div>
      </div>
    </>
  );
}
