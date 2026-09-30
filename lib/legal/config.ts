// 법적 페이지(이용약관·개인정보처리방침·가이드라인)에 들어갈 운영자 정보.
// 개인정보가 저장소에 남지 않도록 값은 환경변수에서만 읽는다(.env.example 참고).
// NEXT_PUBLIC_ 접두어가 없으므로 서버에서만 읽힌다. 법적 페이지는 (main) 레이아웃이
// 쿠키를 읽어 요청마다 서버에서 렌더되므로 값은 실행 시점에 읽힌다(next build 결과 ƒ).
// Vercel 에서는 환경변수를 바꾼 뒤 재배포해야 반영된다.

export const TERMS_VERSION = "2026-10-draft";

type Field = {
  /** 화면에 표시할 값. 설정되지 않았으면 null */
  value: string | null;
  /** 설정 안내에 쓸 환경변수 이름 */
  env: string;
};

export type LegalInfo = {
  operatorName: Field;
  businessNumber: Field;
  contactEmail: Field;
  rightsEmail: Field;
  privacyOfficerName: Field;
  privacyOfficerEmail: Field;
  effectiveDate: Field;
  supabaseRegion: Field;
  vercelRegion: Field;
  /** 필수인데 비어 있는 환경변수 이름 */
  missing: string[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function read(env: string, check?: RegExp): Field {
  const raw = process.env[env]?.trim();
  if (!raw) return { value: null, env };
  if (check && !check.test(raw)) {
    console.error(`[legal] ${env} 형식이 올바르지 않습니다.`);
    return { value: null, env };
  }
  return { value: raw, env };
}

// 선택 항목은 비어 있으면 대체 값을 쓴다(예: 권리자 신고 이메일 → 문의 이메일)
function withFallback(field: Field, fallback: Field): Field {
  return field.value ? field : { value: fallback.value, env: field.env };
}

export function getLegalInfo(): LegalInfo {
  const contactEmail = read("LEGAL_CONTACT_EMAIL", EMAIL);
  const info = {
    operatorName: read("LEGAL_OPERATOR_NAME"),
    businessNumber: read("LEGAL_BUSINESS_REGISTRATION_NUMBER"),
    contactEmail,
    rightsEmail: withFallback(read("LEGAL_RIGHTS_EMAIL", EMAIL), contactEmail),
    privacyOfficerName: read("LEGAL_PRIVACY_OFFICER_NAME"),
    privacyOfficerEmail: withFallback(read("LEGAL_PRIVACY_OFFICER_EMAIL", EMAIL), contactEmail),
    effectiveDate: read("LEGAL_EFFECTIVE_DATE", DATE),
    supabaseRegion: read("LEGAL_SUPABASE_REGION"),
    vercelRegion: read("LEGAL_VERCEL_REGION"),
  };

  const required: Field[] = [
    info.operatorName,
    info.contactEmail,
    info.privacyOfficerName,
    info.effectiveDate,
    info.supabaseRegion,
    info.vercelRegion,
  ];
  const missing = required.filter((f) => !f.value).map((f) => f.env);
  if (missing.length > 0) {
    console.warn(`[legal] 설정되지 않은 환경변수: ${missing.join(", ")}`);
  }

  return { ...info, missing };
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
