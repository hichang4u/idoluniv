import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DeferredFonts } from "@/components/layout/DeferredFonts";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { FONTS_COOKIE, PRETENDARD_CSS } from "@/lib/fonts";
import { OG_BASE, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // 상대 경로 OG·canonical 의 기준 (NEXT_PUBLIC_SITE_URL)
  metadataBase: new URL(siteUrl("/")),
  applicationName: "IdolUniv",
  openGraph: { ...OG_BASE, type: "website" },
  title: {
    default: "IdolUniv — 아이돌 팬덤 커뮤니티",
    template: "%s | IdolUniv",
  },
  // 검색 결과·공유 미리보기 문구. 홈 소개 카드와 같은 내용(MVP 범위, 비공식 표기 D-22). PRD 머리의 비전 문구는 장기 목표라 쓰지 않는다
  description: "그룹별 게시판과 라운지에서 팬끼리 이야기하는 비공식 아이돌 팬 커뮤니티",
  keywords: ["kpop", "아이돌", "팬덤", "커뮤니티", "K-pop"],
};

// 주소창·상태바 색을 앱 바탕(surface-0)에 맞춘다
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 글꼴을 이미 받은 브라우저면 처음부터 넣고(캐시), 처음이면 페이지 로드 뒤에 붙인다 (D-32)
  const fontsCached = (await cookies()).has(FONTS_COOKIE);

  return (
    // next-themes 가 렌더 전에 html 의 class 를 바꾸므로 하이드레이션 경고를 끈다
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {fontsCached ? <link rel="stylesheet" href={PRETENDARD_CSS} precedence="fonts" /> : <DeferredFonts href={PRETENDARD_CSS} />}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
