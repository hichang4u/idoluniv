"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { type ActionResult, fail, fromDbError, ok } from "@/lib/action-result";
import { REPORT_TARGET_TYPES, type ReportTargetType } from "@/lib/report-reasons";
import { isGroupColorKey } from "@/lib/group-colors";

// 관리자 액션 (F8, TECH-DESIGN §7.8). 권한의 최종 판단은 DB 다(RPC 의 is_admin, idol_groups RLS).
// 여기서 먼저 확인하는 것은 오류 문구를 분명히 하기 위해서다.

async function requireAdmin(): Promise<ActionResult<never> | null> {
  const viewer = await getViewer();
  if (!viewer) return fail("AUTH_REQUIRED");
  if (!viewer.isAdmin) return fail("FORBIDDEN");
  return null;
}

export type ModerationIntent = "hide" | "unhide" | "dismiss";

/** 신고 큐 카드의 처리: 숨김 / 숨김 해제 / 기각 (F8-3) */
export async function moderateTarget(_prev: unknown, formData: FormData): Promise<ActionResult<{ intent: ModerationIntent }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const targetType = String(formData.get("targetType") ?? "") as ReportTargetType;
  const targetId = String(formData.get("targetId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!REPORT_TARGET_TYPES.includes(targetType) || !targetId) return fail("NOT_FOUND");
  if (intent !== "hide" && intent !== "unhide" && intent !== "dismiss") return fail("INVALID_ACTION");
  if (note.length > 500) return fail("VALIDATION", { message: "메모는 500자까지 쓸 수 있어요." });

  const supabase = await createClient();
  const { error } =
    intent === "dismiss"
      ? await supabase.rpc("admin_dismiss_reports", {
          p_target_type: targetType,
          p_target_id: targetId,
          p_note: note || undefined,
        })
      : await supabase.rpc("admin_moderate", {
          p_target_type: targetType,
          p_target_id: targetId,
          p_action: intent,
          p_note: note || undefined,
        });
  if (error) return fail(fromDbError(error));

  refresh();
  return ok({ intent });
}

// ── 그룹 관리 (F8-4) ────────────────────────────────────────
// slug 는 주소라 만든 뒤 바꾸지 않는다(DB 컬럼 GRANT 에서도 제외, 0011).
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GROUP_LIMITS = { name: 50, agency: 50, description: 200, slug: { min: 2, max: 40 } } as const;

type GroupFields = {
  name: string;
  name_ko: string | null;
  agency: string | null;
  debut_date: string | null;
  description: string | null;
  color_key: string;
  is_active: boolean;
};

function readGroupFields(formData: FormData): { fields: GroupFields } | { error: ActionResult<never> } {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const name = text("name");
  const nameKo = text("name_ko");
  const agency = text("agency");
  const debutDate = text("debut_date");
  const description = text("description");
  const colorKey = text("color_key");

  const errors: Record<string, string> = {};
  if (!name) errors.name = "이름을 입력해 주세요.";
  else if (name.length > GROUP_LIMITS.name) errors.name = `이름은 ${GROUP_LIMITS.name}자까지예요.`;
  if (nameKo.length > GROUP_LIMITS.name) errors.name_ko = `한글 이름은 ${GROUP_LIMITS.name}자까지예요.`;
  if (agency.length > GROUP_LIMITS.agency) errors.agency = `소속사는 ${GROUP_LIMITS.agency}자까지예요.`;
  if (description.length > GROUP_LIMITS.description) errors.description = `소개는 ${GROUP_LIMITS.description}자까지예요.`;
  if (debutDate && !/^\d{4}-\d{2}-\d{2}$/.test(debutDate)) errors.debut_date = "날짜 형식이 아니에요.";
  if (!isGroupColorKey(colorKey)) errors.color_key = "색을 골라 주세요.";
  if (Object.keys(errors).length > 0) return { error: fail("VALIDATION", { fields: errors }) };

  return {
    fields: {
      name,
      name_ko: nameKo || null,
      agency: agency || null,
      debut_date: debutDate || null,
      description: description || null,
      color_key: colorKey,
      is_active: formData.get("is_active") === "on",
    },
  };
}

export async function createGroup(_prev: unknown, formData: FormData): Promise<ActionResult<{ slug: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const read = readGroupFields(formData);
  const slugError =
    slug.length < GROUP_LIMITS.slug.min || slug.length > GROUP_LIMITS.slug.max || !SLUG_PATTERN.test(slug)
      ? `주소는 ${GROUP_LIMITS.slug.min}~${GROUP_LIMITS.slug.max}자의 영문 소문자·숫자·하이픈(-)이에요.`
      : null;
  if ("error" in read || slugError) {
    const fields = { ...("error" in read && !read.error.ok ? read.error.fields : {}), ...(slugError ? { slug: slugError } : {}) };
    return fail("VALIDATION", { fields });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("idol_groups").insert({ ...read.fields, slug });
  if (error) {
    const code = fromDbError(error, "SLUG_TAKEN");
    return fail(code, code === "SLUG_TAKEN" ? { fields: { slug: "이미 쓰는 주소예요." } } : {});
  }

  refresh();
  return ok({ slug });
}

export async function updateGroup(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("NOT_FOUND");
  const read = readGroupFields(formData);
  if ("error" in read) return read.error;

  const supabase = await createClient();
  const { data, error } = await supabase.from("idol_groups").update(read.fields).eq("id", id).select("id");
  if (error) return fail(fromDbError(error));
  if (!data?.length) return fail("NOT_FOUND_OR_FORBIDDEN");

  refresh();
  return ok({ id });
}
