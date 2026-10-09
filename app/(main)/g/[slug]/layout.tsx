import { notFound } from "next/navigation";
import { getActiveGroupBySlug } from "@/lib/groups";
import { GroupTabs } from "@/components/group/GroupTabs";

// 그룹 공간 공통 레이아웃 (D-16, TECH-DESIGN §6.5). 게시판·라운지는 이 공간 안의 두 탭이다.
// data-group-color 아래에서는 primary·group-* 토큰이 그룹 파스텔로 바뀐다 (TOKENS §3.2).
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
    <div data-group-color={group.color_key} className="mx-auto flex max-w-3xl flex-col gap-4">
      <GroupTabs slug={group.slug} name={group.name} />
      {children}
    </div>
  );
}
