# IdolUniv — MVP Backlog

- 작성: 2026-09-24 (PM)
- 기준: 커밋 `14c161a` (2026-06-12) + 2026-09-24 작업 트리. 미커밋 변경을 근거로 쓴 곳은 **[작업 트리]** 로 표시했다.
- 진척 요약과 Sprint 별 근거는 `docs/SPRINTS.html` 의 "2026-09-24 현황" 섹션에 있다.
- 이 문서의 공수·일정은 전부 **추정**이다. 1인 개발, 주 5일 중 실제 개발 가능 시간은 알 수 없어 반영하지 않았다.

## 우선순위 정의

| 등급 | 뜻 |
|---|---|
| P0 | 다른 작업을 막고 있거나 데이터·보안 사고 위험이 있는 것. 기능 개발보다 먼저 한다. |
| P1 | 축소된 MVP 를 출시하는 데 반드시 필요한 것. |
| P2 | 출시 후로 미뤄도 되는 것. 원 SPRINTS 의 Must Have 였더라도 여기로 내린 항목이 있다(아래 "범위 축소 제안"). |

담당 후보: `frontend-dev` / `supabase-backend` / `designer` / `qa-reviewer`. "사용자"는 결정권자(프로젝트 오너)를 뜻한다.

---

## 1. MVP 범위 축소 제안

원안(`docs/SPRINTS.html`) Must Have 29개 중 완료 10 · 부분 11 · 미착수 8이다. 남은 19개를 원안대로 모두 하는 대신, **게시판 + 채팅 + 신고/숨김 + 최소 관리자**로 출시하자는 제안이다. 채택 여부는 사용자가 정한다.

| 구분 | 항목 | 이유 |
|---|---|---|
| 유지 | 게시판 CRUD, 댓글/대댓글, 게시글 좋아요·스크랩 토글 | 이미 대부분 있음. 보안 수정만 남음 |
| 유지 | 그룹별 실시간 채팅 | 이미 동작. 사칭·도배 방어만 추가 |
| 유지 | 신고 + 숨김 + 최소 관리자(신고 큐, 숨김/해제, 그룹 추가/비활성화) | 익명·반익명 커뮤니티를 운영하려면 최소한의 자정 수단이 필요 (PRD 1단계에도 포함) |
| 유지 | CI, Production 배포, sitemap/robots, 기본 에러 수집 | 출시 조건 |
| 축소 | 소셜 로그인 3종 → 출시 시점에 **검증 완료된 공급자만** 노출 | Kakao/X 는 공급자 설정 여부 외부 미확인. 검증 안 된 버튼은 숨긴다 |
| 축소 | Markdown 지원 → 평문 유지, 폼의 "Markdown 지원" 문구 삭제 | 렌더러·XSS 처리 비용 대비 가치 낮음 |
| 축소 | 글 유형 image/video → 폼에서 숨김 | 업로드 기능 없이 선택지만 있음 |
| 연기(P2) | 이미지 업로드, 타이핑 인디케이터, 마이페이지·스크랩 목록, 댓글 좋아요 UI, OG 이미지, `chat_members` | 출시 차단 요인이 아님 |

---

## 2. P0

### P0-1. 식별 체계 결정 — **결정은 사용자 몫**

- **설명**: 현재 식별 수단이 세 가지로 섞여 있다. 하나로 정하거나, 섞인 상태를 유지할 경우 구멍을 막을 방식을 정해야 한다.
  - posts / comments: `auth.uid()` (`app/actions/post.ts`, `comment.ts`, RLS `0004` [작업 트리])
  - reactions(좋아요·스크랩): 쿠키 `session_id` (`app/actions/reaction.ts`)
  - 채팅: 쿠키 `sid` + 자유 입력 닉네임 (`app/actions/chat.ts`, `author_id` 는 TODO 로 항상 null)
