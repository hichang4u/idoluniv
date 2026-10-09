import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { ReportButton, ReportedMask } from "@/components/report/Reportable";
import type { LoungeMessage } from "@/types/database";

interface Props {
  message: LoungeMessage;
  isMine?: boolean;
  /** 남의 메시지에만 신고 버튼. 상위에 Reportable 이 있어야 한다 */
  canReport?: boolean;
  /** 입장 뒤 관리자·자동 숨김으로 가려졌다 (F6-7) */
  hidden?: boolean;
}

// 서버(UTC)와 브라우저에서 같은 문자열이 나오도록 시간대를 고정한다(하이드레이션 불일치 방지)
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

export function MessageItem({ message, isMine = false, canReport = false, hidden = false }: Props) {
  const initial = message.nickname ? message.nickname[0].toUpperCase() : "?";

  return (
    <Message align="start">
      <MessageAvatar>
        <Avatar className="size-8">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </MessageAvatar>

      <MessageContent>
        <MessageHeader>
          <span>{message.nickname}</span>
          {isMine && (
            <span className="ml-1.5 rounded-full bg-group-soft px-1.5 py-px text-[0.6875rem] font-medium text-group-text">
              나
            </span>
          )}
          <span className="ml-2 font-normal">{formatTime(message.created_at)}</span>
          {canReport && (
            // 데스크톱은 메시지에 올렸을 때·키보드 초점일 때만, 터치 기기는 항상 보인다
            <ReportButton
              iconOnly
              className="ml-2 p-1 opacity-0 focus-visible:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100"
            />
          )}
        </MessageHeader>

        {hidden ? (
          <p className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">가려진 메시지입니다.</p>
        ) : (
          <ReportedMask label="신고한 메시지입니다" className="px-3 py-1.5 text-xs">
            <Bubble variant="muted" align="start">
              <BubbleContent>{message.content}</BubbleContent>
            </Bubble>
          </ReportedMask>
        )}
      </MessageContent>
    </Message>
  );
}
