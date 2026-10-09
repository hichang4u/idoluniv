import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
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
  description: "팬이 만들고, AI가 잇고, 세계가 함께하는 아이돌 유니버스",
  keywords: ["kpop", "아이돌", "팬덤", "커뮤니티", "K-pop"],
};

// 주소창·상태바 색을 앱 바탕(surface-0)에 맞춘다
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // next-themes 가 렌더 전에 html 의 class 를 바꾸므로 하이드레이션 경고를 끈다
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
