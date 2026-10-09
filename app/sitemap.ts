import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

// 최근 글 상한 🟡 (TECH-DESIGN §7.9). 넘으면 generateSitemaps 로 나눈다
const MAX_POSTS = 5000;

// 요청마다 만든다: 빌드 시점에는 DB 를 부르지 않는다(CI 의 더미 환경변수로도 빌드가 돼야 한다).
// createClient 가 cookies() 를 읽으므로 어차피 요청 시점 렌더지만, 의도를 분명히 적어 둔다.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/g"), changeFrequency: "daily", priority: 0.8 },
    { url: siteUrl("/guidelines"), changeFrequency: "monthly", priority: 0.3 },
    { url: siteUrl("/terms"), changeFrequency: "monthly", priority: 0.2 },
    { url: siteUrl("/privacy"), changeFrequency: "monthly", priority: 0.2 },
  ];

  try {
    const supabase = await createClient();
    const { data: groups, error: groupsError } = await supabase
      .from("idol_groups")
      .select("id, slug")
      .eq("is_active", true);
    if (groupsError) throw groupsError;
    if (!groups?.length) return fixed;

    const slugById = new Map(groups.map((g) => [g.id, g.slug]));
    // 숨김 글은 RLS 상 익명에게 오지 않지만 조건을 함께 건다. 비활성 그룹 글은 주소가 404 라 뺀다
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, idol_group_id, updated_at")
      .eq("is_hidden", false)
      .in("idol_group_id", groups.map((g) => g.id))
      .order("created_at", { ascending: false })
      .limit(MAX_POSTS);
    if (postsError) throw postsError;

    return [
      ...fixed,
      ...groups.flatMap((g) => [
        { url: siteUrl(`/g/${g.slug}`), changeFrequency: "hourly" as const, priority: 0.7 },
        { url: siteUrl(`/g/${g.slug}/lounge`), changeFrequency: "always" as const, priority: 0.4 },
      ]),
      ...(posts ?? []).flatMap((p) => {
        const slug = p.idol_group_id ? slugById.get(p.idol_group_id) : undefined;
        return slug ? [{ url: siteUrl(`/g/${slug}/posts/${p.id}`), lastModified: p.updated_at, priority: 0.5 }] : [];
      }),
    ];
  } catch (error) {
    // DB 를 못 읽어도 고정 항목만은 돌려준다
    console.error("[sitemap] failed", error);
    return fixed;
  }
}
