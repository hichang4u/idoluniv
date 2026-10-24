import { NextResponse } from "next/server";

// 브라우저 Sentry 이벤트를 우리 서버를 거쳐 보낸다 (D-31 보완, 2026-10-24).
// 브라우저가 Sentry 에 직접 접속하면 Sentry 가 접속 IP 로 시·구 단위 위치를 붙인다(IP 저장을 꺼도, 대시보드 삭제 규칙으로도
// 지워지지 않았다). 여기서 넘기면 Sentry 는 Vercel 서버의 IP 만 본다. 사용자 요청 헤더(IP·쿠키·UA)는 넘기지 않는다.
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const MAX_BODY = 256 * 1024;

function parseDsn(dsn: string) {
  const url = new URL(dsn);
  return { host: url.host, projectId: url.pathname.replace(/^\//, ""), publicKey: url.username };
}

export async function POST(request: Request) {
  if (!DSN) return new NextResponse(null, { status: 404 });
  const ours = parseDsn(DSN);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return new NextResponse(null, { status: 413 });
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > MAX_BODY) return new NextResponse(null, { status: 413 });

  // 엔벨로프 첫 줄은 JSON 헤더이고 tunnel 을 쓰면 dsn 이 실린다. 우리 프로젝트로 가는 것만 넘긴다(남의 프로젝트 중계 방지)
  const newline = body.indexOf(10);
  try {
    const header = JSON.parse(new TextDecoder().decode(newline === -1 ? body : body.subarray(0, newline)));
    const theirs = parseDsn(String(header.dsn));
    if (theirs.host !== ours.host || theirs.projectId !== ours.projectId || theirs.publicKey !== ours.publicKey) {
      return new NextResponse(null, { status: 400 });
    }
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const upstream = await fetch(`https://${ours.host}/api/${ours.projectId}/envelope/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    });
    // SDK 가 Sentry 의 빈도 제한을 따르도록 관련 헤더만 돌려준다
    const headers = new Headers();
    for (const name of ["x-sentry-rate-limits", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(null, { status: upstream.status, headers });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
