# 로컬에서 Google 로그인으로 테스트하기 (A안)

로컬 앱(`localhost:3000`) + 원격 Supabase DB + Google 로그인으로 로그인 이후 동선을 확인하는 절차다.
Google·Supabase 화면의 메뉴 이름은 2026-10 기준 추정이라 실제와 조금 다를 수 있다 ○.

- 원격 DB 가 곧 운영 DB 다. 테스트로 만든 글·댓글·메시지·신고는 운영에 남으므로 끝나면 정리한다(맨 아래).
- 로그인은 사람이 직접 한다. 클라이언트 보안 비밀번호·키는 대화창이나 저장소에 붙여 넣지 않는다.
- `.env.local` 은 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY` 만 있으면 된다.
  `NEXT_PUBLIC_AUTH_PROVIDERS` 가 없으면 google, `NEXT_PUBLIC_SITE_URL` 이 없거나 비어 있으면 브라우저의 현재 주소를 쓴다(`lib/site.ts`).

## 1. Supabase: 콜백 주소 복사 (1분)

- [ ] Supabase 대시보드 → 프로젝트 → **Authentication → Sign In / Providers → Google**
- [ ] 패널의 **Callback URL** (`https://<ref>.supabase.co/auth/v1/callback`) 복사 — 2단계에서 쓴다
- [ ] 아직 켜지 말고 창을 열어 둔다

## 2. Google Cloud Console: OAuth 클라이언트 (8~10분)

- [ ] console.cloud.google.com → 프로젝트 만들기 또는 선택 (예: `idoluniv`)
- [ ] **Google Auth Platform**(이전 "OAuth 동의 화면")
  - [ ] **Branding**: 앱 이름 `IdolUniv`, 지원 이메일, 개발자 연락처
  - [ ] **Audience**: 사용자 유형 **External**, 게시 상태 **Testing**
  - [ ] **Audience → Test users** 에 로그인할 Google 계정 추가 — Testing 상태에서는 여기 있는 계정만 로그인된다
  - [ ] **Data access**: 기본 `openid`·`email`·`profile` 만 (민감 범위 아님 → 검수 불필요)
- [ ] **Clients → Create client → 웹 애플리케이션**
  - 이름: `IdolUniv local`
  - **승인된 JavaScript 원본**: `http://localhost:3000`
  - **승인된 리디렉션 URI**: 1단계의 Supabase Callback URL (localhost 가 아님에 주의)
- [ ] **클라이언트 ID**·**클라이언트 보안 비밀번호** 복사. 보안 비밀번호는 만들 때만 다시 볼 수 있을 수 있으니 바로 3단계에 붙여 넣는다

## 3. Supabase: Google 켜기 + 허용 주소 (2분)

- [ ] 1단계 Google 패널에서 **Enable** → Client ID·Client Secret 붙여 넣기 → 저장
- [ ] **Authentication → URL Configuration**
  - [ ] **Site URL**: 기존 값이 없으면 `http://localhost:3000` (운영 도메인이 생기면 T13 에서 바꾼다)
  - [ ] **Redirect URLs** 에 `http://localhost:3000/auth/callback**` 추가 — 끝의 `**` 가 있어야 `?next=...` 쿼리가 붙은 주소도 허용된다

## 4. 로컬 실행·로그인 (3분)

- [ ] `npm run dev` (포트 3000)
- [ ] `http://localhost:3000/login` → **Google로 계속하기** → 계정 선택
- [ ] `/onboarding` 에서 닉네임 + 만 14세 이상·약관 체크 → 시작
- [ ] 원래 가려던 화면(기본 `/`)으로 돌아오면 성공

## 5. 첫 관리자 지정 (1분)

README "운영 → 첫 관리자 지정" 과 같다.

- [ ] Supabase **SQL Editor**:
  ```sql
  insert into public.admins (user_id)
  select id from public.users where nickname = '<정한 닉네임>';
  ```
- [ ] `/me` 새로고침 → "관리자" 링크 보이는지

## 막혔을 때

| 증상 | 원인·조치 |
|---|---|
| Google 화면에 `redirect_uri_mismatch` | 2단계 리디렉션 URI 가 Supabase Callback URL 과 정확히 같지 않음 (끝 `/` 여부까지) |
| "액세스 차단됨"·"앱이 확인되지 않음" | 그 계정이 Test users 에 없음 |
| 로그인 후 localhost 가 아닌 다른 주소로 감 | 3단계 Redirect URLs 에 `http://localhost:3000/auth/callback**` 가 없어 Site URL 로 떨어짐 |
| `/login?error=auth_callback_failed` 로 돌아옴 | 코드 교환 실패 — Supabase 의 Client Secret 이 틀렸거나 브라우저 쿠키 차단 |
| 로그인 버튼이 안 보임 | `.env.local` 에 `NEXT_PUBLIC_AUTH_PROVIDERS=` 처럼 빈 값 — 줄을 지우거나 `google` |

## 로그인 후 확인할 동선

1. **게시판**: 글쓰기(일반·팬픽) → 목록 행 → 상세 → 수정 → "수정됨" 표시
2. **댓글**: 댓글 → 답글 → 답글에 답글(`@닉네임`) → 댓글 삭제(답글이 있으면 "삭제된 댓글입니다")
3. **좋아요·스크랩**: 누르고 새로고침해도 유지되는지
4. **라운지**: 메시지 보내기 → 다른 창(시크릿 창이면 비로그인 읽기)에서 실시간으로 보이는지, 같은 문구 3연속 거부
5. **신고·관리자**: 본인 콘텐츠에는 신고 버튼이 없으므로 다른 계정 하나를 Test users 에 추가해 신고 → `/admin/reports` 에서 숨김 → `/admin/log`
6. **화면 모드**: `/me` 에서 시스템·라이트·다크 전환

결과는 `docs/qa/smoke-log.md` 기록표에 한 줄 남긴다.

## 끝난 뒤: 테스트 데이터 정리

운영 DB 에 남은 테스트 글·댓글·메시지·신고를 지운다. 지우기 전에 대상을 먼저 조회해 확인한다(삭제는 되돌릴 수 없다).
정리 SQL 은 테스트 계정·기간에 맞춰 그때 작성한다.
