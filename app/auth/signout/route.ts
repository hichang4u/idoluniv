import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const origin = new URL(request.url).origin;
  // POST 뒤에는 303 으로 GET 이동을 명시한다
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
