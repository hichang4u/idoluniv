import { EyeOff } from "lucide-react";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { ReportButton, ReportedMask } from "@/components/report/Reportable";
import { formatTime } from "@/lib/format";
import type { LoungeMessage } from "@/types/database";

interface Props {
  message: LoungeMessage;
  isMine?: boolean;
  /** 남의 메시지에만 신고 버튼. 상위에 Reportable 이 있어야 한다 */
  canReport?: boolean;
  /** 입장 뒤 관리자·자동 숨김으로 가려졌다 (F6-7) */
  hidden?: boolean;
}

// 라운지 메시지 한 줄 (목업 03): 말풍선 없이 아바타 + 닉네임·시간 + 본문(15/1.6). 좌우 정렬은 나누지 않는다
export function MessageItem({ message, isMine = false, canReport = false, hidden = false }: Props) {
  if (hidden) {
    return (
      <div className="flex items-center gap-2.5 text-[13.5px] text-text-subtle">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2" aria-hidden="true">
          <EyeOff className="size-3.5" />
        </span>
        가려진 메시지입니다
      </div>
    );
  }

  return (
    <div className="group/message flex gap-2.5">
      <UserAvatar seed={message.author_id ?? message.nickname} name={message.nickname} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center text-[12.5px] leading-5">
          <span className="truncate font-semibold text-text-strong">{message.nickname}</span>
          {isMine && (
            <span className="ml-1.5 shrink-0 rounded-full border border-group-text px-1.5 text-[10.5px] leading-4 font-semibold text-group-text">
              나
            </span>
          )}
          <time dateTime={message.created_at} className="ml-1.5 shrink-0 text-[11.5px] text-text-subtle tabular-nums">
            {formatTime(message.created_at)}
          </time>
          {canReport && (
            // 데스크톱은 메시지에 올렸을 때·키보드 초점일 때만, 터치 기기는 항상 보인다
            <ReportButton
              iconOnly
              className="ml-0.5 opacity-0 focus-visible:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100"
            />
          )}
        </p>
        <ReportedMask label="신고한 메시지입니다" className="mt-0.5 inline-block px-3 py-1.5 text-xs">
          <p className="text-[15px] leading-[1.6] text-foreground whitespace-pre-wrap [overflow-wrap:anywhere]">
            {message.content}
          </p>
        </ReportedMask>
      </div>
    </div>
  );
}
