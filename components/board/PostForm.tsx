"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createPost, updatePost } from "@/app/actions/post";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Post, PostType } from "@/types/database";

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: "text", label: "일반" },
  { value: "image", label: "이미지" },
  { value: "video", label: "영상" },
  { value: "fanfic", label: "팬픽" },
];

interface PostFormProps {
  groupSlug: string;
  post?: Pick<Post, "id" | "title" | "content" | "post_type">;
}

type ActionState = { error?: string } | null;

export function PostForm({ groupSlug, post }: PostFormProps) {
  const isEdit = !!post;
  const action = isEdit ? updatePost : createPost;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {/* hidden fields */}
      <input type="hidden" name="groupSlug" value={groupSlug} />
      {isEdit && <input type="hidden" name="postId" value={post.id} />}

      {/* 글 유형 */}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">글 유형</legend>
        <div className="flex gap-2">
          {POST_TYPES.map((type) => (
            <label key={type.value} className="cursor-pointer">
              <input
                type="radio"
                name="post_type"
                value={type.value}
                defaultChecked={
                  isEdit
                    ? post.post_type === type.value
                    : type.value === "text"
                }
                className="sr-only"
              />
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  "border-border text-muted-foreground hover:border-primary hover:text-primary",
                  "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary"
                )}
              >
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 제목 */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          제목
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          defaultValue={post?.title}
          placeholder="제목을 입력하세요"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* 내용 */}
      <div className="space-y-1.5">
        <label htmlFor="content" className="text-sm font-medium">
          내용
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={12}
          defaultValue={post?.content}
          placeholder="내용을 입력하세요 (Markdown 지원)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y font-mono"
        />
      </div>

      {/* 에러 */}
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {/* 버튼 */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => history.back()}
        >
          취소
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "수정하기" : "작성하기"}
        </Button>
      </div>
    </form>
  );
}
