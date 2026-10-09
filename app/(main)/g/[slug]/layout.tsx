import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // 헤더 띠의 지표. 행을 받지 않고 수만 센다(숨김 글 제외)
  const supabase = await createClient();
  const countPosts = (fanficOnly: boolean) => {
    let q = supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("idol_group_id", group.id)
      .eq("is_hidden", false);
    if (fanficOnly) q = q.eq("post_type", "fanfic");
    return q;
  };
  const [{ count: postCount }, { count: fanficCount }] = await Promise.all([countPosts(false), countPosts(true)]);

  return (
    <div data-group-color={group.color_key} className="mx-auto flex max-w-[640px] flex-col gap-4">
      <GroupTabs
        slug={group.slug}
        name={group.name}
        colorKey={group.color_key}
        postCount={postCount ?? 0}
        fanficCount={fanficCount ?? 0}
      />
      {children}
    </div>
  );
}
