import { notFound } from "next/navigation";
import { getActiveGroupBySlug } from "@/lib/groups";
import { GroupTabs } from "@/components/group/GroupTabs";

// 그룹 공간 공통 레이아웃 (D-16, TECH-DESIGN §6.5). 게시판·라운지는 이 공간 안의 두 탭이다.
export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await getActiveGroupBySlug(slug);
  if (!group) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <GroupTabs slug={group.slug} name={group.name} />
      {children}
    </div>
  );
}
