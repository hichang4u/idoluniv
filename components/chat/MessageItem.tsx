import type { ChatMessage } from "@/types/database";

interface Props {
  message: ChatMessage;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageItem({ message }: Props) {
  const initial = message.nickname ? message.nickname[0].toUpperCase() : "?";

  return (
    <div className="flex items-start gap-2.5">
      <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">
        {initial}
      </div>
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{message.nickname}</span>
          <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed break-words">{message.content}</p>
      </div>
    </div>
  );
}
