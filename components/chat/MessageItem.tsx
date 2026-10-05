import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import type { LoungeMessage } from "@/types/database";

interface Props {
  message: LoungeMessage;
  isMine?: boolean;
}

// 서버(UTC)와 브라우저에서 같은 문자열이 나오도록 시간대를 고정한다(하이드레이션 불일치 방지)
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

export function MessageItem({ message, isMine = false }: Props) {
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
            <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-px text-[0.6875rem] font-medium text-primary">
              나
            </span>
          )}
          <span className="ml-2 font-normal">{formatTime(message.created_at)}</span>
        </MessageHeader>

        <Bubble variant="muted" align="start">
          <BubbleContent>{message.content}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
