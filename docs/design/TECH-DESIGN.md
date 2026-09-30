# IdolUniv — MVP 기술 설계 (구현 전 분석·설계)

- 작성: 2026-09-29
- 기준: 커밋 `ec876bf` (작업 트리 clean), 마이그레이션 `0001`~`0005`
- 전제 결정: **D-1 = A (쓰기 전부 로그인 필수)** — 2026-09-29 사용자 결정. 읽기는 비로그인 허용.
- 범위: PRD v1.1 §5.1 MVP 전체 (F1~F9), BACKLOG P0-3 ~ P1-11
- 관계: PRD 는 무엇을·왜, BACKLOG 는 언제·누가, **이 문서는 어떻게**. 셋이 충돌하면 범위는 PRD, 순서는 BACKLOG, 구현 방식은 이 문서를 따른다.

### 표기

| 표기 | 뜻 |
|---|---|
| ✅ | 이 문서 작성 중 코드·문서·명령 실행으로 직접 확인 |
| ○ | 근거가 있는 추정. 구현 단계에서 실행으로 확인해야 함 |
| ❓ | 외부 상태(원격 DB, 대시보드 설정 등)라 확인 불가 |
| 🔷 | 결정 필요 — [§11](#11-결정-필요-사항) |
| 🟡 | 이 문서가 제안하는 기본값 |

SQL 은 전부 **초안**이다. 문법·동작을 실제 DB 에서 실행해 본 것이 아니다(로컬 Supabase 스택 없음 — §9.1).

---

## 목차

1. [사전 분석 — 코드 대 문서 차이, 신규 결함](#1-사전-분석)
2. [설계 원칙과 아키텍처 결정 (AD)](#2-설계-원칙과-아키텍처-결정)
3. [데이터 모델 변경](#3-데이터-모델-변경)
4. [DB 함수 · 트리거 명세](#4-db-함수--트리거-명세)
5. [권한 구현표 (RLS · GRANT · EXECUTE)](#5-권한-구현표)
6. [애플리케이션 계층 설계](#6-애플리케이션-계층-설계)
7. [기능별 상세 설계 (F1~F9)](#7-기능별-상세-설계)
8. [마이그레이션 · 배포 순서](#8-마이그레이션--배포-순서)
9. [검증 계획](#9-검증-계획)
10. [작업 분해와 의존 관계](#10-작업-분해와-의존-관계)
11. [결정 필요 사항](#11-결정-필요-사항)
12. [설계 리스크 · 미확인 목록](#12-설계-리스크--미확인-목록)

---

## 1. 사전 분석

### 1.1 문서가 코드보다 뒤처진 곳 (문서 정정 필요)

| 문서 기록 | 실제 (2026-09-29) | 근거 |
|---|---|---|
| BACKLOG P0-4: `eslint` 오류 2건(`loading.tsx` 의 `Math.random`) | **오류 0, 경고 1** (`chat/[groupSlug]/page.tsx:67` `<img>`). 두 `loading.tsx` 는 고정 폭 배열로 수정됨 | `npx eslint` 실행 ✅ |
| BACKLOG P1-6 / PRD F6-2: 채팅 초기 로드가 "가장 오래된 50개" | `ascending: false` + `limit(50)` + `.reverse()` 로 **이미 최근 50개** | `app/(main)/chat/[groupSlug]/page.tsx:44-52` ✅ |
| BACKLOG P0-2: 미커밋 작업 정리 | 완료 (`913ec74`, `86cfba1`, `ec876bf`) | `git status` clean ✅ |
| 디자인 리뷰 S1: 하단 탭바 5칸(`/groups` 포함) | 작성 당시 PRD F9-5 는 4칸. **2026-09-30 D-16 으로 3칸(홈·그룹·마이) 확정** | PRD §5.1 F9-5, §9 |

### 1.2 신규 발견 결함 (기존 문서에 없음)

| # | 결함 | 위치 | 영향 | 확신 |
|---|---|---|---|---|
| N1 | **오픈 리다이렉트**: `next` 를 검증 없이 `${origin}${next}` 에 붙인다. `next=@evil.com` 이면 `https://<host>@evil.com` 이 되어 URL 파서상 호스트가 `evil.com` 이 된다 | `app/auth/callback/route.ts:7,13` | 로그인 직후 피싱 페이지로 유도 가능 | 코드 ✅ / 브라우저 동작은 URL 표준상 ○ |
| N2 | 댓글·대댓글 폼이 `groupSlug` 를 넘기지 않아 `revalidatePath("/board//<postId>")` 가 된다 | `CommentSection.tsx:40`, `CommentItem.tsx:72-77` → `comment.ts:59` | 작성 후 화면 갱신이 안 될 수 있음. Next 문서에 "매칭 안 되는 경로" 동작 설명 없음 | 코드 ✅ / 증상 ○ |
| N3 | 상세 페이지가 `is_hidden` 이면 무조건 404 → 작성자 본인도 자기 숨김 글을 못 봄 | `[postId]/page.tsx:55` | PRD F2-4 위반 | ✅ |
| N4 | 그룹 조회에 `is_active` 조건 없음 → 비활성 그룹 게시판·글쓰기 접근 가능 | `board/[groupSlug]/page.tsx:49-53`, `new/page.tsx:16-20`, `generateMetadata` 3곳 | PRD F2-6 위반. 채팅은 RPC 가 null 반환해 404 ✅ | ✅ |
| N5 | URL 의 `groupSlug` 와 글의 실제 그룹을 대조하지 않음 → `/board/<아무 slug>/<postId>` 로 같은 글이 열림 | `[postId]/page.tsx:44-53` | 중복 URL(SEO), 잘못된 "목록으로" 링크 | ✅ |
| N6 | 글·댓글 길이 제약이 **DB 에 없음** (채팅만 CHECK 있음). Server Action 검사는 PostgREST 직접 호출로 우회된다 | `0002_community.sql:13-14,33` | 10MB 본문 등 삽입 가능 | ✅ |
| N7 | 댓글 `parent_id` 검증 없음 — 다른 글의 댓글을 부모로 지정하거나 무한 깊이 가능 | `0002`, `0004` comments insert 정책 | F4-2 위반, 트리 렌더 누락 | ✅ |
| N8 | `users.nickname` 을 본인이 PostgREST 로 직접 PATCH 가능(형식·쿨다운 검사 없음) | `0004:44-46` (`grant update (nickname, …)`) | F1-4·F1-5 를 앱에서만 검사하면 우회됨 | ✅ |
| N9 | `updated_at` 을 클라이언트가 임의 값으로 쓸 수 있음 | `0005:25-26,33-34`, `post.ts:83` | "수정됨" 표시(F3-8) 위조 | ✅ |
| N10 | `toggle_*` 경쟁 조건: 동시 2회 호출 시 둘 다 "없음"으로 보고 `+1` 두 번 (insert 는 `on conflict do nothing`) | `0002:93-122` | `like_count` 가 실제 행 수와 어긋남 | ○ (코드 경로상 가능, 재현 안 함) |
| N11 | 쿠키를 처음 발급하는 Server Action(`togglePostLike`, `sendMessage`)은 Next 규칙상 **현재 페이지를 재렌더** → 상세 페이지면 `incrementViewCount` 가 한 번 더 실행 | `reaction.ts:10`, `chat.ts:11`; Next 문서 `07-mutating-data.md:505` | 조회수 이중 증가. D-1=A 로 쿠키 식별을 없애면 사라짐 | 문서 ✅ / 증상 ○ |
| N12 | 로컬에 `.env*` 파일이 없음 | 저장소 루트 `ls -a` | 이 PC 에서 앱 실행 불가(다른 위치 보관 여부 ❓) | ✅ |
| N13 | Sidebar 의 `/groups` 링크 → 404 | `Sidebar.tsx:20` | `/profile` 과 같은 문제 | ✅ |
| N14 | `LoginForm` 이 OAuth 오류를 처리하지 않고, 복귀할 `next` 를 넘기지 않음 | `LoginForm.tsx:19-28` | F1-2 미충족 | ✅ |
| N15 | 대댓글에 답글 버튼이 없음(`!isReply`). F4-2 의 "대댓글에 답하면 같은 부모 아래 + `@닉네임`" 동선이 없음 | `CommentItem.tsx:49` | 기능 누락 | ✅ |
| N16 | 삭제 버튼이 모두에게 보이고, 남의 댓글 삭제 시 0행 삭제인데 성공처럼 끝남 | `CommentItem.tsx:59`, `comment.ts:69-77` | F3-5 와 같은 유형 | ✅ |
| N17 | X 로그인이 `provider: "twitter"`(OAuth 1.0a) — Supabase 문서는 1.0a 를 "will be deprecated" 로 표시하고 OAuth 2.0 공급자 `"x"` 를 권장 | `LoginForm.tsx:7,12` | 공급자 설정도 `x` 기준으로 다시 해야 할 수 있음 | 코드 ✅ / 문서 ✅ ([auth-twitter](https://supabase.com/docs/guides/auth/social-login/auth-twitter)) |

### 1.3 이미 문서에 있고 설계에서 해소할 결함 (요약)

P0-1 근거 전부(`p_session_id` 신뢰, `reactions` public read, 조회수 무제한, 채팅 사칭·도배, `session_id` 노출), P0-5(로그인 후 404, 닉네임 없음), P1-5(소유자 UI, 비로그인 진입, radio `peer`), F4-3(부모 삭제 시 대댓글 cascade), F4-4(숨김 댓글 카운트).

### 1.4 환경 사실

| 항목 | 상태 | 근거 |
|---|---|---|
| Next.js | 16.2.6. `proxy.ts` 는 Node 런타임 고정. `cacheComponents` 기본 꺼짐 → `cookies()` 쓰는 페이지는 동적 렌더 | `node_modules/next/dist/docs` ✅ |
| `refresh()`, `updateTag()`, `after()` | 사용 가능 (`next/cache`, `next/server`) | 동일 ✅ |
| `forbidden()`/`unauthorized()` | `experimental.authInterrupts` 필요 → **쓰지 않는다** 🟡 | 동일 ✅ |
| `supabase.auth.getClaims()` | 설치된 auth-js 에 있음 | `GoTrueClient.d.ts:2356` ✅ |
| Supabase CLI | 2.114.0 설치. `supabase/config.toml` 없음(= `supabase init`·`link` 안 됨) | ✅ |
| Docker | **없음** (bash·PowerShell 모두 `docker` 명령 없음) → `supabase start` 로컬 스택 불가 | ✅ |
| service role key | 코드에서 사용 안 함. **이 설계도 쓰지 않는다** (§2 AD-1) | ✅ |
| Supabase 함수 기본 권한 | `public` 의 함수는 기본적으로 anon·authenticated 가 실행 가능. 제한하려면 `public` **과** 해당 역할 둘 다에서 revoke | [database/functions](https://supabase.com/docs/guides/database/functions) ✅ |
| Supabase 테이블 기본 권한 | 기존 프로젝트는 새 테이블에 anon·authenticated 전체 권한 자동 부여. **2026-10-30 부터 기존 프로젝트에도 "자동 노출 안 함"이 강제 적용**(테이블·시퀀스·함수). 기존 객체의 권한은 유지 | [securing-your-api](https://supabase.com/docs/guides/api/securing-your-api), [discussion #45329](https://github.com/orgs/supabase/discussions/45329) ✅ / 우리 프로젝트가 현재 어느 쪽인지 ❓ |
| Realtime `postgres_changes` | 이벤트마다 구독자 권한으로 RLS 검사. SELECT 권한 없는 컬럼은 payload 에서 **빠진다**(이벤트는 전달). 같은 변경에 구독자 ~3,000 이상이면 Broadcast 권장 | [postgres-changes](https://supabase.com/docs/guides/realtime/postgres-changes) ✅, `realtime.apply_rls` 소스 ✅ |
| 숨김 UPDATE 이벤트 | 갱신 후 행이 SELECT 정책을 통과하지 못하면(`is_hidden = true`) 구독자에게 **전달되지 않음** → 클라이언트가 숨김을 알 수 없다 | Realtime 소스 기반 ○ |
| OAuth Redirect URL | Site URL 과 scheme·host·port 가 같으면 경로·쿼리 무관 허용. 그 외에는 **쿼리 포함 전체 URL** 을 glob 비교, 불일치 시 조용히 Site URL 로 폴백 | [redirect-urls](https://supabase.com/docs/guides/auth/redirect-urls) ✅, auth 소스 `request.go` ✅ |
| Kakao | 이메일(`account_email`)은 비즈 앱 전환 후에만 받을 수 있음. 이메일 없이 받으려면 "Allow users without an email" 설정 | [auth-kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao) ✅ |

---

## 2. 설계 원칙과 아키텍처 결정

### 원칙

1. **DB 가 유일한 방어선.** 브라우저가 anon key 로 PostgREST 를 직접 호출할 수 있으므로(`0004` 주석), 권한·형식·빈도 제한은 RLS·GRANT·CHECK·트리거·security definer 함수로 강제한다. Server Action 의 검사는 UX(빠른 오류 메시지)용이다.
2. **service role key 를 도입하지 않는다.** 특권 작업은 전부 `auth.uid()` 를 스스로 확인하는 security definer 함수로 한다. 서버에 만능 키가 없으면 키 유출 사고 범위도 없다.
3. **신원은 `auth.uid()` 하나.** 쿠키 `session_id`·`sid` 와 자유 입력 닉네임을 폐기한다(D-1=A). 예외는 비로그인 조회수 중복 방지용 `vid` 쿠키 하나이며, 신원 증명으로 쓰지 않는다(AD-7).
4. **쓰기 = 로그인 + 온보딩 완료.** 온보딩은 닉네임, 만 14세 이상 확인, 약관 동의다. 좋아요·스크랩·신고·채팅 등 쓰기 전부에 같은 조건을 적용한다(PRD 권한 매트릭스의 "닉네임 미설정 → ✘"를 좋아요까지 확장 🟡 — 약관 동의 없이 활동 기록을 남기지 않기 위해서).
5. **확장 → 코드 → 축소(expand/contract)** 로 마이그레이션한다. 한 번의 배포에서 구 코드가 새 스키마에 깨지지 않게 한다(§8).

### 아키텍처 결정 (AD)

| ID | 결정 | 대안과 기각 이유 |
|---|---|---|
| AD-1 | 특권 작업은 security definer RPC, service role 미사용 | service role + 서버 전용 경로: 키 관리 부담, Server Action 우회 불가능성을 키 보안에 의존 |
| AD-2 | 온보딩 상태를 `users.onboarded_at` 으로 두고 헬퍼 `can_write()` 를 모든 쓰기 정책·RPC 에서 호출 | 앱에서만 검사: 원칙 1 위반 |
| AD-3 | 닉네임 변경은 RPC 전용, `users` 테이블 UPDATE 권한 전면 회수 | 컬럼 GRANT + CHECK: 30일 쿨다운은 CHECK 로 표현 불가 |
| AD-4 | 빈도 제한(rate limit)은 BEFORE INSERT 트리거 + 사용자별 advisory lock | Server Action 메모리 카운터: Vercel 인스턴스 간 공유 안 됨, 직접 호출 우회. 외부 KV(Upstash 등): 의존성 추가 |
| AD-5 | 채팅 발신자 `author_id`·`nickname` 은 트리거가 `auth.uid()`·`users.nickname` 으로 **덮어쓴다**(스냅샷) | 조회 시 조인: Realtime payload 에 조인 결과가 없어 클라이언트가 추가 조회해야 함 |
| AD-6 | 좋아요 토글은 "delete … 성공 여부로 분기" + 대상 행 `for update` 잠금 | 현재 exists→insert 방식: N10 경쟁 조건 |
| AD-7 | 조회수는 `post_views(post_id, viewer_key)` 로 24시간 중복 제거. 로그인은 `u:<uid>`(함수가 직접 결정), 비로그인은 `s:<vid 쿠키>` | 비로그인 미집계: 베타 초기 조회수가 거의 0. 비로그인 경로는 조작 가능함을 수용 — 조회수는 정렬·보상에 쓰지 않는다 |
| AD-8 | 관리자 판별은 `admins` 테이블 + `private.is_admin()` — D-3 결정 (2026-09-30) | `users.role`: `users` 에 UPDATE 권한이 생기는 순간 실수로 열릴 위험 |
| AD-9 | 신고는 RPC `submit_report` 전용. 신고 시점 **대상 스냅샷**을 저장 | 직접 insert + RLS: 대상 존재·본인 글 여부·자동 숨김 판단을 정책으로 표현하기 어렵고, 작성자가 글을 지우면 증거가 사라짐 |
| AD-10 | 신고자 본인 화면 가림(F7-4)은 보안이 아니라 UX → RLS 가 아닌 **조회 후 표시 단계**에서 "신고한 콘텐츠" 자리표시로 대체 | RLS 로 행 제외: 보안 정책에 UX 규칙이 섞이고, 페이지당 개수가 줄어 페이지네이션이 흔들림 |
| AD-11 | 댓글 삭제는 RPC `delete_comment`: 대댓글이 있으면 tombstone(`deleted_at`, 본문 비움), 없으면 실제 삭제 | cascade 유지: F4-3 위반 |
| AD-12 | Server Action 반환은 판별 유니온 `ActionResult`. 예상 가능한 실패는 throw 하지 않는다 | 현재 `requireUserId` throw → 비로그인 제출 시 error boundary 로 튕김 |
| AD-13 | 인증 게이트 3단: proxy(낙관적 리다이렉트) → 페이지(`getViewer()` 검사) → DB(최종). Next 문서도 proxy 를 "full authorization solution"으로 쓰지 말라고 명시 | proxy 만: Server Action POST 는 matcher 를 피할 수 있음(Next 문서 `proxy.md:215`) |
| AD-14 | DB 타입은 `supabase gen types` 로 생성해 `createClient<Database>()` 에 연결 | 손으로 쓴 `types/database.ts` + `as unknown as` 캐스트 6곳: 스키마 변경을 컴파일러가 못 잡음 |

---

## 3. 데이터 모델 변경

### 3.1 변경 요약

| 테이블 | 변경 | 마이그레이션 |
|---|---|---|
| `users` | + `onboarded_at`, `nickname_changed_at`, `terms_version`. 닉네임 형식 CHECK, `lower(nickname)` 유일 인덱스. UPDATE 권한 전면 회수 | 0006 |
| `admins` (신규) | `user_id` PK | 0006 |
| `reserved_nicknames` (신규) | 금지어 | 0006 |
| `reactions` | − `session_id`, `user_id` NOT NULL, 유일키 `(user_id, target_type, target_id, reaction_type)`. 기존 행 폐기 D-8 결정 | 0007 |
| `post_views` (신규) | 조회수 중복 제거 | 0007 |
| `posts` | 제목·본문 길이 CHECK, `updated_at` 트리거, insert 정책에 활성 그룹·유형·`can_write()` | 0008 |
| `comments` | 길이 CHECK, + `deleted_at`, 부모 검증 트리거, 삭제 RPC 전용 | 0008 |
| `chat_messages` | − `session_id`, 발신자 덮어쓰기·빈도 제한 트리거, insert 는 `room_id, content` 컬럼만 | 0009 |
| `chat_moderation_events` (신규) | 숨김 전파용 (F6-7) | 0009 |
| `reports`, `moderation_actions` (신규) | 신고·감사 로그 | 0010 |
| `idol_groups` | 관리자 insert/update 정책, `slug` UPDATE 불가. + `color_key text not null default 'baby' check (color_key in (…24개 key…))` — 그룹 색 파스텔 팔레트(`docs/design/TOKENS.md` §3.2, key 원본 `docs/design/tokens/presets.json`, D-18). 관리자 insert/update 컬럼 GRANT 에 포함 | 0010 |
| 인덱스 | `posts(idol_group_id, created_at desc)`, `chat_messages(author_id, created_at desc)`, `comments(author_id, created_at desc)`, `reports(status, created_at)` | 각 단계 |

### 3.2 DDL 초안

#### 0006 — 온보딩·관리자 기반

```sql
-- 사전 점검 (적용 전 수동 실행): 형식 위반·대소문자 중복 닉네임이 있으면 먼저 정리
--   select nickname from public.users where nickname !~ '^[가-힣A-Za-z0-9_]{2,20}$';
--   select lower(nickname), count(*) from public.users where nickname is not null group by 1 having count(*) > 1;

alter table public.users
  add column onboarded_at        timestamptz,
  add column nickname_changed_at timestamptz,
  add column terms_version       text;

alter table public.users
  add constraint users_nickname_format
  check (nickname is null or nickname ~ '^[가-힣A-Za-z0-9_]{2,20}$');   -- D-11 결정

create unique index users_nickname_lower_key on public.users (lower(nickname));
alter table public.users drop constraint if exists users_nickname_key;  -- 0001 의 unique (이름은 기본 명명 규칙 ○)

-- 프로필 수정 경로를 RPC 로 일원화 (AD-3). avatar_url/bio 편집 UI 는 2단계.
revoke update on public.users from anon, authenticated;

create table public.reserved_nicknames (word text primary key check (word = lower(word)));
revoke all on public.reserved_nicknames from anon, authenticated;
insert into public.reserved_nicknames values
  ('admin'), ('administrator'), ('운영자'), ('관리자'), ('idoluniv'), ('아이돌유니브'), ('system'), ('익명'), ('탈퇴한사용자');

-- RLS·트리거 전용 헬퍼를 둘 비노출 스키마 (§4.1)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.admins (
  user_id    uuid primary key references public.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;   -- 정책 없음 = 클라이언트 접근 불가
revoke all on public.admins from anon, authenticated;
-- 관리자 지정은 SQL 에디터에서만: insert into public.admins (user_id) values ('<uuid>');
```

#### 0007 — 반응·조회수

```sql
-- D-8 결정: 쿠키 기반 반응은 로그인 사용자로 이관할 수 없다(연결 정보 없음). 폐기 후 카운터 재계산.
delete from public.reactions;
update public.posts    set like_count = 0;
update public.comments set like_count = 0;

drop policy if exists "reactions: public read" on public.reactions;
drop index  if exists public.idx_reactions_session;
alter table public.reactions drop column session_id;          -- 기존 unique 제약도 함께 삭제됨 ○
alter table public.reactions alter column user_id set not null;
alter table public.reactions add constraint reactions_user_target_key
  unique (user_id, target_type, target_id, reaction_type);

create policy "reactions: select own" on public.reactions
  for select to authenticated using (user_id = (select auth.uid()));
revoke all    on public.reactions from anon, authenticated;
grant  select on public.reactions to authenticated;

create table public.post_views (
  post_id    uuid not null references public.posts(id) on delete cascade,
  viewer_key text not null,          -- 'u:<uuid>' | 's:<uuid>'
  viewed_at  timestamptz not null default now(),
  primary key (post_id, viewer_key)
);
alter table public.post_views enable row level security;
revoke all on public.post_views from anon, authenticated;
```

#### 0008 — 게시글·댓글 무결성

```sql
-- 기존 데이터가 위반하면 validate 에서 실패한다 → not valid 로 먼저 걸고 점검 후 validate
alter table public.posts
  add constraint posts_title_len   check (char_length(title)   between 1 and 100)   not valid,
  add constraint posts_content_len check (char_length(content) between 1 and 10000) not valid;  -- 🟡 PRD F3-2
alter table public.posts validate constraint posts_title_len;
alter table public.posts validate constraint posts_content_len;

alter table public.comments add column deleted_at timestamptz;
alter table public.comments
  add constraint comments_content_len
  check (deleted_at is not null or char_length(content) between 1 and 1000) not valid;
alter table public.comments validate constraint comments_content_len;

-- updated_at 은 서버가 정한다 (N9). 카운터 갱신이 updated_at 을 바꾸지 않도록 "update of <컬럼>" 으로 한정
revoke update on public.posts    from anon, authenticated;
grant  update (title, content, post_type) on public.posts to authenticated;
revoke update on public.comments from anon, authenticated;
grant  update (content) on public.comments to authenticated;
revoke delete on public.comments from anon, authenticated;       -- delete_comment RPC 전용 (AD-11)

create index idx_posts_group_created    on public.posts (idol_group_id, created_at desc);
create index idx_comments_author_created on public.comments (author_id, created_at desc);
create index idx_posts_author_created    on public.posts (author_id, created_at desc);
```

#### 0009 — 채팅

```sql
alter table public.chat_messages drop column session_id;
create index idx_chat_messages_author_created on public.chat_messages (author_id, created_at desc);

drop policy if exists "chat_messages: insert" on public.chat_messages;
create policy "chat_messages: insert own" on public.chat_messages
  for insert to authenticated
  with check (author_id = (select auth.uid()) and not is_hidden);
-- WITH CHECK 는 BEFORE 트리거 이후에 평가된다 ○(Postgres 문서 기준, 실행 확인 필요)

revoke insert on public.chat_messages from anon, authenticated;
grant  insert (room_id, content) on public.chat_messages to authenticated;

drop policy if exists "chat_messages: public read" on public.chat_messages;
create policy "chat_messages: read" on public.chat_messages
  for select using (not is_hidden or (select private.is_admin()));

create table public.chat_moderation_events (
  id         bigint generated always as identity primary key,
  room_id    uuid not null references public.chat_rooms(id) on delete cascade,
  message_id uuid not null,
  action     text not null check (action in ('hide', 'unhide')),
  created_at timestamptz not null default now()
);
alter table public.chat_moderation_events enable row level security;
create policy "chat_moderation_events: public read" on public.chat_moderation_events for select using (true);
revoke all    on public.chat_moderation_events from anon, authenticated;
grant  select on public.chat_moderation_events to anon, authenticated;
-- Realtime 전파 방식은 §7.6 참고 (postgres_changes vs broadcast — Supabase 확인 결과에 따라 확정)
```

#### 0010 — 신고·모더레이션

```sql
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.users(id) on delete cascade,
  target_type     text not null check (target_type in ('post', 'comment', 'chat_message')),
  target_id       uuid not null,
  target_author_id uuid,                        -- 스냅샷 시점 작성자 (2단계 제재용)
  reason          text not null check (reason in
                    ('spam','abuse','privacy','sexual','rumor','copyright','impersonation','other')),
  detail          text check (char_length(detail) <= 300),
  snapshot        jsonb not null,               -- {title?, content, author_nickname, created_at}
  status          text not null default 'open' check (status in ('open','actioned','dismissed')),
  handled_by      uuid references public.users(id) on delete set null,
  handled_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index idx_reports_open   on public.reports (status, created_at) where status = 'open';
create index idx_reports_target on public.reports (target_type, target_id);

alter table public.reports enable row level security;
create policy "reports: select own or admin" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
revoke all    on public.reports from anon, authenticated;
grant  select on public.reports to authenticated;       -- insert/update 는 RPC 전용

create table public.moderation_actions (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.users(id) on delete set null,  -- null = 시스템(자동 숨김)
  action      text not null check (action in ('hide','unhide','auto_hide')),
  target_type text not null,
  target_id   uuid not null,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.moderation_actions enable row level security;
create policy "moderation_actions: admin read" on public.moderation_actions
  for select to authenticated using ((select private.is_admin()));
revoke all    on public.moderation_actions from anon, authenticated;
grant  select on public.moderation_actions to authenticated;

-- 그룹 관리 (F8-4): 관리자만, slug 는 생성 후 변경 불가
create policy "idol_groups: admin insert" on public.idol_groups
  for insert to authenticated with check ((select private.is_admin()));
create policy "idol_groups: admin update" on public.idol_groups
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
revoke insert, update, delete on public.idol_groups from anon, authenticated;
grant  insert (name, name_ko, slug, agency, debut_date, cover_url, description, is_active)
  on public.idol_groups to authenticated;
grant  update (name, name_ko, agency, debut_date, cover_url, description, is_active)
  on public.idol_groups to authenticated;
```

#### 0011 — 출시 그룹 시드 (D-10, 2026-09-30)

클로즈드 베타는 **5개 그룹으로 시작**한다(소수 집중 — 베타 20~50명 규모에서 게시판이 비어 보이지 않게). 목록은 목업 예시 5개. 추가·비활성화는 출시 후 `/admin/groups` 에서.

| slug (변경 불가) | name | name_ko | color_key 🟡 | agency | debut_date ○ | 비고 |
|---|---|---|---|---|---|---|
| `blackpink` | BLACKPINK | 블랙핑크 | `pink` | YG엔터테인먼트 | 2016-08-08 | 2026-02 완전체 앨범 *Deadline* ([Wikipedia](https://en.wikipedia.org/wiki/Blackpink)) |
| `newjeans` | NewJeans | 뉴진스 | `sky` | 어도어 | 2022-07-22 | 2025 "NJZ" 독자 활동 → 법원이 어도어 측 인정 → 2026 어도어 소속 4인 컴백 신호 ([Billboard Korea](https://www.billboard.co.kr/editorial/news/article/newjeans-2/), [allkpop](https://www.allkpop.com/video/2026/07/newjeans-present-2026-summer-of-newjeans-signaling-a-long-awaited-comeback)). **표기는 NewJeans**. 멤버 거취 논쟁이 게시판·라운지로 번질 수 있어 모더레이션 주의 ○ |
| `seventeen` | SEVENTEEN | 세븐틴 | `peach` | 플레디스엔터테인먼트 | 2015-05-26 | 2026 현황 미확인 ❓ |
| `ive` | IVE | 아이브 | `lilac` | 스타쉽엔터테인먼트 | 2021-12-01 | 2026 정규 2집 *Revive+* ([Wikipedia](https://en.wikipedia.org/wiki/Ive_(group))) |
| `aespa` | aespa | 에스파 | `mint` | SM엔터테인먼트 | 2020-11-17 | 표기는 소문자 `aespa` |

- `description` 은 `"{agency} · {데뷔 연도}년 데뷔"` 형식만 쓴다. 멤버 수·근황처럼 자주 바뀌는 정보는 넣지 않는다(관리 부담·오류 위험).
- `color_key` 는 5개가 서로 다른 계열이 되게 고른 **제안값**이다. 팬덤 공식색 재현이 아니며(TOKENS §3.2) 관리자 화면에서 바꿀 수 있다.
- 로고·공식 사진(`cover_url`)은 넣지 않는다(D-22). `cover_url` 은 null.
- 데뷔일은 알려진 날짜를 옮겼고 이번에 출처로 재확인하지 않았다 ○ → 시드 작성 시(T10) 확인.
- 소속사·활동명은 2026-09-30 웹 검색 기준(2차 출처) ○. 시드 적용 직전에 한 번 더 확인한다.
- 초안 SQL:

```sql
insert into public.idol_groups (slug, name, name_ko, color_key, agency, debut_date, description, is_active) values
  ('blackpink', 'BLACKPINK', '블랙핑크', 'pink',  'YG엔터테인먼트',       '2016-08-08', 'YG엔터테인먼트 · 2016년 데뷔', true),
  ('newjeans',  'NewJeans',  '뉴진스',   'sky',   '어도어',              '2022-07-22', '어도어 · 2022년 데뷔', true),
  ('seventeen', 'SEVENTEEN', '세븐틴',   'peach', '플레디스엔터테인먼트', '2015-05-26', '플레디스엔터테인먼트 · 2015년 데뷔', true),
  ('ive',       'IVE',       '아이브',   'lilac', '스타쉽엔터테인먼트',   '2021-12-01', '스타쉽엔터테인먼트 · 2021년 데뷔', true),
  ('aespa',     'aespa',     '에스파',   'mint',  'SM엔터테인먼트',       '2020-11-17', 'SM엔터테인먼트 · 2020년 데뷔', true)
on conflict (slug) do nothing;
```

- 원격 DB 에 이미 그룹 행이 있을 수 있다 ❓(T0 에서 확인). 같은 slug 가 있으면 `do nothing` 이라 기존 값이 남으므로, T0 결과를 보고 필요하면 `update` 로 맞춘다.

---

## 4. DB 함수 · 트리거 명세

### 4.1 공통 규약

- **스키마 분리**: API 로 부를 RPC 만 `public` 에 둔다. RLS·트리거에서만 쓰는 헬퍼(`is_admin`, `can_write`, `raise_if_cannot_write`, 트리거 함수)는 **노출되지 않는 `private` 스키마**에 둔다. Supabase 문서가 security definer 함수를 노출 스키마에 두지 말라고 권고하기 때문이다([database/functions](https://supabase.com/docs/guides/database/functions) ✅). `public` 의 RPC 는 API 로 노출되는 것이 목적이므로 예외이며, 대신 첫 줄에서 `auth.uid()` 와 권한을 검사한다.
  - RLS 정책은 호출자 권한으로 평가되므로 `grant usage on schema private to anon, authenticated` + 헬퍼별 `grant execute` 가 필요하다. `private` 는 PostgREST 노출 스키마 목록에 없으므로 API 로는 호출되지 않는다 ○(대시보드의 Exposed schemas 설정 확인).
- 모든 함수: `security definer set search_path = ''` 로 하고 객체 이름을 전부 스키마로 한정한다(`public.posts`). Supabase 권장값이다 ✅. 기존 함수(`search_path = public`)는 이번에 교체하는 것부터 바꾼다.
- 생성 직후 `revoke execute on function … from public, anon, authenticated;` 후 필요한 역할에만 `grant execute`. Supabase 는 `public` 과 대상 역할 **둘 다**에서 회수하라고 명시한다 ✅.
- 새 테이블·함수는 **항상 명시적으로 revoke → grant** 한다. 2026-10-30 이전에는 자동 부여를 막기 위해(보안), 이후에는 자동 부여가 없어져 기능이 깨지지 않게 하기 위해서다. 두 경우 모두 같은 SQL 로 결과가 같다.
- `supabase init` 후 `config.toml` 에 `auto_expose_new_tables = false` 를 둬서 로컬 동작을 새 기본값에 맞춘다(CLI 2.102.0+ ✅).
- 시그니처를 바꿀 때는 `create or replace` 가 **새 오버로드를 만든다**. 구 시그니처는 반드시 `drop function name(구 인자 타입)` 으로 지운다. (예: `toggle_post_like(uuid, uuid)` 를 남기면 구멍이 그대로 남는다.)
- 오류는 `raise exception '<CODE>' using errcode = 'P0001'` 로 던진다. PostgREST 응답의 `message` 에 `<CODE>` 가 실리고, 앱은 코드 → 한국어 문구로 바꾼다(§6.3). ○ (PostgREST 오류 형식은 구현 시 1회 확인)
- RLS 안에서 `auth.uid()`·`is_admin()` 은 `(select …)` 로 감싸 행마다 재평가하지 않게 한다 ○.

### 4.2 헬퍼

| 함수 (`private` 스키마) | 반환 | 동작 | EXECUTE |
|---|---|---|---|
| `private.is_admin()` | boolean, stable | `exists(select 1 from public.admins where user_id = auth.uid())` | anon, authenticated (RLS 안에서 호출되므로) |
| `private.can_write()` | boolean, stable | `auth.uid()` 가 있고 `users.onboarded_at is not null and nickname is not null`. 2단계 제재(쓰기 정지)가 생기면 여기에 조건 추가 | authenticated |
| `private.raise_if_cannot_write()` | void | `auth.uid()` null → `AUTH_REQUIRED`, 온보딩 미완료 → `ONBOARDING_REQUIRED` | 없음 (definer 함수·트리거 안에서만 호출) |

`private` 은 API 로 부를 수 없으므로, 앱이 현재 사용자 상태를 알기 위한 공개 RPC 를 하나 둔다: `public.get_viewer()` → `(id, nickname, onboarded bool, is_admin bool, nickname_changed_at)`. 본인 정보만 돌려주므로 노출해도 무방하다.

### 4.3 RPC 목록

| 함수 | 인자 → 반환 | 권한 검사 | 동작 요점 | 오류 코드 | EXECUTE |
|---|---|---|---|---|---|
| `get_viewer` | `()` → 1행 `(id, nickname, onboarded, is_admin, nickname_changed_at)` | uid 없으면 0행 | 본인 상태만 반환 | — | authenticated |
| `complete_onboarding` | `(p_nickname text, p_age_over_14 bool, p_agree_terms bool, p_terms_version text)` → void | uid 필요 | 둘 다 true 아니면 거부. 닉네임 검증 후 `nickname`, `onboarded_at = coalesce(onboarded_at, now())`, `nickname_changed_at = now()`, `terms_version` 기록 | `AUTH_REQUIRED` `CONSENT_REQUIRED` `NICKNAME_INVALID` `NICKNAME_RESERVED` `NICKNAME_TAKEN` | authenticated |
| `change_nickname` | `(p_nickname text)` → timestamptz(다음 변경 가능 시각) | `can_write` | `nickname_changed_at > now() - 30일` 이면 거부 🟡 F1-5 | 위 + `NICKNAME_COOLDOWN` | authenticated |
| `toggle_post_like` | `(p_post_id uuid)` → `table(liked bool, like_count int)` | `can_write` | 대상 `posts` 행을 `not is_hidden` 조건으로 `for update` 잠금 → 없으면 `NOT_FOUND`. `delete … returning` 이 행을 지웠으면 −1, 아니면 insert 후 +1. 갱신 후 카운트 반환(현재의 추가 select 제거) | `AUTH_REQUIRED` `ONBOARDING_REQUIRED` `NOT_FOUND` | authenticated |
| `toggle_post_scrap` | `(p_post_id uuid)` → bool | 동일 | 카운터 없음 | 동일 | authenticated |
| `toggle_comment_like` | `(p_comment_id uuid)` → `table(liked, like_count)` | 동일 | UI 는 P2. 함수는 구 시그니처 제거와 함께 같이 바꾼다 | 동일 | authenticated |
| `record_post_view` | `(p_post_id uuid, p_anon_key uuid default null)` → void | 없음 | viewer_key = uid 있으면 `u:<uid>` (인자 무시), 없으면 `s:<p_anon_key>`, 둘 다 없으면 종료. `insert … on conflict (post_id, viewer_key) do update set viewed_at = now() where post_views.viewed_at < now() - interval '24 hours'` 가 행을 반환했을 때만 `view_count + 1`. 숨김 글이면 무시 | — | anon, authenticated |
| `delete_comment` | `(p_comment_id uuid)` → text(`'deleted'｜'tombstoned'`) | 작성자 본인 | 자식 존재 → `deleted_at = now(), content = ''`. 없으면 실제 삭제. 부모가 tombstone 이고 이 삭제로 자식이 0 이 되면 부모도 삭제 | `AUTH_REQUIRED` `NOT_FOUND` `FORBIDDEN` | authenticated |
| `submit_report` | `(p_target_type text, p_target_id uuid, p_reason text, p_detail text)` → uuid | `can_write` | ① 대상 조회(definer 라 RLS 무시) — 없거나 이미 숨김이면 `NOT_FOUND` ② 본인 콘텐츠면 `CANNOT_REPORT_OWN` ③ 빈도 제한 10분 10건 🟡 ④ 스냅샷과 함께 insert, 유일키 위반 → `ALREADY_REPORTED` ⑤ `open` 신고의 서로 다른 신고자 수 ≥ 임계값(D-4 결정, 기본 3)이면 `is_hidden = true` + `moderation_actions('auto_hide', actor null)` + 채팅이면 숨김 이벤트 | 위 + `RATE_LIMITED` | authenticated |
| `admin_moderate` | `(p_target_type text, p_target_id uuid, p_action text, p_note text)` → void | `is_admin` | `hide`: `is_hidden = true`, 해당 대상 `open` 신고 → `actioned`. `unhide`: `is_hidden = false`, `open` 신고 → `dismissed`. 신고 없이도 실행 가능(발견 즉시 숨김, PRD 6.1). 감사 로그 기록. 채팅이면 이벤트 | `FORBIDDEN` `NOT_FOUND` `INVALID_ACTION` | authenticated |
| `admin_dismiss_reports` | `(p_target_type, p_target_id, p_note)` → int(처리 건수) | `is_admin` | 대상은 그대로 두고 `open` 신고만 `dismissed` | `FORBIDDEN` | authenticated |
| `admin_report_queue` | `(p_status text default 'open', p_limit int, p_offset int)` → table | `is_admin` | 대상별 묶음: `target_type, target_id, open_count, reasons text[], urgent bool(privacy·sexual 포함), first_at, last_at, is_hidden, latest_snapshot`. 정렬: urgent desc, first_at asc | `FORBIDDEN` | authenticated |
| `get_or_create_chat_room` | 기존 유지 | — | 변경 없음. EXECUTE 는 명시적으로 anon, authenticated 만 (현재도 grant 있음 ✅) | — | anon, authenticated |

**삭제 대상**: `toggle_post_like(uuid, uuid)`, `toggle_post_scrap(uuid, uuid)`, `toggle_comment_like(uuid, uuid)`, `increment_view_count(uuid)`.

### 4.4 트리거

| 트리거 | 테이블 · 시점 | 동작 | 오류 |
|---|---|---|---|
| `posts_set_updated_at` | posts BEFORE UPDATE OF title, content, post_type | `new.updated_at = now()` | — |
| `comments_set_updated_at` | comments BEFORE UPDATE OF content | 동일 | — |
| `comments_before_insert` | comments BEFORE INSERT | ① `raise_if_cannot_write()` ② 글이 존재·비숨김인지 ③ `parent_id` 가 있으면 같은 `post_id` 이고 그 부모의 `parent_id is null`, 부모가 tombstone 이 아닌지 ④ 빈도 제한 1분 10건 🟡 | `POST_NOT_FOUND` `INVALID_PARENT` `RATE_LIMITED` |
| `posts_before_insert` | posts BEFORE INSERT | ① `raise_if_cannot_write()` ② 빈도 제한 10분 5건 🟡 | `RATE_LIMITED` |
| `sync_comment_count` (교체) | comments AFTER INSERT/DELETE/UPDATE OF is_hidden, deleted_at | "보이는 댓글"(`not is_hidden and deleted_at is null`) 수의 증감만 반영. 마이그레이션에서 전체 1회 재계산 | — |
| `chat_messages_before_insert` | chat_messages BEFORE INSERT | ① `new.author_id := auth.uid()`, `new.nickname := users.nickname` (온보딩 안 됐으면 오류) ② 방이 존재하고 그룹이 활성인지 ③ `pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0))` 로 사용자별 직렬화 ④ 최근 10초 5건 이상 → 거부 🟡 F6-5 ⑤ 같은 방 직전 2건이 모두 같은 내용 → 거부 | `AUTH_REQUIRED` `ONBOARDING_REQUIRED` `ROOM_NOT_FOUND` `RATE_LIMITED` `DUPLICATE_MESSAGE` |

빈도 제한 수치는 전부 🟡 이며, 함수 상단 상수로 모아 조정하기 쉽게 한다.

---

## 5. 권한 구현표

PRD §5.2 권한 매트릭스를 DB 객체 단위로 옮긴 표다. "RPC" 는 security definer 함수 경유만 가능하다는 뜻이다.

| 객체 | anon SELECT | authenticated SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `users` | 공개 컬럼(`id, nickname, avatar_url, bio, created_at, updated_at`) — 기존 ✅. 새 컬럼(`onboarded_at` 등)은 grant 하지 않음 → 본인도 `get_viewer()` 로만 | 동일 | 트리거 전담 | **없음** (RPC) | 없음 |
| `admins` | ✘ | ✘ | SQL 에디터 | SQL 에디터 | SQL 에디터 |
| `idol_groups` | 전체 | 전체 | 관리자 (RLS) | 관리자, `slug` 제외 | ✘ (비활성화로 대체) |
| `posts` | `not is_hidden` | `not is_hidden or 작성자 or 관리자` | `can_write` + 본인 + 활성 그룹 + 유형 `text/fanfic` | 작성자, `title/content/post_type` | 작성자 |
| `comments` | `not is_hidden` | `not is_hidden or 작성자 or 관리자` | `can_write`(트리거) + 본인 | 작성자, `content` | RPC |
| `reactions` | ✘ | 본인 행만 | RPC | ✘ | RPC |
| `post_views` | ✘ | ✘ | RPC | RPC | ✘ |
| `chat_rooms` | 전체 | 전체 | RPC | ✘ | ✘ |
| `chat_messages` | `not is_hidden` | `not is_hidden or 관리자` | `can_write`(트리거) + `room_id, content` 만 | ✘ | ✘ |
| `chat_moderation_events` | 전체 | 전체 | RPC | ✘ | ✘ |
| `reports` | ✘ | 본인 신고 + 관리자 전체 | RPC | RPC | ✘ |
| `moderation_actions` | ✘ | 관리자 | RPC | ✘ | ✘ |
| `fan_profiles` | 기존 유지(`select own`) | 기존 유지 | 트리거 | `favorite_group` — 기존 ✅ | ✘ |

`posts` insert 정책 초안:

```sql
drop policy if exists "posts: insert own" on public.posts;
create policy "posts: insert own" on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.can_write())
    and post_type in ('text', 'fanfic')
    and exists (select 1 from public.idol_groups g where g.id = idol_group_id and g.is_active)
  );
```

select 정책은 `using (not is_hidden or author_id = (select auth.uid()) or (select private.is_admin()))` 로 posts·comments 모두 교체한다.

---

## 6. 애플리케이션 계층 설계

### 6.1 새 공통 모듈

| 파일 | 내용 |
|---|---|
| `lib/supabase/server.ts` | `createClient<Database>()` 로 타입 연결 (AD-14) |
| `types/supabase.ts` | `supabase gen types typescript --linked` 출력. 기존 `types/database.ts` 는 도메인 별칭만 남긴다 |
| `lib/viewer.ts` | `getViewer = cache(async () => …)` → `{ id, nickname, onboarded, isAdmin, nicknameChangedAt } \| null`. React `cache()` 로 요청당 1회. `auth.getUser()` 후 `rpc("get_viewer")` 1회 |
| `lib/limits.ts` | `LIMITS = { title: 100, content: 10000, comment: 1000, chat: 500, reportDetail: 300, nickname: { min: 2, max: 20, pattern } }`. 폼 `maxLength` 와 Server Action 이 같은 값을 쓴다. DB CHECK 와 수치를 맞춘다 |
| `lib/safe-next.ts` | `safeNext(raw): string` — `/` 로 시작하고 `//`·`/\` 로 시작하지 않으며 제어문자가 없을 때만 통과, 아니면 `/` (N1) |
| `lib/action-result.ts` | `ActionResult<T>`, `ErrorCode`, `fromDbError(error)` (§6.3) |
| `lib/nav.ts` | `navItems` 공용(Sidebar·BottomTabBar). `/groups` 제거 (N13) |

### 6.2 Server Action 계약

모든 액션은 `ActionResult` 를 반환한다. 성공 후 화면 갱신은 같은 화면에 머무는 변경이면 `refresh()`, 다른 화면으로 가면 `redirect()`(이 경우 반환 없음)로 통일한다. `revalidatePath` 에 클라이언트가 보낸 slug 를 쓰지 않는다(N2).

| 파일 · 액션 | 입력 | 성공 | 주요 실패 코드 | 비고 |
|---|---|---|---|---|
| `auth.ts` `completeOnboarding` | form: nickname, age14, terms, next | `redirect(safeNext(next))` | `NICKNAME_*`, `CONSENT_REQUIRED` | 신규 |
| `auth.ts` `changeNickname` | form: nickname | `{ nextChangeAt }` + `refresh()` | `NICKNAME_*`, `NICKNAME_COOLDOWN` | 신규 |
| `post.ts` `createPost` | form: groupSlug, title, content, post_type | `redirect(상세)` | `AUTH_REQUIRED`, `ONBOARDING_REQUIRED`, `VALIDATION`, `RATE_LIMITED`, `GROUP_NOT_FOUND` | `requireUserId` throw 제거 |
| `post.ts` `updatePost` | form: postId, title, content, post_type | `redirect(상세)` | + `NOT_FOUND_OR_FORBIDDEN` | `.select("id")` 로 0행이면 실패 (F3-5). slug 는 DB 에서 조회 |
| `post.ts` `deletePost` | postId | `redirect(목록)` | 동일 | 0행 검사 |
| `comment.ts` `createComment` | form: postId, parentId?, content | `refresh()` | `POST_NOT_FOUND`, `INVALID_PARENT`, `RATE_LIMITED` | groupSlug 인자 제거 |
| `comment.ts` `deleteComment` | commentId | `refresh()` | `FORBIDDEN`, `NOT_FOUND` | RPC 호출 |
| `reaction.ts` `togglePostLike` | postId | `{ liked, likeCount }` | `AUTH_REQUIRED`, `ONBOARDING_REQUIRED`, `NOT_FOUND` | 쿠키 코드 전부 삭제 |
| `reaction.ts` `togglePostScrap` | postId | `{ scrapped }` | 동일 | |
| `chat.ts` `sendMessage` | roomId, content | `{}` (Realtime 으로 표시) | `RATE_LIMITED`, `DUPLICATE_MESSAGE`, `ROOM_NOT_FOUND` | nickname·쿠키 제거 |
| `report.ts` `submitReport` | targetType, targetId, reason, detail? | `{ reportId }` | `ALREADY_REPORTED`, `CANNOT_REPORT_OWN`, `RATE_LIMITED`, `NOT_FOUND` | 신규 |
| `admin.ts` `moderate` / `dismissReports` / `upsertGroup` / `setGroupActive` | … | `refresh()` | `FORBIDDEN`, `VALIDATION`, `SLUG_TAKEN` | 신규. 액션 안에서도 `getViewer().isAdmin` 선검사(UX), 최종은 DB |

조회수는 액션이 아니다. 상세 페이지 서버 컴포넌트가 렌더 중 `vid` 쿠키를 읽고 `after(() => supabase.rpc("record_post_view", …))` 로 응답 후 실행한다. `after` 콜백 안에서는 `cookies()` 를 부를 수 없으므로 값을 미리 읽어 클로저로 넘긴다(Next 문서 `after.md:166` ✅).

### 6.3 오류 코드 → UI 동작

| 코드 | 문구 (🟡) | UI 동작 |
|---|---|---|
| `AUTH_REQUIRED` | 로그인이 필요해요 | `/login?next=<현재 경로>` 로 이동 |
| `ONBOARDING_REQUIRED` | 닉네임을 먼저 정해 주세요 | `/onboarding?next=<현재 경로>` 로 이동 |
| `VALIDATION` | 필드별 메시지 | 폼 인라인 |
| `NICKNAME_INVALID` / `_RESERVED` / `_TAKEN` / `_COOLDOWN` | 형식 안내 / 사용할 수 없는 닉네임 / 이미 사용 중 / N일 후 변경 가능 | 폼 인라인 |
| `RATE_LIMITED` | 잠시 후 다시 시도해 주세요 | 토스트(sonner). 채팅은 입력창 아래 |
| `DUPLICATE_MESSAGE` | 같은 메시지를 연속으로 보낼 수 없어요 | 채팅 입력창 아래 |
| `NOT_FOUND` / `POST_NOT_FOUND` / `NOT_FOUND_OR_FORBIDDEN` | 삭제되었거나 권한이 없어요 | 토스트 + `refresh()` |
| `ALREADY_REPORTED` | 이미 신고한 콘텐츠예요 | 신고 시트 닫고 토스트 |
| `CANNOT_REPORT_OWN` | 내 글은 신고할 수 없어요 | 진입점 자체를 숨기므로 방어용 |
| `FORBIDDEN` | 권한이 없어요 | 토스트 |
| 그 외 / 네트워크 | 문제가 생겼어요. 다시 시도해 주세요 | 토스트. 원본 오류는 서버 로그(`console.error`)로만 |

`fromDbError`: PostgREST 오류의 `message` 가 알려진 코드면 그대로, `code === "23505"` 는 문맥별(닉네임 → `NICKNAME_TAKEN`, 신고 → `ALREADY_REPORTED`), `42501`(권한)·RLS 위반은 `FORBIDDEN`, 나머지는 `UNKNOWN`.

### 6.4 인증 게이트

| 단계 | 대상 | 동작 |
|---|---|---|
| proxy (`lib/supabase/middleware.ts`) | `^/me`, `^/onboarding`, `^/admin`, `^/g/[^/]+/write$`, `^/g/[^/]+/posts/[^/]+/edit$` | 세션 없으면 `/login?next=<경로+쿼리>` 로 리다이렉트. 추가로 `vid` 쿠키가 없으면 발급(httpOnly, 1년, `sameSite=lax`) |
| 페이지 | 위 경로 + 쓰기 UI | `getViewer()` 로 재확인. 온보딩 미완료면 `/onboarding?next=`. `/admin` 은 `isAdmin` 아니면 `notFound()`(존재 은닉). 수정 페이지는 작성자가 아니면 상세로 `redirect` |
| DB | 전부 | §5 |

proxy 는 요청마다 `getUser()`(Auth 서버 왕복)를 호출한다. `getClaims()` 로 바꾸면 JWT 로컬 검증으로 왕복을 줄일 수 있으나, 프로젝트가 비대칭 서명 키를 쓰는지 ❓ — 성능 문제가 관측되면 검토(P2).

---

### 6.5 라우트 (D-16 그룹 중심, 2026-09-30)

| 새 경로 | 화면 | 현재 파일 → 이전 위치 ○ |
|---|---|---|
| `/` | 홈 | `app/(main)/page.tsx` |
| `/g` | 그룹 목록 (최근 방문 + 전체) | `app/(main)/board/page.tsx`·`chat/page.tsx` 통합 → `app/(main)/g/page.tsx` |
| `/g/[slug]` | 그룹 공간 · 게시판 탭 | `board/[groupSlug]/page.tsx` → `g/[slug]/page.tsx` |
| `/g/[slug]/lounge` | 그룹 공간 · 라운지 탭 | `chat/[groupSlug]/page.tsx` → `g/[slug]/lounge/page.tsx` |
| `/g/[slug]/write` | 글쓰기 | `board/[groupSlug]/new` → `g/[slug]/write` |
| `/g/[slug]/posts/[id]` | 상세 | `board/[groupSlug]/[postId]` → `g/[slug]/posts/[id]` |
| `/g/[slug]/posts/[id]/edit` | 수정 | `…/[postId]/edit` → `g/[slug]/posts/[id]/edit` |
| `/me` | 마이 | 신규 |

- 그룹 공간 공통 요소(헤더 띠, 게시판/라운지 탭, `data-group-color`)는 **`app/(main)/g/[slug]/layout.tsx`** 에 둔다. 그룹 조회(`getActiveGroupBySlug`, §7.2)도 여기서 한 번 하고 `notFound()` 처리. 라운지는 입력창을 바닥에 붙이기 위해 하단 탭바를 숨긴다(목업 03).
- 옛 경로는 `next.config.ts` 의 `redirects()` 로 **영구(308)** 리다이렉트한다(Next 16 문서 `redirects.md` ✅): `/board` → `/g`, `/board/:slug` → `/g/:slug`, `/board/:slug/new` → `/g/:slug/write`, `/board/:slug/:id/edit` → `/g/:slug/posts/:id/edit`, `/board/:slug/:id` → `/g/:slug/posts/:id`, `/chat` → `/g`, `/chat/:slug` → `/g/:slug/lounge`, `/profile` → `/me`. 공개 전이라 외부 링크는 거의 없겠지만 ❓, 비용이 작아 둔다.
- `auth/callback` 의 기본 `next` 는 `/` 유지(F1-2).

## 7. 기능별 상세 설계

### 7.1 F1 인증 · 닉네임 · 온보딩

**흐름**

```
[쓰기 시도 / 로그인 버튼]
   └─ /login?next=/g/haru/write
        └─ signInWithOAuth({ provider, options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` } })
             └─ /auth/callback?code=…&next=…
                  ├─ exchangeCodeForSession 실패 → /login?error=auth_callback_failed
                  └─ 성공 → rpc("get_viewer") (onboarded_at 은 공개 컬럼 GRANT 에 없으므로 테이블 직접 조회 불가)
                        ├─ null → /onboarding?next=<safeNext>
                        └─ 있음 → <safeNext>
/onboarding
   └─ 닉네임 + [만 14세 이상입니다] + [이용약관·개인정보처리방침에 동의합니다(링크)]
        └─ completeOnboarding → redirect(safeNext(next))
```

- `/login`: 이미 로그인 상태면 `safeNext(next)` 로 리다이렉트. `?error=` 가 있으면 안내 문구.
- `LoginForm`: 공급자 목록을 `NEXT_PUBLIC_AUTH_PROVIDERS`에서 읽어 **검증된 공급자만** 렌더(F1-1). 베타 값은 **`google`** 하나(D-2) — 현재 하드코딩된 카카오·X(`twitter`) 버튼은 제거된다. 나중에 추가할 때는 환경변수에 넣기만 하면 되게 목록 구조는 유지(X 는 `x` 공급자, 카카오 이메일은 비즈 앱 전환 필요 — §1.4). `signInWithOAuth` 의 `error` 를 표시.
- `redirectTo` 허용 규칙 ✅(§1.4): Production 은 `redirectTo` 의 host 가 Site URL 과 같으므로 `?next=` 가 그대로 통과한다. Vercel Preview 도메인은 Site URL 과 host 가 달라 **쿼리까지 포함해 glob 매칭**되므로 `https://<preview-pattern>/auth/callback**` 형태로 등록해야 한다(`*` 는 `/` 를 넘지 못함 ○). 매칭 실패 시 오류 없이 Site URL 로 떨어지므로, Preview 에서 로그인 후 Production 으로 튀면 이 설정을 의심한다.
- callback 은 Supabase 공식 예제처럼 `x-forwarded-host` 를 고려해 origin 을 정하되, `next` 검사는 예제의 `startsWith('/')` 만으로는 `//evil.com` 을 못 막으므로 `safeNext` 를 쓴다.
- 온보딩 화면의 닉네임 입력은 제출 시 서버 검증만 한다(실시간 중복 확인 API 는 만들지 않는다 🟡 — 열거 공격 표면 축소).
- **기존 가입자**: `onboarded_at` 이 null 이므로 다음 로그인 또는 첫 쓰기 시 온보딩으로 간다. 별도 이관 불필요.
- `/me` (최소판): 닉네임 표시·변경(쿨다운 안내), 최근 방문 그룹(기기 저장), 화면 모드, 뷰어 글꼴, 가이드라인·약관 링크, 로그아웃. 스크랩 목록·레벨은 P2. 목업: `docs/design/mockups/core-screens.html` 08.
- 로그아웃: `app/auth/signout/route.ts` 를 303 으로(현재 302, 브라우저는 대부분 GET 으로 바꾸지만 명시가 안전 🟡).

**엣지 케이스**
- 같은 닉네임을 대소문자만 바꿔 등록 → `lower()` 유일 인덱스로 `NICKNAME_TAKEN`.
- 한글 NFD 입력(macOS 에서 복사한 문자열 등)은 `[가-힣]` 에 걸리지 않는다 → RPC 첫 줄에서 `p_nickname := normalize(trim(p_nickname), NFC)` ○(Postgres 13+ 함수, 원격 버전 확인 필요).
- 온보딩 도중 탭 닫음 → 다음 쓰기 시 다시 온보딩. 읽기는 제한 없음.
- 탈퇴(L-4)는 MVP 에서 문의 처리 → 운영자가 대시보드에서 `auth.users` 삭제 → `users` cascade, 글은 `author_id = null` → "탈퇴한 사용자" 표시. 채팅 `nickname` 스냅샷은 남는다 → 처리방침에 명시 필요 🔷(D-6 과 함께).

### 7.2 F2 그룹 · 게시판 목록

- 그룹 조회는 전부 `.eq("is_active", true)` 를 붙이고, 공통 함수 `getActiveGroupBySlug(slug)` 하나로 모은다(`generateMetadata` 포함, `cache()` 로 중복 호출 제거) — N4.
- 정렬 `?sort=latest|popular|fanfic` (기본 latest):
  - latest: `order(created_at desc)`
  - popular 🟡: **최근 7일 안에 작성된 글**을 `like_count desc, created_at desc` 로. "최근 7일 동안 받은 좋아요" 가 아니다 — 그 정의는 `reactions.created_at` 집계가 필요해 MVP 에서 뺀다. 칩 라벨을 "인기(7일)" 로 해서 의미를 드러낸다.
  - fanfic: `post_type = 'fanfic'` + 최신순
- 페이지네이션은 기존 offset 방식 유지(20개). 알 수 없는 `sort` 값은 latest.
- 숨김 글은 목록 쿼리에서 계속 `is_hidden = false` 로 제외(작성자에게도 목록에서는 숨김, 상세에서만 보임).
- 게시글 수 표시(디자인 S6 "게시글 {count}")는 이미 받는 `count: "exact"` 를 재사용.

### 7.3 F3 게시글

- **상세** `[postId]/page.tsx`
  1. 글 조회(작성자·그룹 조인). RLS 가 숨김 글을 작성자·관리자에게만 돌려준다.
  2. 없으면 `notFound()`. 글의 그룹 slug ≠ URL slug 이면 정식 URL 로 `redirect` (N5).
  3. `is_hidden` 이면(작성자·관리자만 여기 도달) 상단에 "숨김 처리된 글입니다 — 나에게만 보여요" 배너, 반응·댓글 입력 비활성(N3, F2-4).
  4. `viewer?.id === post.author_id` 일 때만 수정·삭제 노출. 그 외 로그인 사용자에게 "신고" 메뉴.
  5. 반응 초기 상태: 로그인 사용자면 `reactions` 에서 본인 행 조회, 아니면 false.
  6. 조회수: `after()` 로 `record_post_view` (§6.2).
  7. `generateMetadata`: title + description(본문 앞 120자, 줄바꿈 제거) — F9-3. 숨김 글이면 `robots: { index: false }`.
- **작성·수정 폼**: 유형 `text`/`fanfic` 두 개만(F3-2), radio 에 `peer`(디자인 S3), "Markdown 지원" 문구 삭제(F3-3), 본문 `maxLength={LIMITS.content}` + 글자 수 표시, 입력은 `components/ui/input`·`textarea` 로 교체(16px, 디자인 S9).
- 기존 `image`/`video` 글: 목록 배지는 그대로 표시, 수정 시 유형 선택지에 없으므로 **수정 폼에서는 기존 값을 hidden 으로 유지** 🟡(강제로 text 로 바꾸지 않음). DB insert 정책은 새 글만 제한.
- "수정됨"(F3-8): `updated_at - created_at > 1분` 이면 표시. 트리거가 제목·본문·유형 변경에만 `updated_at` 을 바꾸므로 좋아요로 "수정됨" 이 뜨지 않는다.
- 삭제: 확인 대화상자는 `confirm()` 대신 shadcn 대화상자 🟡(모바일 일관성, 필수 아님).

### 7.4 F4 댓글

- 트리 구성은 서버에서 한 번에: 최상위 + 대댓글(1단계). 대댓글에도 "답글" 버튼 → `parentId = reply.parent_id`, 본문 앞에 `@닉네임 ` 을 채운 채 폼 열기(N15, F4-2). 멘션은 단순 텍스트다(알림 없음).
- tombstone 댓글: "삭제된 댓글입니다" 회색 표시, 작성자·시간·액션 숨김, 대댓글은 그대로.
- 숨김 댓글: 목록 쿼리에서 제외. 단, 숨김 댓글이 부모이고 보이는 대댓글이 있으면 부모 자리에 "가려진 댓글입니다" 자리표시 🟡(대댓글이 고아가 되지 않게). 쿼리는 숨김 필터를 빼고 가져와 서버에서 가공하되, RLS 상 타인 숨김 댓글은 애초에 안 온다 → **부모가 안 오면 자리표시를 만든다**.
- 댓글 수 표기는 `posts.comment_count`(트리거가 보이는 댓글만 셈) 하나로 통일. 현재 `CommentSection` 의 `allComments.length` 는 제거.
- 작성자만 삭제 버튼. 댓글 수정 UI 는 PRD 에 명시가 없어 **만들지 않는다** 🟡(권한은 남겨 둠).

### 7.5 F5 좋아요 · 스크랩

- `PostActions`: 비로그인이면 클릭 시 `/login?next=` 로 이동(낙관적 업데이트 하지 않음). 로그인 사용자는 기존 낙관적 업데이트 유지, 실패 코드별 롤백 + 토스트.
- 연타: 전송 중 버튼 비활성(기존). 서버는 AD-6 으로 순서가 보장되지만, 클라이언트는 **마지막 응답 값**을 진실로 쓴다.
- 색: `red-*` → `accent` (디자인 S8).

### 7.6 F6 그룹 라운지 (채팅)

- **입장**: 그룹 활성 확인 → `get_or_create_chat_room` → 최근 50개(현재 방식 유지 ✅). select 컬럼에서 `session_id` 제거(0009 에서 컬럼 삭제 전 코드 먼저 배포, §8).
- **입력 영역**
  - 비로그인: 입력창 대신 "로그인하고 대화에 참여하세요" 버튼.
  - 온보딩 미완료: "닉네임을 정하고 참여하세요" 버튼.
  - 로그인: 닉네임 입력칸 삭제, 메시지 입력(h-11)과 전송 버튼(디자인 S2). 글자 수 표시 유지.
- **내 메시지 표시**: `currentUserId` prop 과 `author_id` 비교 → 닉네임 옆 "나" 배지(디자인 S7 제안).
- **Realtime 연결 관리**
  - `subscribe((status) => …)` 로 `SUBSCRIBED` / `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` 추적 → 끊김 배너(디자인 S7).
  - **재연결 후 누락 보정**: `SUBSCRIBED` 가 두 번째 이상 오면 마지막으로 가진 메시지의 `created_at` 이후를 조회해 합친다(id 로 중복 제거). 현재 코드에는 없음 — 끊긴 동안의 메시지가 영구 누락된다.
  - 상태 배열 상한 200개 🟡(오래된 것부터 버림) — 장시간 방송 중 메모리 증가 방지.
- **숨김 전파(F6-7)**: 관리자 숨김·자동 숨김 시 `chat_moderation_events` 에 행을 넣고, 클라이언트는 같은 채널에서 이 테이블의 INSERT(`room_id=eq.<id>`)를 구독해 해당 id 를 목록에서 "가려진 메시지입니다" 로 바꾼다.
  - `chat_messages` 의 UPDATE 이벤트를 쓰지 않는 이유: 숨김 후 행이 SELECT 정책(`not is_hidden`)을 통과하지 못해 **이벤트 자체가 구독자에게 가지 않는다** ○(§1.4).
  - Broadcast(`realtime.send`) 로 보내는 안도 있으나, 공개 채널이면 누구나 가짜 "숨김" 메시지를 보낼 수 있어 private 채널 + `realtime.messages` RLS + 대시보드 "Allow public access" 해제가 함께 필요하다. MVP 는 이벤트 테이블이 더 단순하다 🟡.
- **payload 노출(F6-6)**: `session_id` 컬럼 삭제로 해결. 이후에도 채팅 테이블에 비공개 컬럼을 추가하면 **테이블 단위 SELECT 를 회수한 뒤 공개 컬럼만 grant** 해야 한다 — Realtime 은 컬럼 권한이 없는 컬럼을 payload 에서 빼 주지만, 테이블 단위 SELECT 가 남아 있으면 컬럼 revoke 가 효과가 없다 ✅(Postgres `REVOKE` 문서).
- **규모 한계**: `postgres_changes` 는 이벤트마다 구독자별 RLS 검사를 하는 단일 스레드 처리다. 문서 기준 같은 변경에 구독자 ~3,000 이상이면 Broadcast 로 옮기라고 한다 ✅. 컴백 방송 등 한 방에 수천 명이 몰리는 시점이 전환 기준이다(2단계 과제, §12-R11).
- **보존 기간(F6-8)**: 90일 지난 메시지 삭제(신고된 메시지는 `reports.snapshot` 에 내용이 남으므로 원본 삭제 가능). 실행 수단은 `pg_cron` 🟡 — 프로젝트에서 확장 사용 가능 여부 ❓. 출시 후 90일 전까지만 준비되면 되므로 **베타 차단 요인 아님**.
- **전송 경로**: Server Action 유지. 브라우저가 직접 insert 하면 Vercel 왕복이 빠져 지연이 줄지만, 오류 코드 처리 경로를 한 곳에 두기 위해 MVP 는 유지 🟡. F6-3(1초)을 못 맞추면 직접 insert 로 바꾼다 — DB 가 방어하므로 보안상 차이 없음.

### 7.7 F7 신고

- **진입점**: 게시글 상세 더보기 메뉴(`dropdown-menu`), 댓글 더보기, 채팅 메시지 길게 누르기(모바일) / 호버 메뉴(데스크톱). 본인 콘텐츠·비로그인에는 노출하지 않는다(비로그인은 누르면 로그인 유도 🟡 — 진입점 누락 0 원칙, PRD §9-07).
- **신고 시트**(`drawer` 모바일 / 대화상자 데스크톱): 사유 8종 라디오(PRD 6.1 문구) + 선택 설명(300자) + 제출.
- **제출 후(F7-4)**: 해당 콘텐츠를 "신고한 콘텐츠입니다 · 보기" 자리표시로 바꾼다. 새로고침 후에도 유지하려면 목록 렌더 시 **해당 화면 대상 id 에 대한 내 신고**를 한 번 조회해 표시 단계에서 가린다(AD-10).
  - 게시판 목록: 페이지의 글 id 20개로 `reports` 조회 1회.
  - 상세: 글 1 + 댓글 id 목록으로 1회.
  - 채팅: 입장 시 최근 50개 id 로 1회, 이후 신고분은 클라이언트 상태.
- **자동 임시 숨김(F7-5)**: `submit_report` 안에서 처리(§4.3). 임계값은 서로 다른 신고자 3명(D-4 결정).
- 신고 사유 코드는 `lib/report-reasons.ts` 한 곳에 정의하고 DB CHECK 와 같은 목록을 쓴다.

### 7.8 F8 최소 관리자 (`/admin`)

| 화면 | 내용 | 데이터 |
|---|---|---|
| `/admin` (레이아웃) | `getViewer().isAdmin` 아니면 `notFound()`. 탭: 신고 큐 / 그룹 / 처리 기록 | — |
| `/admin/reports?status=open` | 대상별 카드: 유형·긴급 배지·신고 수·사유 목록·스냅샷 미리보기·현재 숨김 여부·원문 링크. 버튼: 숨김 / 숨김 해제 / 기각. 처리 메모 입력 | `admin_report_queue` |
| `/admin/groups` | 목록 + 추가 폼 + 수정(slug 읽기 전용) + 활성 토글 | `idol_groups` 직접(RLS) |
| `/admin/log` | 최근 처리 100건 | `moderation_actions` |

- 원문 링크: 채팅 메시지는 원문 페이지가 없으므로 스냅샷만 본다.
- 관리자도 **삭제는 없다**(증거 보존, PRD 5.2).
- 첫 관리자 지정은 SQL 에디터에서 `insert into admins` — 절차를 README 운영 항목에 적는다.

### 7.9 F9 공통 · 출시 조건

| 항목 | 설계 | 확인 필요 |
|---|---|---|
| 법적 페이지 `/terms`, `/privacy`, `/guidelines` | `app/(main)/(legal)/…/page.tsx` 정적 MDX 대신 **TSX + 정적 텍스트** 🟡(MDX 의존성 추가 회피). 약관 버전 문자열을 `lib/legal.ts` 에 두고 온보딩 시 `terms_version` 으로 저장 | 문안·운영 주체 🔷 D-6 |
| `app/sitemap.ts` | 활성 그룹 게시판 + 숨김 아닌 글(최근 N=5,000 🟡). **빌드 시 DB 호출을 피하려고** `export const dynamic = "force-dynamic"` 또는 `revalidate` + try/catch 로 정적 항목만 반환 ○ — sitemap 은 기본 캐시(빌드 시 생성)이므로 CI 더미 env 에서 빌드가 깨질 수 있다 | 빌드로 확인 |
| `app/robots.ts` | `/admin`, `/auth`, `/onboarding`, `/me`, `/g/*/write`, `/g/*/posts/*/edit` 차단, sitemap URL | — |
| `NEXT_PUBLIC_SITE_URL` | sitemap·robots·OAuth `redirectTo` 의 기준 URL. `window.location.origin` 의존 제거 | Production 도메인 ❓ |
| `not-found.tsx`, `error.tsx`, `global-error.tsx` | 디자인 S10. `error.tsx` 는 client, `unstable_retry`/`reset` prop (Next 16 문서 ✅) | — |
| 오류 수집 (F9-6) | `instrumentation.ts` 의 `onRequestError`(서버) + `instrumentation-client.ts` 의 `window` error/unhandledrejection(클라이언트). 수집처는 🔷 D-5: Sentry 면 SDK, 아니면 Vercel 로그로 `console.error` 구조화 출력 | D-5 |
| 하단 탭바 (F9-5) | **3칸(홈·그룹·마이)** — D-16 그룹 중심 결정으로 D-12(4칸 대 5칸)는 폐기. 라운지 화면에서는 숨김 | — |
| 홈 `/` | 현재 환영 카드. MVP 에서는 "전체 그룹 최신 글 10개 + 그룹 바로가기" 🟡 (PRD §9 IA). 팔로우 기반 피드는 2단계 | — |

---

## 8. 마이그레이션 · 배포 순서

### 8.1 선행 (BACKLOG P0-3)

1. `supabase init` → `supabase link --project-ref <ref>` (DB 비밀번호 필요 — 사용자) ❓
2. `supabase migration list` 로 원격 이력 확인. **0001~0003 이 CLI 이력 테이블에 없을 수 있다**(대시보드 SQL 에디터로 적용했다면). 그 경우 `supabase migration repair --status applied <버전>` 으로 이력만 맞춘다 ○.
3. 원격 스키마 덤프(`supabase db dump`)로 백업 + 실제 정책·권한 확인 → 이 문서의 가정(§1, §5)과 다르면 설계를 먼저 고친다.
4. `0004` → `0005` 적용 + BACKLOG P0-3 체크리스트.

### 8.2 단계별 순서

각 단계는 "확장(DB) → 코드 배포 → 축소(DB)" 순서다. 기호: **M** 마이그레이션, **C** 코드 배포.

| 단계 | 순서 | 내용 | 구 코드 호환 |
|---|---|---|---|
| 1 온보딩 | M 0006 → C | 컬럼·`admins`·헬퍼·온보딩 RPC 추가, `users` UPDATE 회수. 코드: `safeNext`, callback, `/login?next`, `/onboarding`, `/me` 최소판, 라우트 이전(§6.5), proxy 경로 | 현재 코드는 `users` 를 update 하지 않음 ✅ → 호환 |
| 2 반응·조회수 | M 0007a → C → M 0007b | 0007a: 새 1-인자 `toggle_*`, `record_post_view`, `post_views` 추가(구 함수 유지). C: `reaction.ts`·상세 페이지 교체. 0007b: 구 함수 drop, `reactions` 데이터 폐기·`session_id` 삭제, `increment_view_count` drop | 0007a 동안 구 코드 동작 ✅ |
| 3 게시글·댓글 | M 0008a → C → M 0008b | 0008a: 길이 CHECK, `deleted_at`, 트리거, `delete_comment` 추가, 정책 교체(추가만). C: 폼·길이 검사, `updated_at` 전송 중단, 댓글 삭제를 RPC 로. 0008b: `updated_at` UPDATE GRANT 회수, comments DELETE 회수 | 현재 `updatePost` 가 `updated_at` 을 보내므로(`post.ts:83`) 0008b 를 C 보다 먼저 적용하면 수정이 깨진다 |
| 4 채팅 | C → M 0009 | C: `sendMessage` 가 `room_id, content` 만 전송, select 에서 `session_id` 제거, 비로그인 입력 차단 UI | 구 DB 에서도 새 코드 동작(닉네임은 기본값 '익명') ✅ → C 먼저가 안전 |
| 5 모더레이션 | M 0010 → C | 테이블·RPC·정책 추가 후 신고 UI·`/admin` | 추가만 → 호환 |
| 6 시드 | M 0011 | 출시 그룹 5개 `insert … on conflict (slug) do nothing` (§3.2 0011, D-10) | — |

- 출시 전이고 실사용자가 없다면 2·3 단계의 a/b 분할을 합쳐도 된다. 원격 DB 에 실데이터가 있는지 ❓ → 8.1-3 에서 판단.
- 각 M 이후 `supabase gen types typescript --linked > types/supabase.ts` 를 같은 커밋에 포함.

---

## 9. 검증 계획

### 9.1 테스트 환경 — D-9: D(CI 자동) + C 축소판(운영 스모크)으로 결정 (2026-09-30)

로컬에 Docker 가 없어 이 PC 에서는 `supabase start`·`supabase test db` 를 쓸 수 없다 ✅. 그래서 **DB 보안 규칙 검증은 GitHub Actions 러너(Docker 있음)에서 자동으로**, 운영에서는 **짧은 스모크 확인만** 한다.

검토한 안: A 로컬 Docker + pgTAP / B 개발용 Supabase 프로젝트 + Node 스크립트 / C 운영 수동 체크리스트 / **D CI 에서만 pgTAP ✔** + **C 축소판 ✔**. (C 단독을 한때 골랐다가 같은 날 이 조합으로 바꿨다 — 테스트 계정 5개·운영 데이터 오염·회귀 미검출 부담 때문.)

#### D — CI 자동 테스트 (pgTAP)

| 항목 | 내용 |
|---|---|
| 위치 | `supabase/tests/*.sql`. 영역별 파일: `00_helpers.sql`(테스트 사용자·역할 전환 헬퍼), `10_users_onboarding.sql`, `20_posts_comments.sql`, `30_reactions_views.sql`, `40_chat.sql`, `50_reports_admin.sql`, `90_function_acl.sql`(S22) |
| 형식 | 파일마다 `begin; select plan(n); … select * from finish(); rollback;` — 트랜잭션을 되돌려 테스트끼리 영향이 없게 한다 ○ |
| 사용자 흉내 | 테스트 안에서 `auth.users` 에 가짜 사용자(U0·U1·U2·U3·ADM)를 만들고, `set local role authenticated` + `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'` 로 전환해 `auth.uid()` 를 바꾼다 ○(Supabase RLS 테스트의 일반 패턴 — T2 에서 첫 테스트로 동작 확인). anon 은 `set local role anon`. **Google 계정이 필요 없다** |
| 범위 | §9.2 의 S1~S22 전부(HTTP 가 아닌 SQL 수준 — RLS·컬럼 GRANT·EXECUTE 는 SQL 에서도 같은 규칙으로 강제되므로 PostgREST 직접 호출과 같은 결과) ○. S23(오픈 리다이렉트)은 `safeNext` 의 단위 테스트로 따로 |
| 실행 | CI 잡 `db-test`: Supabase CLI 설치 → `supabase db start`(DB 만) 또는 `supabase start` → 저장소의 마이그레이션 0001~최신을 **빈 DB 에 처음부터 적용** → `supabase test db`. 어느 시작 명령이 필요한지는 T2 에서 확인 ○ |
| 덤 | 마이그레이션이 빈 DB 에 처음부터 적용되는지 매 PR 검증된다(현재 원격 이력과 무관) |
| 규칙 | 새 마이그레이션 PR 에는 **그 마이그레이션이 막는 공격의 테스트를 같은 PR 에** 넣는다. `db-test` 실패 시 머지 금지 |
| 전제 | `supabase init` 으로 `supabase/config.toml` 생성(`auto_expose_new_tables = false`, §4.1) |
| 못 잡는 것 | 실제 OAuth 로그인, Realtime 전달(§12-R1), 운영 DB 에만 있는 설정 차이(대시보드에서 바꾼 권한 등) → C 축소판이 맡는다 |
| 비용 | GitHub Actions 사용 시간. 공개 저장소면 무료, 비공개면 월 무료 한도 안에서 가능할 것 ○(저장소 공개 여부·요금제 ❓) |

#### C 축소판 — 운영 스모크

운영에 마이그레이션을 적용한 **직후마다** 10분 안팎으로 확인한다.

| 순서 | 내용 |
|---|---|
| 1 | 적용 전 백업(`supabase db dump`) |
| 2 | 읽기 전용 확인 (데이터가 생기지 않음): S22(함수 EXECUTE 권한 조회 SQL), S21(anon 으로 숨김 글 안 보임), S2(anon 으로 `reactions` 조회 거부) |
| 3 | 실제 로그인 → 글 1개 작성 → 좋아요 → 삭제, 라운지 메시지 1개 (실제 OAuth·Realtime 확인) |
| 4 | 결과를 `docs/qa/smoke-log.md` 에 날짜·마이그레이션 번호와 함께 한 줄 기록 |

- 계정: **운영자 본인 계정 1개 + 필요하면 테스트 계정 1개**. 이메일 로그인은 켜지 않는다.
- 쓰기는 3번의 글 하나·메시지 하나뿐이고 바로 지운다. 신고·자동 숨김·빈도 제한 같은 무거운 시나리오는 운영에서 돌리지 않는다(D 가 맡음).

### 9.2 보안 테스트 매트릭스 (CI pgTAP 로 자동 실행, D-9)

역할: `anon`(키만), `U1`(온보딩 완료), `U2`(온보딩 완료, 타인), `U0`(로그인, 온보딩 전), `ADM`(관리자). 전부 **PostgREST 직접 호출**로 수행한다(앱 우회 공격 가정).

| # | 시도 | 기대 |
|---|---|---|
| S1 | anon: `rpc/toggle_post_like`, 구 2-인자 시그니처 포함 | 권한 오류 / 함수 없음 |
| S2 | anon·U1: `reactions` select | anon 거부, U1 은 본인 행만 |
| S3 | U0: posts/comments/chat insert, like, report | `ONBOARDING_REQUIRED` 또는 RLS 거부 |
| S4 | U1: `users` PATCH `{nickname}` | 권한 오류 (RPC 전용) |
| S5 | U1: `change_nickname` 30일 내 2회 | 두 번째 `NICKNAME_COOLDOWN` |
| S6 | U1: 닉네임 `Admin`, `ADMIN`, 기존 닉네임의 대소문자 변형 | `NICKNAME_RESERVED` / `NICKNAME_TAKEN` |
| S7 | U1: posts insert 에 `author_id = U2` | 거부 |
| S8 | U1: posts insert 에 비활성 그룹 / `post_type = 'video'` / 제목 101자 / 본문 10,001자 | 거부 |
| S9 | U1: posts PATCH `{updated_at}`, `{is_hidden:false}`, `{like_count}` | 권한 오류 |
| S10 | U1: comments insert, `parent_id` = 다른 글의 댓글 / 대댓글 | `INVALID_PARENT` |
| S11 | U1: comments DELETE 직접 | 권한 오류 (RPC 전용) |
| S12 | U2: `delete_comment(U1 댓글)` | `FORBIDDEN` |
| S13 | U1: chat insert 에 `author_id`/`nickname`/`is_hidden` 포함 | 권한 오류 (컬럼 GRANT) |
| S14 | U1: chat 10초에 6건, 같은 내용 3연속 | 6번째 `RATE_LIMITED`, 3번째 `DUPLICATE_MESSAGE` |
| S15 | U1: 동시 `toggle_post_like` 20회 병렬 | 종료 후 `like_count` = `reactions` 실제 행 수 |
| S16 | anon: `record_post_view` 같은 키 2회 / U1: 키 인자를 바꿔 2회 | 각각 +1 한 번만 (U1 은 인자 무시) |
| S17 | U1: 본인 글 `submit_report` / 같은 대상 2회 | `CANNOT_REPORT_OWN` / `ALREADY_REPORTED` |
| S18 | U1·U2·U3: 같은 글 신고 | 3번째 후 `is_hidden = true`, `moderation_actions` 에 `auto_hide` |
| S19 | U1: `admin_moderate`, `admin_report_queue`, `reports` 전체 select, `moderation_actions` select, `idol_groups` insert | 전부 거부 / 본인 신고만 |
| S20 | ADM: `idol_groups` PATCH `{slug}` | 권한 오류 |
| S21 | anon: 숨김 글·댓글·채팅 select | 안 보임. U1(작성자)은 자기 숨김 글·댓글 보임 |
| S22 | 모든 security definer 함수의 ACL 조회 (`pg_proc.proacl`) | 목록이 §4.3 EXECUTE 열과 일치 (anon 에 불필요한 EXECUTE 없음) |
| S23 | `/auth/callback?next=@evil.com`, `//evil.com`, `/\evil.com`, `https://evil.com` | 전부 `/` 로 |

### 9.3 기능 수용 테스트

PRD F1~F9 수용 기준표를 그대로 체크리스트로 쓴다(`qa-reviewer`). 자동화(E2E)는 MVP 범위에서 제외 🟡 — 1인 개발에서 Playwright 유지비 대비 효과가 낮다고 판단. 대신 §9.2 를 자동화한다.

### 9.4 CI (BACKLOG P0-4)

`.github/workflows/ci.yml` 잡 두 개:

- `app`: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run build`(더미 `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL`). 현재 lint 오류 0 ✅ 이므로 바로 녹색 가능 ○(build 는 미실행).
- `db-test`: Supabase CLI → 로컬 DB 기동 → 마이그레이션 전체 적용 → `supabase test db` (§9.1 D). `supabase/` 또는 `supabase/tests/` 가 바뀐 PR 에서만 돌려 시간을 아낀다 ○.

---

## 10. 작업 분해와 의존 관계

공수는 **추정**(1인, 실작업일)이며 신뢰도 낮음.

| ID | 작업 | 담당 | 선행 | 공수(추정) | 완료 기준 |
|---|---|---|---|---|---|
| T0 | 원격 DB 연결·이력 정합·백업·0004/0005 적용 (§8.1) | 사용자 + supabase-backend | — | 0.5~1 | P0-3 체크리스트 통과 |
| T1 | CI 워크플로 + `.env.example` + `.gitignore` 예외 | frontend-dev | — | 0.5 | PR 에서 녹색 |
| T2 | `supabase init` + pgTAP 헬퍼(`00_helpers.sql`) + S22 테스트 1개 + CI `db-test` 잡 + 운영 스모크 절차(`docs/qa/smoke-log.md`) | supabase-backend | T1 | 1~1.5 | PR 에서 `db-test` 가 S22 를 실행해 녹색 |
| T3 | 공통 모듈 (§6.1) + 타입 생성 연결 | frontend-dev | T0 | 1 | `as unknown as` 캐스트 제거, typecheck 통과 |
| T4 | 단계 1: 0006 + 온보딩·로그인 흐름·`/me` 최소판·라우트 이전(§6.5)·proxy | 둘 다 | T0, T3 | 2~3 | F1-1~F1-5, S4~S6, S23 |
| T5 | 단계 2: 반응·조회수 (0007a/b) | 둘 다 | T4 | 1.5 | F5, F3-7, S1·S2·S15·S16 |
| T6 | 단계 3: 게시글·댓글 무결성 (0008a/b) + 소유자 UI + 상세 개선(N2~N5, N15, N16) | 둘 다 | T4 | 3 | F2·F3·F4, S7~S12 |
| T7 | 단계 4: 채팅 (0009) + 연결 관리·재연결 보정 | 둘 다 | T4 | 2 | F6-1~F6-6, S13·S14 |
| T8 | 단계 5: 신고 (0010 일부) + 신고 UI | 둘 다 | T6, T7 | 2~3 | F7, S17·S18 |
| T9 | `/admin` 3화면 + 모더레이션 RPC + 채팅 숨김 전파 | 둘 다 | T8 | 3 | F8, F6-7, S19~S21 |
| T10 | 시드 (0011) — 그룹 5개, 적용 직전 표기·소속 재확인 | supabase-backend | T9(0010 의 `color_key`) | 0.5 | 새 환경에서 목록 표시 |
| T11 | 셸·디자인 P0 (하단 탭바·44px·오류/404 화면, 디자인 S1~S4, S10) | frontend-dev | T3 | 2~3 | 디자인 리뷰 P0 항목 |
| T12 | 법적 페이지·sitemap·robots·메타데이터·오류 수집 | frontend-dev | D-5, D-6 | 1.5 | F9-1~F9-4, F9-6 |
| T13 | Production 배포·Google OAuth 클라이언트·Redirect URL 등록 | 사용자 + frontend-dev | T1 | 1 | Production 에서 로그인→쓰기 동선 |
| T14 | 전체 QA (§9.2 전 항목 + PRD 수용 기준) | qa-reviewer | T4~T13 | 1~2 | 차단 이슈 0 |

```
T0 ─┬─ T3 ─┬─ T4 ─┬─ T5
    │      │      ├─ T6 ─┐
    │      │      └─ T7 ─┴─ T8 ─ T9
    │      └─ T11
T1 ─┴──────────────────────────────── T13 ─ T14
T2 (D-9: D+C축소) ── T4 부터 마이그레이션마다 pgTAP 테스트를 같은 PR 에 추가
T10 (0010 이후), T12 (D-5·D-6) 는 병렬
```

합계 약 22~28 실작업일(추정). BACKLOG §5 의 W1~W6 배정과 대체로 맞지만, **T2(테스트 환경)와 T3(공통 모듈)가 새로 생겨** 1주 정도 밀릴 수 있다 — BACKLOG 재조정은 PM 몫.

---

## 11. 결정 필요 사항

기존 PRD §18 과 번호를 이어 쓴다. 🟡 는 이 문서의 권장안이다.

| ID | 질문 | 권장 🟡 | 막는 작업 |
|---|---|---|---|
| D-1 | 식별 체계 | **A 로 결정됨 (2026-09-29)** | — |
| D-2 | 출시 로그인 공급자 | **Google 만으로 결정 (2026-09-30)**. 추가 시 참고: 카카오는 이메일을 받으려면 비즈 앱 전환 필요(아니면 "이메일 없는 사용자 허용" + 공급자 간 계정 중복 대비), X 는 `twitter`(1.0a) 대신 `x`(OAuth 2.0) | — |
| D-3 | 관리자 판별 | **`admins` 테이블로 결정 (2026-09-30)** | — |
| D-4 | 자동 임시 숨김 | **결정 (2026-09-30, 권장안 채택)**: 켬, 서로 다른 신고자 3명 | — |
| D-5 | 오류 수집처·요금제 | 베타는 Vercel 로그 + 구조화 `console.error`, 공개 전 Sentry 재검토 | T12 |
| D-6 | 운영 주체·연락처·약관 문안 | 사용자 작성 | T12, 온보딩 약관 링크 |
| **D-8** | 기존 쿠키 기반 좋아요·스크랩 데이터 | **결정 (2026-09-30, 권장안 채택)**: 폐기 + 카운터 0 재계산 (이관 불가능 — 로그인 사용자와 연결 정보 없음) | — |
| **D-9** | 테스트 환경 | **D(CI pgTAP 자동) + C 축소판(운영 스모크)으로 결정 (2026-09-30)** — §9.1 | — |
| **D-10** | 출시 시 그룹 목록 | **5개로 결정 (2026-09-30)**: BLACKPINK · NewJeans · SEVENTEEN · IVE · aespa — §3.2 0011 | — |
| **D-11** | 닉네임 규칙 | **결정 (2026-09-30, 권장안 채택)**: 2~20자, 한글 완성형·영문·숫자·`_`, 대소문자 무시 유일, 30일 1회 변경(온보딩 직후 30일 포함), 금지어 목록 | — |
| ~~D-12~~ | ~~하단 탭 4칸 vs 5칸~~ | D-16(그룹 중심, 3칸)으로 대체 (2026-09-30) | — |
| **D-13** | 좋아요도 온보딩 완료 필요? | **결정 (2026-09-30, 권장안 채택)**: 예 (약관 동의 전 활동 기록 없음) | — |
| **D-14** | 인기순 정의 | **결정 (2026-09-30, 권장안 채택)**: "최근 7일 작성 글의 좋아요 순" (7일간 받은 좋아요 아님) | — |

---

## 12. 설계 리스크 · 미확인 목록

| # | 항목 | 영향 | 확인 방법 | 상태 |
|---|---|---|---|---|
| R1 | 숨김 UPDATE 이벤트가 전달되지 않는다는 판단 | F6-7 설계 근거 | 소스 기반 추정 → T9 에서 실제 구독으로 1회 확인. 전달되더라도 이벤트 테이블 설계는 그대로 유효 | ○ |
| R2 | 우리 프로젝트의 현재 기본 권한 상태, 그리고 **2026-10-30 강제 전환** 전후 동작 | 전환 이후 명시 grant 를 빠뜨린 객체는 기능이 깨짐 | §4.1 규약(항상 명시 grant) + S22 쿼리. T5~T9 가 전환일을 걸쳐 진행되므로 전환 직후 회귀 확인 1회 | 문서 ✅ / 프로젝트 상태 ❓ |
| R3 | Preview 도메인의 Redirect URL 패턴 | Preview 에서 로그인 후 Production 으로 튐 | 규칙은 확인 ✅, 실제 등록값은 T13 에서 | ❓ |
| R4 | 원격 DB 가 0001~0005 중 어디까지, 어떤 방식으로 적용됐는지 | §8 전체 순서 | T0 | ❓ |
| R5 | 원격에 실사용자 데이터 존재 여부 | D-8, a/b 분할 필요성 | T0 | ❓ |
| R6 | advisory lock 기반 빈도 제한의 부하 | 채팅 폭주 시 지연 | 부하 테스트는 MVP 제외. 사용자 단위 잠금이라 사용자 간 경합 없음 ○ | ○ |
| R7 | `sitemap.ts` 빌드 시 DB 호출 | CI 빌드 실패 | T1 에서 build 실행 | ○ |
| R8 | `pg_cron` 사용 가능 여부 | F6-8 | 대시보드 확장 목록 | ❓ (베타 비차단) |
| R9 | 닉네임 정규식 `가-힣` 이 DB 콜레이션·인코딩에서 의도대로 동작 | F1-4 | S6 | ○ |
| R10 | PostgREST 가 `raise exception` 의 메시지를 `message` 필드로 그대로 전달 | §6.3 매핑 | T4 첫 RPC 에서 확인 | ○ |
| R11 | 채팅 동시 구독자 수가 `postgres_changes` 한계(~3,000/변경)에 닿는 시점 | 컴백 시간대 지연·누락 | 요금제별 동시 연결 한도(D-5)와 함께 관찰. 넘으면 Broadcast 전환 | ○ |
| R12 | `private` 스키마가 PostgREST 노출 목록에 포함되지 않았는지 | 헬퍼가 API 로 노출 | 대시보드 API 설정 확인 | ❓ |
| R13 | 컬럼 단위 INSERT 권한은 INSERT 문에 **명시된 컬럼만** 검사하고, BEFORE 트리거가 채운 `author_id`·`nickname` 은 검사하지 않는다는 가정 | 채팅 insert 가 권한 오류로 전부 실패 | S13 과 정상 전송 테스트 | ○ |
| R15 | CI 테스트는 빈 DB 기준이라 **운영 DB 에만 있는 차이**(대시보드에서 직접 바꾼 권한·정책, 0001~0003 적용 방식)는 못 잡음 | CI 녹색인데 운영은 열려 있을 수 있음 | T0 에서 원격 스키마 덤프와 마이그레이션 결과를 한 번 대조 + 운영 스모크의 S22·S21 | ○ |
| R14 | BEFORE 트리거 이후에 RLS `WITH CHECK` 가 평가된다는 가정 | 트리거가 채운 `author_id` 가 정책에서 null 로 보임 | 정상 전송 테스트 | ○ |
