import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  // 다른 사이트의 폼이 로그아웃시키지 못하게 같은 출처만 받는다 (P1-6 ⑤).
  // 로그인 쿠키가 SameSite=Lax 라 교차 사이트 POST 에는 원래 실리지 않지만, Server Action 과 같은 기준을 둔다
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) return new NextResponse(null, { status: 403 });

  const supabase = await createClient();
  await supabase.auth.signOut();

  // POST 뒤에는 303 으로 GET 이동을 명시한다
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
