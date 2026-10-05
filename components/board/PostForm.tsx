"use client";

import { useActionState, useState } from "react";
import { createPost, updatePost } from "@/app/actions/post";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";
import { WRITABLE_POST_TYPES, type Post, type WritablePostType } from "@/types/database";

const TYPE_LABELS: Record<WritablePostType, string> = {
  text: "일반",
  fanfic: "팬픽",
};

interface PostFormProps {
  groupSlug: string;
  post?: Pick<Post, "id" | "title" | "content" | "post_type">;
}

function isWritable(type: string): type is WritablePostType {
  return (WRITABLE_POST_TYPES as readonly string[]).includes(type);
}

export function PostForm({ groupSlug, post }: PostFormProps) {
  const isEdit = !!post;
  const [state, formAction, pending] = useActionState(isEdit ? updatePost : createPost, null);
  // React 는 액션이 끝나면 비제어 입력을 비우므로, 실패해도 내용이 남도록 제어 입력으로 둔다
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  // 기존 image·video 글은 고를 수 없으므로 원래 값을 그대로 보낸다(서버가 유형을 바꾸지 않음)
  const legacyType = post && !isWritable(post.post_type) ? post.post_type : null;
  const [postType, setPostType] = useState<string>(post?.post_type ?? "text");

  const error = state && !state.ok ? state : null;
  const titleError = error?.fields?.title ?? null;
  const contentError = error?.fields?.content ?? null;
  const typeError = error?.fields?.post_type ?? null;
  const formError = error && !error.fields ? error.message : null;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="groupSlug" value={groupSlug} />
      {isEdit && <input type="hidden" name="postId" value={post.id} />}

      {legacyType ? (
        <input type="hidden" name="post_type" value={legacyType} />
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">글 유형</legend>
          <div className="flex gap-2">
            {WRITABLE_POST_TYPES.map((type) => (
              <label key={type} className="cursor-pointer">
                <input
                  type="radio"
                  name="post_type"
                  value={type}
                  checked={postType === type}
                  onChange={() => setPostType(type)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                    "border-border text-muted-foreground hover:border-primary hover:text-primary",
                    "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary",
                    "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
                  )}
                >
                  {TYPE_LABELS[type]}
                </span>
              </label>
            ))}
          </div>
          {typeError && (
            <p role="alert" className="text-sm text-destructive">
              {typeError}
            </p>
          )}
        </fieldset>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          제목
        </label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={LIMITS.postTitle}
          placeholder="제목을 입력하세요"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "title-error" : undefined}
          className="h-11"
        />
        {titleError && (
          <p id="title-error" role="alert" className="text-sm text-destructive">
            {titleError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="content" className="text-sm font-medium">
            내용
          </label>
          <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {content.length.toLocaleString()} / {LIMITS.postContent.toLocaleString()}
          </span>
        </div>
        <Textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={LIMITS.postContent}
          placeholder="내용을 입력하세요"
          aria-invalid={contentError ? true : undefined}
          aria-describedby={contentError ? "content-error" : undefined}
          className="min-h-72 resize-y leading-7"
        />
        {contentError && (
          <p id="content-error" role="alert" className="text-sm text-destructive">
            {contentError}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "수정하기" : "작성하기"}
        </Button>
      </div>
    </form>
  );
}
