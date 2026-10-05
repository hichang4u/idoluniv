import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getActiveGroupBySlug } from "@/lib/groups";
import { getViewer } from "@/lib/viewer";
import { PostForm } from "@/components/board/PostForm";

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
    <div className="space-y-4">
      <Link
        href={`/g/${group.slug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        {group.name} 게시판
      </Link>
      <h1 className="text-xl font-bold">글쓰기</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <PostForm groupSlug={group.slug} />
      </div>
    </div>
  );
}
