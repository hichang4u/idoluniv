// 서비스 기준 URL (TECH-DESIGN §7.9). sitemap·robots·metadataBase·OAuth 복귀 주소가 쓴다.
// .env.example 처럼 빈 문자열로 두면 "설정 안 됨"으로 본다(?? 가 아니라 || 로 읽는 이유).
const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");

/** 설정된 기준 URL. 없으면 null — 브라우저에서는 현재 origin 을 쓴다(Preview 배포 등) */
export const SITE_URL: string | null = configured || null;

/** 서버에서 절대 URL 이 꼭 필요할 때(sitemap 등). 설정이 없으면 로컬 개발 주소 */
export function siteUrl(path = "/") {
  return `${SITE_URL ?? "http://localhost:3000"}${path.startsWith("/") ? path : `/${path}`}`;
}

/** openGraph 공통값. 하위 화면의 openGraph 는 상위 값을 통째로 덮어쓰므로 각자 펼쳐 넣는다(Next 메타데이터 병합 규칙) */
export const OG_BASE = { siteName: "IdolUniv", locale: "ko_KR" } as const;
