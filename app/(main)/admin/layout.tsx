import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: { template: "%s · 관리자", default: "관리자" },
  robots: { index: false },
};

// 최소 관리자 (F8, TECH-DESIGN §7.8). 로그인은 proxy 가 요구하고, 관리자가 아니면 존재를 숨긴다(404).
// 데이터 권한은 DB(is_admin)가 따로 막는다.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/me" backLabel="마이로" title="관리자" />
      <div className="flex flex-col gap-4 px-4 pb-4 md:p-0">
        <AdminTabs />
        {children}
      </div>
    </div>
  );
}
