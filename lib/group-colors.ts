// 그룹 색 파스텔 24색 (D-18, docs/design/TOKENS.md §3.2).
// 원본은 docs/design/tokens/presets.json 이고, DB CHECK(0011 idol_groups.color_key)와 같은 key 목록이다.
// swatch 는 관리자 화면 미리보기용 라이트 solid 값이다. 실제 화면 색은 토큰(data-group-color)이 정한다(T11).
export const GROUP_COLORS = [
  { key: "cherry", label: "체리블라썸", swatch: "#fdc8db" },
  { key: "rose", label: "로즈", swatch: "#fda9b8" },
  { key: "coral", label: "코랄", swatch: "#fda896" },
  { key: "peach", label: "피치", swatch: "#fdc7a7" },
  { key: "apricot", label: "살구", swatch: "#f6be82" },
  { key: "mango", label: "망고", swatch: "#fccd73" },
  { key: "butter", label: "버터", swatch: "#fae798" },
  { key: "lemon", label: "레몬", swatch: "#f5f488" },
  { key: "lime", label: "라임", swatch: "#ccef8d" },
  { key: "pistachio", label: "피스타치오", swatch: "#b4dda7" },
  { key: "sage", label: "세이지", swatch: "#a8c7ad" },
  { key: "mint", label: "민트", swatch: "#a6ebc8" },
  { key: "aqua", label: "아쿠아", swatch: "#a0eadf" },
  { key: "teal", label: "틸", swatch: "#80cccc" },
  { key: "sky", label: "스카이", swatch: "#a8e0f6" },
  { key: "baby", label: "베이비블루", swatch: "#97cff7" },
  { key: "cobalt", label: "코발트", swatch: "#89b3f1" },
  { key: "periwinkle", label: "페리윙클", swatch: "#b1c1fc" },
  { key: "lavender", label: "라벤더", swatch: "#cec6fc" },
  { key: "lilac", label: "라일락", swatch: "#ceadf1" },
  { key: "orchid", label: "오키드", swatch: "#e3afeb" },
  { key: "pink", label: "핑크", swatch: "#f6b5dd" },
  { key: "mauve", label: "모브", swatch: "#bf96b5" },
  { key: "greige", label: "그레이지", swatch: "#d2c9be" },
] as const;

export type GroupColorKey = (typeof GROUP_COLORS)[number]["key"];
export const DEFAULT_GROUP_COLOR: GroupColorKey = "baby";

export function isGroupColorKey(value: string): value is GroupColorKey {
  return GROUP_COLORS.some((c) => c.key === value);
}
