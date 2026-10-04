import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const PROTECTED_PATHS = [
  /^\/me(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/g\/[^/]+\/write$/,
  /^\/g\/[^/]+\/posts\/[^/]+\/edit$/,
];

// 비로그인 조회수 중복 제거용 무작위 식별자 (AD-7). 신원 증명으로 쓰지 않는다.
// 서버 컴포넌트는 쿠키를 설정할 수 없으므로 proxy 가 발급한다. 첫 요청부터 쓰이도록 요청에도 넣는다.
const VID_COOKIE = "vid";
const VID_MAX_AGE = 60 * 60 * 24 * 365;

export async function updateSession(request: NextRequest) {
  const newVid = request.cookies.get(VID_COOKIE) ? null : crypto.randomUUID();
  if (newVid) request.cookies.set(VID_COOKIE, newVid);

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

  if (newVid) {
    supabaseResponse.cookies.set(VID_COOKIE, newVid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VID_MAX_AGE,
      path: "/",
    });
  }

  return supabaseResponse;
}
