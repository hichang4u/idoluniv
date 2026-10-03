import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// 활성 그룹만 slug 로 찾는다. 비활성·없는 그룹은 null → 호출부에서 notFound() (F2-6, N4).
// 레이아웃·페이지·generateMetadata 가 같은 요청에서 여러 번 불러도 조회는 한 번이다.
export const getActiveGroupBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("idol_groups")
    .select("id, name, name_ko, slug, description, cover_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
});
