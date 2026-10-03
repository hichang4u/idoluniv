// 로그인 후 돌아갈 경로(next)를 같은 사이트 안의 경로로만 제한한다 (TECH-DESIGN N1).
// `${origin}${next}` 로 이어 붙일 때 "@evil.com" 은 https://host@evil.com 이 되어
// 브라우저가 evil.com 으로 가고, "//evil.com" 은 프로토콜 상대 URL 이 된다.
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // 제어 문자(개행 등)는 헤더 분할·파서 차이를 노릴 수 있어 거부한다
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