- **근거 (코드로 확인함)**:
  - `toggle_post_like` / `toggle_post_scrap` / `toggle_comment_like` (`0002_community.sql`)는 security definer 이고 호출자가 넘긴 `p_session_id` 를 그대로 믿는다. EXECUTE 를 회수하는 구문이 어느 마이그레이션에도 없으므로, Postgres 기본값(PUBLIC 에 EXECUTE)이 유지되고 있다면 anon key 로 PostgREST 를 직접 호출해 임의 UUID 로 좋아요를 무한히 올릴 수 있다. (Supabase 원격의 실제 권한 상태는 미확인)
  - `reactions` 는 `0004` 이후에도 "public read" 가 유지되어 `session_id` 가 노출된다 → 남의 `session_id` 로 같은 RPC 를 호출하면 그 사람의 좋아요·스크랩이 취소된다.
  - `increment_view_count(p_post_id)` 는 인자가 `p_post_id` 하나뿐이다(세션 인자 없음). 중복 방지 없이 호출 수만큼 오르고, 상세 페이지 렌더마다 1회 호출된다.
  - 채팅은 닉네임을 매 메시지마다 자유 입력하므로 사칭이 가능하고, rate limit 이 없으며, `chat/[groupSlug]/page.tsx` 가 `session_id` 를 select 해 클라이언트로 내려보낸다(Realtime payload 에도 포함).
- **선택지와 트레이드오프**:

| 안 | 내용 | 장점 | 단점 / 비용 |
|---|---|---|---|
| A. 쓰기 전부 로그인 필수 | 읽기는 익명 허용, 좋아요·스크랩·채팅 쓰기는 `auth.uid()` 만. 쿠키 식별 폐기 | 체계 하나로 RLS 가 단순해짐. 사칭·카운트 조작·rate limit·제재를 사용자 단위로 처리 가능. 신고 처리 시 "누구를" 제재할지 명확 | 참여 문턱 상승(채팅은 원래 비로그인 참여가 설계 의도였음, `0004` §6 주석). OAuth 공급자 검증(외부 미확인)이 선행돼야 함. 기존 `session_id` 반응 데이터는 버리거나 이관 |
| B. Supabase 익명 로그인 | 비로그인 방문자에게도 익명 auth 사용자를 발급해 모든 쓰기를 `auth.uid()` 로 통일. 나중에 소셜 계정을 연결 | 체계 하나 + 익명 참여 유지. RLS 를 A 와 거의 같게 쓸 수 있음 | Supabase 프로젝트 설정에서 익명 로그인을 켜야 함. 익명 계정 대량 생성(봇) 대비 CAPTCHA 등 필요. 정책에서 익명/정식 사용자 구분 필요. 이 기능의 세부 동작은 착수 전 Supabase 문서로 재확인 필요(PM 미검증) |
| C. 혼재 유지 + 구멍 막기 | RPC 의 EXECUTE 를 anon/authenticated 에서 회수하고 서버(service role)만 호출, `reactions.session_id` 컬럼 읽기 회수, 채팅 insert 를 서버 경유로 제한, 서버에서 rate limit | 변경량이 가장 적음 | 서버에 service role key 필요. 쿠키만 지우면 좋아요를 다시 누를 수 있어 카운트 조작이 완전히 막히지 않음. 채팅 사칭·제재 단위 문제는 남음. 식별 체계 두 개를 계속 유지 |

  PM 의견(참고용): 이번 MVP 에 신고·제재를 넣는다면 제재할 단위가 필요하므로 A 또는 B 가 맞다. C 는 출시 일정만 보고 고를 때의 차선이다.
- **담당 후보**: 결정 = 사용자 / 설계안 정리 = `supabase-backend` / 위협 검토 = `qa-reviewer`
- **선행 조건**: 없음. 가장 먼저 결정해야 P0-6, P1-1, P1-6 이 움직인다.

### P0-2. 미커밋 작업 정리 커밋

- **설명**: 06-12 이후 커밋이 없고, 수정 13개 파일 + 신규 파일(shadcn UI 25개, `hooks/use-mobile.ts`, `0004`/`0005`, `docs/PRD.md`, `docs/design/`, `.claude/agents/`, `.mcp.json`)이 작업 트리에만 있다. 논리 단위로 나눠 커밋한다. 제안 단위:
  1. `0004_rls_hardening.sql` + `0005_grant_hardening.sql` + `app/actions/chat.ts`
     — `chat.ts` [작업 트리]가 `0004` 의 `get_or_create_chat_room` RPC 를 호출하므로 **같은 커밋으로 묶어야** 한다. 마이그레이션 없이 이 코드만 배포되면 채팅방 진입이 `notFound()` 로 떨어진다.
  2. UI 리디자인: `components/ui/*`, `components/layout/*`, `components/board/PostCard.tsx`, `components/chat/*`, `app/(main)/**`, `hooks/`, `package.json`, `package-lock.json`
  3. 문서: `docs/PRD.md`, `docs/SPRINTS.html`, `docs/BACKLOG.md`, `docs/design/` (designer 작업 종료 후)
  4. 도구 설정: `.claude/agents/`, `.mcp.json` — 커밋할지 사용자가 결정
