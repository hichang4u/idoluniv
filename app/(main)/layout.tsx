import { cookies } from "next/headers";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 사이드바 열림 상태를 쿠키에서 복원 (components/ui/sidebar.tsx 가 sidebar_state 쿠키에 기록)
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 p-4 lg:p-6">{children}</div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
