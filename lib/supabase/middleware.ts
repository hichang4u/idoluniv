import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const PROTECTED_PATHS = [
  /^\/me(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/admin(\/|$)/,
  // 라우트 이전(/g/…) 전까지의 글쓰기·수정 경로
  /^\/board\/[^/]+\/new$/,
  /^\/board\/[^/]+\/[^/]+\/edit$/,
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인이 필요한 경로. 낙관적 리다이렉트일 뿐이고 최종 권한은 페이지(getViewer)와 DB 가 판단한다
  // (TECH-DESIGN AD-13, §6.4). 읽기 화면(게시판·라운지)은 비로그인 허용.
  const requiresAuth = PROTECTED_PATHS.some((re) => re.test(request.nextUrl.pathname));

  if (requiresAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    // 갱신된 세션 쿠키를 리다이렉트 응답에도 싣는다
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return supabaseResponse;
}