- **근거**: `git status` (2026-09-24). 작업이 한 PC 에만 있어 유실 위험이 있고, 다른 에이전트가 동시에 같은 파일을 수정 중이라 충돌 가능성이 커지고 있다.
- **함께 확인할 것**:
  - `package.json` [작업 트리]에 `"cn": "^0.2.5"` 가 추가됨. 코드에서 `cn` 은 `lib/utils.ts` 가 직접 정의하므로 이 npm 패키지가 필요한지 의심스럽다. 의도한 설치인지 확인 후 커밋 (PM 은 패키지 내용을 확인하지 않음).
  - `.gitignore` 의 `.env*` 규칙이 이후 만들 `.env.example` 까지 무시하므로 `!.env.example` 예외가 필요하다 (P1-7 과 연결).
- **담당 후보**: 사용자(커밋 권한·범위 결정), 커밋 전 diff 검토 `qa-reviewer`
- **선행 조건**: 동시 작업 중인 에이전트(designer 등)의 작업 종료 또는 합의. 1번 단위는 P0-3 과 순서를 맞춘다.

### P0-3. `0004` → `0005` 원격 적용 · 검증

- **설명**: 두 마이그레이션을 이 순서로 원격 Supabase 에 적용하고, 막으려던 공격이 실제로 막히는지 확인한다.
- **근거**: 원격 적용 여부 미확인. 저장소에 `supabase/config.toml` 이 없어 로컬 CLI 가 원격과 연결된 흔적이 없다. `0002`/`0003` 은 "anon 전체 허용" 정책이라, 원격이 0003 까지만 적용된 상태라면 **anon key 만으로 남의 글 수정·삭제가 가능**하다(`0002_community.sql` 의 `posts: anon update/delete using (true)`).
- **검증 체크리스트** (anon key 또는 일반 사용자 토큰으로 PostgREST 직접 호출):
  - [ ] 원격 마이그레이션 이력 확인 (`supabase migration list` 등) — 0001~0003 적용 여부부터
  - [ ] 적용 전 DB 백업
  - [ ] 남의 `posts` 행 PATCH/DELETE → 거부
  - [ ] 본인 글 PATCH `{"is_hidden": false}` → 권한 오류 (`0005`)
  - [ ] 본인 글 PATCH `{"like_count": 9999}` → 권한 오류 (`0004`)
  - [ ] `users` 에서 `email` select → `permission denied for column email`
  - [ ] `fan_profiles` 본인 행 PATCH `{"level": 99}` → 권한 오류, `{"favorite_group": <실재 id>}` → 성공
  - [ ] `chat_rooms` 직접 insert → 거부, `get_or_create_chat_room` RPC → room id 반환
  - [ ] `chat_messages` insert 시 남의 `author_id` → 거부
  - [ ] 회귀: 로그인 사용자 글쓰기·수정·삭제, 댓글, 좋아요, 채팅 전송이 정상 동작
- **담당 후보**: 적용 `supabase-backend`, 검증 `qa-reviewer`
- **선행 조건**: 원격 DB 접근 권한(사용자). P0-2 의 1번 커밋과 배포 순서 맞추기(마이그레이션 먼저, 코드 나중).

### P0-4. CI 도입 (GitHub Actions)

- **설명**: PR/push 마다 `npm run lint` + `npm run typecheck` + `npm run build` 를 돌린다.
- **근거**: `.github/` 없음. 2026-09-24 작업 트리에서 직접 실행한 결과 `tsc --noEmit` 은 통과, **`eslint` 는 오류 2건**으로 실패한다:
  - `app/(main)/board/[groupSlug]/[postId]/loading.tsx:16` — `react-hooks/purity` (`Math.random()` 렌더 중 호출)
  - `app/(main)/chat/[groupSlug]/loading.tsx:25` — 같은 규칙
  - (경고 1건: `chat/[groupSlug]/page.tsx:67` `<img>`)
  CI 를 켜면 첫 실행부터 빨간불이므로 이 2건을 먼저 고친다. `next build` 는 PM 이 실행하지 않아 통과 여부 미확인.
