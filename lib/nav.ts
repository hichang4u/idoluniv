import { Home, Users, User, type LucideIcon } from "lucide-react";

// 1차 내비게이션 — 그룹 중심 IA (D-16): 홈 · 그룹 · 마이.
// 데스크톱 Sidebar 와 모바일 하단 탭바(T11)가 같은 목록과 활성 규칙을 쓴다.
export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/g", label: "그룹", icon: Users },
  { href: "/me", label: "마이", icon: User },
];

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
