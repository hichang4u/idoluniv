// Server Action 반환 형식 (TECH-DESIGN AD-12, §6.2·§6.3).
// 예상 가능한 실패는 throw 하지 않고 { ok: false, code } 로 돌려준다.
// DB 함수는 `raise exception '<CODE>' using errcode = 'P0001'` 로 오류를 던지고,
// PostgREST 응답의 message 에 그 코드가 실린다.

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "ONBOARDING_REQUIRED"
  | "CONSENT_REQUIRED"
  | "VALIDATION"
  | "NICKNAME_INVALID"
  | "NICKNAME_RESERVED"
  | "NICKNAME_TAKEN"
  | "NICKNAME_COOLDOWN"
  | "RATE_LIMITED"
  | "DUPLICATE_MESSAGE"
  | "NOT_FOUND"
  | "POST_NOT_FOUND"
  | "NOT_FOUND_OR_FORBIDDEN"
  | "GROUP_NOT_FOUND"
  | "ROOM_NOT_FOUND"
  | "INVALID_PARENT"
  | "ALREADY_REPORTED"
  | "CANNOT_REPORT_OWN"
  | "FORBIDDEN"
  | "SLUG_TAKEN"
  | "UNKNOWN";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_REQUIRED: "로그인이 필요해요.",
  ONBOARDING_REQUIRED: "닉네임을 먼저 정해 주세요.",
  CONSENT_REQUIRED: "만 14세 이상 확인과 약관 동의가 필요해요.",
  VALIDATION: "입력한 내용을 다시 확인해 주세요.",
  NICKNAME_INVALID: "닉네임은 2~20자의 한글·영문·숫자·밑줄(_)만 쓸 수 있어요.",
  NICKNAME_RESERVED: "사용할 수 없는 닉네임이에요.",
  NICKNAME_TAKEN: "이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.",
  NICKNAME_COOLDOWN: "닉네임은 30일에 한 번 바꿀 수 있어요.",
  RATE_LIMITED: "잠시 후 다시 시도해 주세요.",
  DUPLICATE_MESSAGE: "같은 메시지를 연속으로 보낼 수 없어요.",
  NOT_FOUND: "삭제되었거나 찾을 수 없어요.",
  POST_NOT_FOUND: "삭제되었거나 찾을 수 없는 글이에요.",
  NOT_FOUND_OR_FORBIDDEN: "삭제되었거나 권한이 없어요.",
  GROUP_NOT_FOUND: "존재하지 않는 게시판이에요.",
  ROOM_NOT_FOUND: "채팅방을 찾을 수 없어요.",
  INVALID_PARENT: "답글을 달 수 없는 댓글이에요.",
  ALREADY_REPORTED: "이미 신고한 콘텐츠예요.",
  CANNOT_REPORT_OWN: "내 글은 신고할 수 없어요.",
  FORBIDDEN: "권한이 없어요.",
  SLUG_TAKEN: "이미 사용 중인 주소예요.",
  UNKNOWN: "문제가 생겼어요. 다시 시도해 주세요.",
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fields?: Partial<Record<string, string>> };

export function ok<T = void>(data?: T): ActionResult<T> {
  return { ok: true, data: data as T };
}

export function fail<T = never>(
  code: ErrorCode,
  options: { message?: string; fields?: Partial<Record<string, string>> } = {},
): ActionResult<T> {
  return { ok: false, code, message: options.message ?? ERROR_MESSAGES[code], fields: options.fields };
}

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_MESSAGES));

type DbError = { code?: string | null; message?: string | null } | null | undefined;

/**
 * Supabase(PostgREST) 오류를 ErrorCode 로 바꾼다.
 * @param uniqueViolation 유일키 위반(23505)을 어떤 코드로 볼지. 문맥마다 다르다(닉네임, 신고 등).
 */
export function fromDbError(error: DbError, uniqueViolation: ErrorCode = "UNKNOWN"): ErrorCode {
  if (!error) return "UNKNOWN";
  const message = error.message?.trim() ?? "";
  if (KNOWN_CODES.has(message)) return message as ErrorCode;
  switch (error.code) {
    case "23505":
      return uniqueViolation;
    case "42501": // 권한 없음, RLS 위반
      return "FORBIDDEN";
    case "PGRST116": // .single() 에서 0행
      return "NOT_FOUND";
    default:
      // 원본은 서버 로그로만 남기고 사용자에게는 일반 문구를 보여 준다
      console.error("[action] unmapped db error", { code: error.code, message: error.message });
      return "UNKNOWN";
  }
}