- **메모**: 빌드에 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 가 필요할 수 있다(GitHub Secrets 또는 더미 값).
- **담당 후보**: lint 수정 `frontend-dev`, 워크플로 작성 `frontend-dev`
- **선행 조건**: P0-2 (커밋되지 않은 코드는 CI 대상이 아님).

### P0-5. 로그인 직후 404 · 닉네임 미설정

- **설명**: 로그인이라는 가장 기본 동선이 끊겨 있다.
- **근거**:
  - `app/auth/callback/route.ts` 의 기본 리다이렉트가 `/profile` (마지막 커밋 `14c161a` 에서 `/` → `/profile` 로 변경)인데 `/profile` 라우트가 없다 → 로그인 성공 직후 404. Sidebar 의 "마이페이지" 링크도 같은 404.
  - `handle_new_user()` (`0001`)는 `nickname` 을 채우지 않고 닉네임 설정 UI 도 없다 → 모든 글·댓글 작성자가 "익명"으로 표시된다.
- **최소안**: 콜백 기본값을 `/` 로 되돌리거나 최소 `/profile`(닉네임 설정만) 페이지를 만든다. 스크랩 목록 등 마이페이지 본 기능은 P2.
- **담당 후보**: `frontend-dev` (닉네임 유일성 오류 처리는 `supabase-backend` 확인)
- **선행 조건**: 없음. OAuth 공급자 동작 확인은 사용자(Supabase 대시보드).

### P0-6. 식별 체계 결정에 따른 보안 수정 구현

- **설명**: P0-1 에서 고른 안대로 `toggle_*` RPC, `increment_view_count`, `reactions` 읽기 권한, 채팅 insert 경로를 고친다. 새 마이그레이션(`0006_...`)으로 추적한다.
- **근거**: P0-1 근거 참고. QA 리뷰 미해결 항목.
- **담당 후보**: `supabase-backend`(마이그레이션), `frontend-dev`(`app/actions/reaction.ts`, `chat.ts`, 채팅 UI), `qa-reviewer`(재검증)
- **선행 조건**: P0-1 결정, P0-3 완료.

---

## 3. P1

### P1-1. 신고 시스템 (게시글 / 댓글 / 채팅 메시지)
- **설명**: `reports` 테이블(대상 종류·대상 id·신고자·사유·상태), 신고 insert 는 로그인(또는 P0-1 에서 정한 식별자) 기준 중복 방지. 각 항목에 신고 버튼.
- **근거**: 관련 테이블·코드 없음. `is_hidden` 컬럼만 있음(`0002`, `0003`). PRD 1단계 필수 기능.
- **담당 후보**: `supabase-backend`, `frontend-dev`, UI `designer`
- **선행 조건**: P0-1, P0-3

### P1-2. 관리자 역할 + 숨김 처리 RPC
- **설명**: 관리자 판별 수단(예: `users.role` 또는 별도 `admins` 테이블)과, 관리자만 호출 가능한 security definer 숨김/해제 함수. `0005` 가 작성자의 `is_hidden` 쓰기를 막았으므로 숨김은 이 함수로만 가능해진다.
- **근거**: 역할 컬럼·관리자 함수 없음. `0004` §6 주석 "숨김 처리는 추후 관리자용 security definer 함수로".
- **담당 후보**: `supabase-backend`, 검토 `qa-reviewer`
- **선행 조건**: P0-3

### P1-3. 최소 관리자 화면 (`/admin`)
- **설명**: 신고 큐 목록 → 숨김/해제/기각, 아이돌 그룹 추가·비활성화. 통계·경고·제재 이력은 제외.
- **근거**: admin 라우트 없음. `proxy` 보호 경로는 `/profile` 뿐(`lib/supabase/middleware.ts`).
- **담당 후보**: `frontend-dev`, `designer`
- **선행 조건**: P1-1, P1-2

