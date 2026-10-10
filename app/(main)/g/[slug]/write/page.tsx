import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getActiveGroupBySlug } from "@/lib/groups";
import { getViewer } from "@/lib/viewer";
import { PostForm } from "@/components/board/PostForm";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = { title: "글쓰기", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WritePage({ params }: Props) {
  const { slug } = await params;
  const group = await getActiveGroupBySlug(slug);
  if (!group) notFound();

  // 비로그인은 proxy 가 로그인으로 보낸다. 여기서는 온보딩 전 사용자를 닉네임 화면으로 보낸다 (D-1)
  const path = `/g/${group.slug}/write`;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!viewer.onboarded) redirect(`/onboarding?next=${encodeURIComponent(path)}`);

  return (
    <>
      <TopBar back={`/g/${group.slug}`} backLabel={`${group.name} 게시판으로`} title="글쓰기" />
      <div className="px-4 py-4 md:p-0">
        <div className="rounded-2xl bg-card p-5 shadow-card md:p-6 dark:shadow-none">
          <PostForm groupSlug={group.slug} />
        </div>
      </div>
    </>
  );
}
