import { cookies } from "next/headers";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { MainShell } from "@/components/layout/MainShell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 사이드바 열림 상태를 쿠키에서 복원 (components/ui/sidebar.tsx 가 sidebar_state 쿠키에 기록)
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // 모바일: 상단 바 + 하단 탭바(사이드바·푸터 없음). 데스크톱(md 이상): 사이드바 + 푸터
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar />
      <SidebarInset>
        <Header />
        <MainShell>{children}</MainShell>
        <Footer />
      </SidebarInset>
      <BottomTabBar />
    </SidebarProvider>
  );
}
