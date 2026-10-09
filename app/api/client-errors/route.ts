import { NextResponse, type NextRequest } from "next/server";

// 브라우저 오류를 Vercel 로그로 옮기는 수신처 (F9-6, D-5: 수집처는 Vercel 로그).
// 로그인 없이 부를 수 있으므로 크기를 제한하고 받은 값을 잘라서 한 줄로만 남긴다. 응답에는 아무것도 싣지 않는다.
const MAX_BODY = 4096;

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  console.error(
    JSON.stringify({
      level: "error",
      source: "client",
      kind: clip(body.kind, 32),
      route: clip(body.route, 200),
      message: clip(body.message, 500),
      stack: clip(body.stack, 2000),
      digest: clip(body.digest, 64),
      ua: request.headers.get("user-agent")?.slice(0, 200),
    })
  );
  return new NextResponse(null, { status: 204 });
}
