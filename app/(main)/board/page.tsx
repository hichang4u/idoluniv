import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { IdolGroup } from "@/types/database";

export const metadata: Metadata = { title: "게시판" };

export default async function BoardIndexPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("idol_groups")
    .select("id, name, name_ko, slug, cover_url, description")
    .eq("is_active", true)
    .order("name");

  const typedGroups = (groups ?? []) as IdolGroup[];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">게시판</h1>

      {typedGroups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>등록된 아이돌 그룹이 없습니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {typedGroups.map((group) => (
            <Item
              key={group.id}
              variant="outline"
              render={<Link href={`/board/${group.slug}`} />}
            >
              <ItemMedia variant="image">
                <Avatar className="size-10 rounded-sm">
                  {group.cover_url && (
                    <AvatarImage src={group.cover_url} alt={group.name} />
                  )}
                  <AvatarFallback className="rounded-sm">
                    {group.name[0]}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{group.name}</ItemTitle>
                {group.name_ko && group.name_ko !== group.name && (
                  <ItemDescription>{group.name_ko}</ItemDescription>
                )}
                {group.description && (
                  <ItemDescription>{group.description}</ItemDescription>
                )}
              </ItemContent>
            </Item>
          ))}
        </div>
      )}
    </div>
  );
}
