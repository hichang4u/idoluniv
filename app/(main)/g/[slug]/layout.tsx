import { notFound } from "next/navigation";
import { getActiveGroupBySlug } from "@/lib/groups";

// 그룹 공간 공통 레이아웃 (D-16, TECH-DESIGN §6.5). 게시판·라운지는 이 공간 안의 두 탭이다.
// data-group-color 아래에서는 primary·group-* 토큰이 그룹 파스텔로 바뀐다 (TOKENS §3.2).
// 상단 바·헤더 띠·탭은 화면마다 다르므로(목업 01~03) 각 페이지가 그린다.
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
    <div data-group-color={group.color_key} className="mx-auto flex max-w-[640px] flex-col">
      {children}
    </div>
  );
}
