import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 외부 주소로 보내지 않도록 같은 사이트 경로만 허용한다 (N1). 기본값은 홈 (P0-5)
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 온보딩(닉네임·만 14세·약관) 전이면 온보딩을 거쳐 next 로 간다 (F1-3)
      const { data: viewer } = await supabase.rpc("get_viewer").maybeSingle();
      if (!viewer?.onboarded) {
        return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
