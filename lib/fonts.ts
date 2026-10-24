import { version } from "pretendard/package.json";

// scripts/pretendard-public.mjs 가 복사하는 위치. 버전이 경로에 있어 오래 캐시해도 된다 (next.config 의 /fonts 헤더)
export const PRETENDARD_CSS = `/fonts/pretendard-${version}/pretendard.css`;

// 글꼴을 한 번 받은 브라우저 표시. 있으면 처음부터 글꼴 CSS 를 넣는다(캐시에서 바로 와서 바뀌어 보이지 않는다)
export const FONTS_COOKIE = "pf";
