import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getActiveGroupBySlug } from "@/lib/groups";
import { PostForm } from "@/components/board/PostForm";

export const metadata: Metadata = { title: "글쓰기", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WritePage({ params }: Props) {
  const { slug } = await params;
  const group = await getActiveGroupBySlug(slug);
  if (!group) notFound();

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
