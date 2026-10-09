"use client";

import { useActionState, useState } from "react";
import { createGroup, updateGroup } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_GROUP_COLOR, GROUP_COLORS } from "@/lib/group-colors";
import { cn } from "@/lib/utils";
import type { IdolGroup } from "@/types/database";

type GroupValues = Pick<
  IdolGroup,
  "id" | "name" | "name_ko" | "slug" | "agency" | "debut_date" | "description" | "color_key" | "is_active"
>;

/** 그룹 추가·수정 폼 (F8-4). 수정할 때 slug 는 읽기 전용이다 */
export function GroupForm({ group }: { group?: GroupValues }) {
  const isEdit = !!group;
  // React 는 액션이 끝나면 비제어 입력을 비우므로 제어 입력으로 둔다
  const initial = {
    name: group?.name ?? "",
    name_ko: group?.name_ko ?? "",
    slug: group?.slug ?? "",
    agency: group?.agency ?? "",
    debut_date: group?.debut_date ?? "",
    description: group?.description ?? "",
    color_key: group?.color_key ?? DEFAULT_GROUP_COLOR,
    is_active: group?.is_active ?? true,
  };
  const [values, setValues] = useState(initial);
  const [state, formAction, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await (isEdit ? updateGroup(prev, formData) : createGroup(prev, formData));
      // 추가에 성공하면 다음 그룹을 위해 비운다
      if (result.ok && !isEdit) setValues(initial);
      return result;
    },
    null,
  );
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const error = state && !state.ok ? state : null;
  const fieldError = (key: string) => error?.fields?.[key] ?? null;
  const prefix = group?.id ?? "new";

  const field = (key: "name" | "name_ko" | "agency", label: string, required = false) => (
    <div className="space-y-1">
      <label htmlFor={`${prefix}-${key}`} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <Input
        id={`${prefix}-${key}`}
        name={key}
        value={values[key]}
        onChange={set(key)}
        aria-invalid={fieldError(key) ? true : undefined}
        className="h-10"
      />
      {fieldError(key) && <p className="text-xs text-destructive">{fieldError(key)}</p>}
    </div>
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {isEdit && <input type="hidden" name="id" value={group.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", "이름 (표기)", true)}
        {field("name_ko", "한글 이름")}
        <div className="space-y-1">
          <label htmlFor={`${prefix}-slug`} className="text-sm font-medium">
            주소 (slug){!isEdit && <span className="text-destructive"> *</span>}
          </label>
          {isEdit ? (
            <p id={`${prefix}-slug`} className="flex h-10 items-center text-sm text-muted-foreground">
              /g/{group.slug} <span className="ml-2 text-xs">(바꿀 수 없음)</span>
            </p>
          ) : (
            <Input
              id={`${prefix}-slug`}
              name="slug"
              value={values.slug}
              onChange={set("slug")}
              placeholder="newjeans"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={fieldError("slug") ? true : undefined}
              className="h-10"
            />
          )}
          {fieldError("slug") && <p className="text-xs text-destructive">{fieldError("slug")}</p>}
        </div>
        {field("agency", "소속사")}
        <div className="space-y-1">
          <label htmlFor={`${prefix}-debut`} className="text-sm font-medium">
            데뷔일
          </label>
          <Input
            id={`${prefix}-debut`}
            name="debut_date"
            type="date"
            value={values.debut_date}
            onChange={set("debut_date")}
            aria-invalid={fieldError("debut_date") ? true : undefined}
            className="h-10"
          />
          {fieldError("debut_date") && <p className="text-xs text-destructive">{fieldError("debut_date")}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${prefix}-desc`} className="text-sm font-medium">
          소개
        </label>
        <Textarea
          id={`${prefix}-desc`}
          name="description"
          value={values.description}
          onChange={set("description")}
          maxLength={200}
          rows={2}
          placeholder="소속사 · 데뷔 연도처럼 잘 바뀌지 않는 정보만"
          className="resize-none"
        />
        {fieldError("description") && <p className="text-xs text-destructive">{fieldError("description")}</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">그룹 색</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {GROUP_COLORS.map((c) => (
            <label key={c.key} className="cursor-pointer" title={c.label}>
              <input
                type="radio"
                name="color_key"
                value={c.key}
                checked={values.color_key === c.key}
                onChange={() => setValues((v) => ({ ...v, color_key: c.key }))}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "block h-9 rounded-lg border border-border",
                  "peer-checked:ring-2 peer-checked:ring-foreground peer-checked:ring-offset-2 peer-checked:ring-offset-background",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                )}
                style={{ backgroundColor: c.swatch }}
              />
              <span className="sr-only">{c.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {GROUP_COLORS.find((c) => c.key === values.color_key)?.label} — 팬덤 공식색 재현이 아니라 구분용 색이에요.
        </p>
        {fieldError("color_key") && <p className="text-xs text-destructive">{fieldError("color_key")}</p>}
      </fieldset>

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="is_active"
          checked={values.is_active}
          onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
          className="size-5 accent-foreground"
        />
        활성 (끄면 게시판·라운지가 닫히고 목록에서 빠져요. 글은 남아요)
      </label>

      {state && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {state.ok ? (isEdit ? "저장했어요." : "그룹을 추가했어요.") : state.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "저장" : "그룹 추가"}
        </Button>
      </div>
    </form>
  );
}
