"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// 화면 모드 (D-17: 시스템 설정 따름, 라이트 기준 설계). html 에 .dark 를 붙이는 class 전략 (TOKENS §7)
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