### P1-4. 아이돌 그룹 시드 데이터
- **설명**: 출시용 그룹 목록을 마이그레이션 또는 `supabase/seed.sql` 로 관리.
- **근거**: 어느 마이그레이션에도 `idol_groups` insert 가 없고 쓰기 정책도 없다 → 새 환경에서는 게시판·채팅 목록이 비어 있다. P1-3 전까지의 임시 수단 겸용.
- **담당 후보**: `supabase-backend`
- **선행 조건**: 없음

### P1-5. 게시판 소유자 UI · 입력 결함 정리
- **설명**: 수정/삭제 버튼을 작성자에게만 표시, 수정 페이지에서 소유자 아니면 차단, 비로그인 사용자의 글쓰기·수정 페이지 진입 시 로그인으로 유도, 글 유형 라디오 선택 표시 수정, "Markdown 지원" 문구와 image/video 유형 숨김(범위 축소안).
- **근거**: `[postId]/page.tsx` 가 버튼을 무조건 렌더. `new/page.tsx`·`edit/page.tsx` 에 `getUser` 확인 없음 → 비로그인 제출 시 `requireUserId` 가 throw. 남의 글 수정은 RLS 로 0행 갱신되지만 `updatePost` 는 오류 없이 성공처럼 redirect. `PostForm.tsx` 의 radio 에 `peer` 클래스가 없어 `peer-checked:` 스타일이 적용되지 않음.
- **담당 후보**: `frontend-dev`
- **선행 조건**: 없음 (RLS 는 P0-3)

### P1-6. 채팅 최소 방어 · 결함
- **설명**: 식별자 단위 rate limit, 닉네임 정책(P0-1 이 A/B 면 계정 닉네임 사용), 클라이언트로 `session_id` 내려보내지 않기, 초기 로드를 "최근 50개"로 수정.
- **근거**: `app/actions/chat.ts` rate limit 없음. `chat/[groupSlug]/page.tsx` 가 `ascending: true` + `limit(50)` 이라 주석("최근 메시지 50개")과 달리 **가장 오래된 50개**를 가져온다.
- **담당 후보**: `frontend-dev`, `supabase-backend`
- **선행 조건**: P0-1 (rate limit 단위가 식별 체계에 따라 달라짐)

### P1-7. Production 배포 · 환경변수
- **설명**: Vercel Production 배포, 환경변수 등록, `.env.example` 작성(+ `.gitignore` 예외), OAuth 공급자별 Redirect URL 등록, 검증된 공급자만 로그인 버튼 노출.
- **근거**: `vercel.json`/`.vercel`/`.env.example` 없음. Preview/Production 배포 여부는 외부 미확인.
- **담당 후보**: 사용자(계정·도메인·시크릿), `frontend-dev`
- **선행 조건**: P0-3, P0-4

### P1-8. sitemap / robots / 기본 메타데이터
- **설명**: `app/sitemap.ts`, `app/robots.ts`. `generateMetadata` 는 3곳에서 title 만 설정 중이므로 description 보강. OG 이미지는 P2.
- **근거**: 해당 파일 없음. 작성 전 `node_modules/next/dist/docs/` 에서 Next 16 규약 확인 필요(`AGENTS.md`).
- **담당 후보**: `frontend-dev`
- **선행 조건**: P1-7 (도메인 확정)

### P1-9. 모바일 반응형 점검
- **설명**: 전 화면 모바일 점검과 수정.
- **근거**: shadcn Sidebar(Sheet) + `hooks/use-mobile.ts` [작업 트리]. `docs/design/` 는 designer 가 작업 중이라 PM 은 내용을 보지 않았다.
- **담당 후보**: `designer`, `frontend-dev`
- **선행 조건**: P0-2 의 UI 커밋

### P1-10. 기본 에러 수집
- **설명**: 최소한 FE 런타임 오류를 모을 수단. Sentry(원안) 또는 호스팅 기본 로그 중 선택.
- **근거**: Sentry 의존성·설정 없음. 1인 운영(PRD 리스크 HIGH)이라 장애 인지 수단이 필요.
- **담당 후보**: `frontend-dev`
- **선행 조건**: P1-7

