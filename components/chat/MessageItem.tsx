import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import type { ChatMessage } from "@/types/database";

interface Props {
  message: ChatMessage;
  align?: "start" | "end";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageItem({ message, align = "start" }: Props) {
  const initial = message.nickname ? message.nickname[0].toUpperCase() : "?";

  return (
    <Message align={align}>
      <MessageAvatar>
        <Avatar className="size-8">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </MessageAvatar>

      <MessageContent>
        <MessageHeader>
          <span>{message.nickname}</span>
          <span className="ml-2 font-normal">
            {formatTime(message.created_at)}
          </span>
        </MessageHeader>

        <Bubble variant={align === "end" ? "default" : "muted"} align={align}>
          <BubbleContent>{message.content}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