### P1-11. 이용약관 · 개인정보처리방침 페이지 (원안에 없던 추가 제안)
- **설명**: 로그인 화면이 동의 문구를 띄우지만 링크 대상이 없다.
- **근거**: `components/auth/LoginForm.tsx` 의 "이용약관"·"개인정보처리방침"은 `<span>` 일 뿐 페이지가 없음. 개인정보(이메일)를 수집하는 서비스라 공개 전에 필요할 것으로 보임(법적 요건 세부는 PM 미검토).
- **담당 후보**: 문안 = 사용자, 페이지 = `frontend-dev`
- **선행 조건**: 없음

---

## 4. P2 (출시 후)

| 항목 | 근거 / 메모 | 담당 후보 |
|---|---|---|
| 이미지 업로드 (Storage) + 용량·형식 검증 | 코드 없음. 원 Sprint 3 Must Have → 축소안으로 연기 | `supabase-backend`, `frontend-dev` |
| 마이페이지 + 스크랩 목록 | `/profile` 없음. 스크랩은 현재 쿠키 `session_id` 기준이라 P0-1 결과에 따라 모델이 바뀜 | `frontend-dev` |
| 댓글 좋아요 UI | `toggle_comment_like` RPC 만 있음 | `frontend-dev` |
| 타이핑 인디케이터 | presence/broadcast 코드 없음 | `frontend-dev` |
| Markdown 렌더링 | 도입 시 XSS 방어 필수 | `frontend-dev`, `qa-reviewer` |
| OG 이미지 | `openGraph` 없음 | `frontend-dev`, `designer` |
| `chat_members` 테이블 | 원안 Sprint 3 에 있었으나 현재 기능상 필요 없음. 범위에서 제외 제안 | — |
| 미사용 의존성 정리 | `@tanstack/react-query`, `zustand` 는 설치만 되어 있고 import 없음 | `frontend-dev` |
| 관리자 통계, Rate limiting(API 전반), AdSense 등 원안 Nice to Have | 원안 그대로 연기 | — |
| 문서 정정: `docs/PRD.md`/`PRD.html` 의 "Next.js 14" | 이번 작업 범위 밖이라 SPRINTS 만 정정함 | PM |

---

## 5. 재일정 초안 (추정)

전제: 1인 개발, 주 단위, 2026-09-28(월) 시작. 공휴일·개인 일정·다른 에이전트 작업량은 반영하지 않았다. 원안 8주 계획이 8주 넘게 밀린 이력이 있으므로 이 일정도 **신뢰도 낮음**으로 본다. 1주 버퍼를 넣었다.

| 주차 | 기간 | 목표 | 항목 | 종료 판단 기준 |
|---|---|---|---|---|
| W0 | 09-24 ~ 09-27 | 정리·결정 요청 | P0-2, P0-1 결정 요청 | 작업 트리 비움(논리 단위 커밋), 사용자에게 선택지 전달 |
| W1 | 09-28 ~ 10-04 | 기반 복구 | P0-3, P0-4, P0-5 | 원격에 0004·0005 적용 + 체크리스트 통과, CI 녹색, 로그인 후 404 없음 |
| W2 | 10-05 ~ 10-11 | 보안 수정 | P0-6, P1-4, P1-5 | QA 미해결 이슈 재검증 통과 |
| W3 | 10-12 ~ 10-18 | 자정 기능 백엔드 | P1-1, P1-2 | 신고 insert·관리자 숨김 RPC 동작 |
| W4 | 10-19 ~ 10-25 | 관리자 화면 | P1-3, P1-6 | 신고 → 숨김 흐름이 화면에서 완결 |
| W5 | 10-26 ~ 11-01 | 출시 준비 | P1-7, P1-8, P1-10, P1-11 | Production URL 에서 전체 동선 동작 |
| W6 | 11-02 ~ 11-08 | 점검 | P1-9, `qa-reviewer` 전체 리뷰, 버그 수정 | 차단 이슈 0 → 클로즈드 베타 |
| W7 | 11-09 ~ 11-15 | 버퍼 | 밀린 항목 | 공개 베타 여부 결정 |

- 클로즈드 베타 목표: **2026-11-08 전후 (추정)**. P0-1 결정이 W1 안에 나오지 않으면 W2 이후가 그대로 밀린다.
- 가장 큰 불확실성: (1) P0-1 결정 시점, (2) 원격 DB 의 실제 상태(P0-3 에서 0001~0003 부터 어긋나 있으면 W1 이 늘어남), (3) OAuth 공급자 설정 상태.
