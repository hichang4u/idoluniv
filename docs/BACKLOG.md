# IdolUniv — MVP Backlog

- 갱신: 2026-10-11 (PM). 이전 판: 2026-09-24 (`14c161a` + 작업 트리 기준) — 내용은 git 이력에 있다.
- 기준: `main` = `8b593da` (2026-10-11, PR #27 병합). PR #1~#27 병합 완료.
- 변경 사유: 09-24 판의 P0·P1 이 대부분 끝났고, 실제 진척은 `docs/design/TECH-DESIGN.md` §10~12 와 git 이력에만 남아 있었다. 남은 일만 다시 분류한다.
- 역할: PRD = 무엇을·왜, **이 문서 = 언제·누가**, TECH-DESIGN = 어떻게. 작업 상세는 TECH-DESIGN §10(T#)·§11(D#)·§12(R#) 를 ID 로 참조하고 여기서 다시 쓰지 않는다.
- Sprint 원안 대비 집계는 `docs/SPRINTS.md` 의 "2026-10-11 현황".
- 공수·일정은 전부 **추정**이다. 1인 개발이고 사용자 몫 작업의 소요 시간은 알 수 없다.

### 표기

| 표기 | 뜻 |
|---|---|
| ✅ | 코드·git·기존 기록으로 확인함 |
| ○ | 근거 있는 판단 |
| ❓ | 미확인 (원격 DB·대시보드·Vercel 등 외부 상태) |

원격 DB·대시보드 상태는 이 문서 작성 중 확인하지 않았다. 인용한 것은 `docs/qa/smoke-log.md`·TECH-DESIGN §8.1 의 기록이다.

## 우선순위 정의

| 등급 | 뜻 |
|---|---|
| P0 | 클로즈드 베타 출시를 막는 것. |
| P1 | 베타 중 또는 공개 출시 전에 해야 하는 것. 클로즈드 베타 시작은 막지 않는다. |
| P2 | 출시 후로 미루는 것. |

담당: "사용자" = 프로젝트 오너(계정·대시보드·결정). 에이전트는 `frontend-dev` / `supabase-backend` / `designer` / `qa-reviewer`.

---

## 1. 09-24 판 항목의 결과

| 09-24 항목 | 결과 | 근거 |
|---|---|---|
| P0-1 식별 체계 결정 | 완료 — D-1 = A (쓰기 전부 로그인 필수) | TECH-DESIGN §11 D-1 (2026-09-29), `9700c20` |
| P0-2 미커밋 작업 정리 | 완료 | `913ec74`, `86cfba1`, `ec876bf` (TECH-DESIGN §1.1) |
| P0-3 0004→0005 원격 적용·검증 | 대부분 완료 — 0004~0006 적용, 익명 API 확인 ✅. **S22·권한 표 SQL 은 대기** → 아래 P0-4 | T0, PR #3 (`ba622fc`), TECH-DESIGN §8.1 |
| P0-4 CI | 완료 — `ci.yml`(lint·typecheck·build) + `db.yml`(pgTAP) | T1 PR #1, T2 PR #2 |
| P0-5 로그인 직후 404·닉네임 | 완료 — 콜백 기본 `next` = `/` + `safeNext`(N1), 온보딩·닉네임 RPC | T3 PR #4, T4 PR #5·#6 |
| P0-6 식별 체계 보안 수정 | 완료 — 0008(반응·조회수), 0009(글·댓글), 0010(채팅) | T5 PR #8·#9, T6 PR #10·#11, T7 PR #12·#13 |
| P1-1 신고 | 완료 — 0011 + 신고 시트. 로컬 QA ✅ | T8 PR #14·#15, PR #25 |
| P1-2 관리자 역할·숨김 RPC | 완료 — `admins`(0007), `admin_moderate` 등(0011) | T4-A, T8-A |
| P1-3 `/admin` | 완료 — 신고 큐·그룹·처리 기록 | T9 PR #16 |
| P1-4 그룹 시드 | 완료 — 5개 그룹(0012), 원격 적용 | T10 PR #17·#18 |
| P1-5 게시판 소유자 UI·입력 결함 | 완료. radio 선택이 실패 뒤 풀리던 문제는 PR #27 에서 최종 수정 | T6-B PR #11, PR #27 (`51f5f96`) |
| P1-6 채팅 방어 | 완료 — 발신자 덮어쓰기·빈도 제한·중복 차단·`session_id` 제거 | T7 PR #12·#13 |
| P1-7 Production 배포·환경변수 | **남음** — `.env.example` 만 완료. 배포·OAuth 운영 등록 → 아래 P0-1 | `a28b3ac`, T13 |
| P1-8 sitemap·robots·메타데이터 | 코드 완료. `NEXT_PUBLIC_SITE_URL` 값은 남음 → P0-2 | T12 PR #22 |
| P1-9 모바일 반응형 점검 | 완료 — 셸·44px·화면별 정렬, 390px·다크·1280px 스크린샷 확인 ✅ | T11 PR #19~#21, PR #23, PR #26 |
| P1-10 기본 에러 수집 | 코드 완료(Vercel 로그 + 구조화 출력, D-5). Production 수집 확인은 남음 → P1-3 | T12 PR #22 |
| P1-11 약관·개인정보처리방침 | 코드 완료(`LEGAL_*` 주입). 값·법무 검토 남음 → P0-2, P1-1 | `a28b3ac`, D-6 |

09-24 판 §1 의 범위 축소안(소셜 로그인은 검증된 공급자만, Markdown 제외, image/video 숨김, 업로드 등 연기)은 그대로 채택됐다. D-2(Google 만), PRD §01 비목표.

---

## 2. 남은 일 — P0 (클로즈드 베타 차단)

| ID | 항목 | 담당 | 선행 | 완료 기준 |
|---|---|---|---|---|
| P0-1 | **T13** Vercel Production 배포 + Google OAuth 운영 Redirect URL 등록 (Preview 패턴 R3 포함). **2026-10-11 대부분 완료** — 배포·Git 연결·환경변수·Supabase URL 설정, 운영 로그인 ✅. 운영 글 저장 ✅, `LEGAL_*`(임시 값) 후 재배포 ✅. Google OAuth 클라이언트를 IdolUniv 전용 Google Cloud 프로젝트로 교체 ✅ (2026-10-24). 남은 것: 예전 클라이언트 2개 삭제(사용자, smoke-log 10-24), 연동 비밀값 처리(→ P1-7), R3 (TECH-DESIGN T13). 이전 메모: 배포 기록 없음 ❓ | 사용자 + `frontend-dev` | P0-2 의 `NEXT_PUBLIC_SITE_URL` | Production URL 에서 로그인 → 쓰기 동선 (T13 완료 기준) |
| P0-2 | `LEGAL_*`·`NEXT_PUBLIC_SITE_URL` 값 설정 (로컬·Vercel). **2026-10-11**: `NEXT_PUBLIC_SITE_URL` ✅, `LEGAL_*` 필수 6개는 **임시 값**으로 설정해 `[설정 필요]` 0 ✅ — 운영자 이름·문의 이메일은 실제 값으로 교체 필요, `LEGAL_SUPABASE_REGION` 은 2026-10-12 CLI 로 확인 → 대한민국(서울) ✅ (함수 리전도 `icn1` 로 이동, D-30) | 사용자 | 도메인 결정 | `/terms`·`/privacy`·`/guidelines` 에 `[설정 필요]` 없음, 서버 경고 없음 |
| P0-3 | 라운지 "90일 후 삭제" 문구 처리 결정. 삭제 작업이 없어 문구가 앞서 있다 (`app/(main)/privacy/page.tsx:58`, TECH-DESIGN §7.9.1 ✱, F6-8). 구현하려면 R8 `pg_cron` 확인 ❓ 부터. **결정 (2026-10-11): A = 구현 (D-27)** → 0014(PR). R8 ✅(`pg_cron` 1.6.4). **완료 (2026-10-11)** — 0014 원격 적용, 작업 등록·수동 실행 0건 확인 (smoke-log 10-11) | 결정 = 사용자. 문구 수정 = `frontend-dev`, 구현 시 `supabase-backend` | — | 처리방침 문구와 실제 동작 일치. 예약 실행 확인 ✅: `cron.job_run_details` 10-12·10-13 03:00 UTC `succeeded`, `DELETE 0` |
| P0-4 | S22·권한 표·`users.email` SQL 대시보드 실행 (T0 에서 대기, `docs/qa/smoke-log.md` §3). R12 `private` 스키마 노출 여부도 같은 자리에서 확인. **완료 (2026-10-11)** — S22·email·R12 ✅, `members` 에 남아 있던 anon 쓰기 권한은 **0013**(PR #32)으로 회수·운영 적용, 권한 표·컬럼 권한 재확인 ✅ (smoke-log 10-11) | 실행 = 사용자. 판정 = `supabase-backend` | — | S22 결과가 smoke-log "0008 이후" 허용 목록(`get_or_create_chat_room(uuid)`, `record_post_view(uuid,uuid)`)과 일치, anon INSERT·UPDATE·DELETE 전부 false, email false. smoke-log 에 기록 |
| P0-5 | **R2** Supabase 기본 권한 강제 전환(**2026-10-30**) 직후 회귀 확인 | 사용자 + `qa-reviewer` | 10-30 이후. P0-4 (전환 전 기준값) | P0-4 쿼리 재실행 결과 불변 + 운영 스모크 4단계(로그인·글·좋아요·라운지) 통과, smoke-log 기록 |
| P0-6 | 온보딩 완료 → `next` 이동 확인 — **완료 (2026-10-11)**: 새 Google 계정으로 운영 첫 로그인 → `/onboarding` → `/g/ive` 복귀 ✅ (smoke-log 10-11). PR #27 에서는 미확인이었음 | 사용자(새 Google 계정) + `qa-reviewer` | P0-1 | 신규 계정 첫 로그인 → `/onboarding` → 완료 후 원래 페이지 도착 |
| P0-7 | **T14** 전체 QA — TECH-DESIGN §9.2 + PRD F1~F9 수용 기준, Production 대상. **2026-10-12 진행 중**: A단계(쓰기 없는 운영 확인 + `qa-reviewer` 코드 대조) 완료 → 수정 3건(숨김 글 댓글 노출 0015, 헤더 로그인 `next`, 페이지 범위 초과 오류) PR. **완료 (2026-10-12)** — B단계 운영 쓰기 동선 ✅ (smoke-log 10-12), 차단 이슈 0. 판단 2건은 권장안 채택: D-28 라운지 지연 목표 2초, D-29 로그아웃 뒤 옛 JWT 만료까지 유효 수용 | `qa-reviewer` (로그인 필요 구간은 사용자) | P0-1~P0-3 | 차단 이슈 0 |
| P0-8 | D-7 클로즈드 베타 모집 방식 결정 (PRD §18, 기한 제안 2026-11-01) | 사용자 | — | 초대 대상·경로 확정 |
| P0-9 | 개인정보처리방침 + 온보딩 동의 방식(D-25: 약관·개인정보 분리) 법무 검토 — D-26 으로 클로즈드 베타 전에 받기로 함 | 사용자 | P0-2, P0-3 | 처리방침·동의 문구 확정, 지적 사항 반영 |

P0-8 은 원래 출시 차단 후보 목록에 없던 것을 PM 이 추가했다. 초대 대상이 없으면 베타를 열 수 없다는 판단이다 ○.

---

## 3. P1

| ID | 항목 | 담당 | 선행 | 완료 기준 |
|---|---|---|---|---|
| P1-1 | 나머지 법무 검토 — 이용약관·가이드라인 등 TECH-DESIGN §7.9.1 (처리방침·동의 방식은 P0-9). D-26: 공개 출시 전, §15 Go/No-Go 조건 | 사용자 | P0-9 | §7.9.1 항목 확정, 문구 반영 |
| P1-2 | 온보딩 폼을 띄운 뒤 세션이 끊긴 상태로 제출하면 로그인 화면 대신 "권한이 없어요." 가 나옴 (비로그인 제출로 재현 ✅, 2026-10-11). anon 에 `complete_onboarding` EXECUTE 가 없어 42501 → `FORBIDDEN` 으로 매핑되는 것으로 보임 ○ (`app/actions/auth.ts:43-52` 가 `AUTH_REQUIRED` 일 때만 로그인으로 보내고, `lib/action-result.ts` 는 42501 을 `FORBIDDEN` 으로 바꿈 ✅). 정상 동선은 페이지가 먼저 redirect 하므로 영향 작음 | `frontend-dev` | — | 세션 없는 제출 → 로그인 화면(복귀 `next` 유지) |
| P1-3 | Production 오류 수집 확인 — Vercel 로그에 `onRequestError`·`/api/client-errors` 기록이 남는지 (F9-6) | `frontend-dev` | P0-1 | 의도적 오류 1건이 로그에 구조화 형태로 보임 |
| P1-4 | 베타 운영 루틴 — R16(무료 플랜 1주 비활성 정지) 대비 주 1회 접속·스모크, R18 주 1회 수동 덤프. `db dump` 는 Docker 가 필요해 이 PC 에서 실패한 기록이 있다(TECH-DESIGN §8.1) → 덤프 수단부터 정해야 함 ❓ | 사용자 | P0-1 | 덤프 방법 확정, 첫 덤프 1회 |
| P1-6 | T14 비차단 발견 (2026-10-12, `qa-reviewer` + 운영 확인): ① 작성자가 API 로 `post_type` 을 `video`·`image` 로 바꿀 수 있음(update 정책에 유형 제한 없음, 코드 확인) ② 처리방침 "신고 기록 처리 종료 후 1년 뒤 삭제" 미구현(첫 기한 약 1년 뒤) ③ 신고자가 자기 신고의 `handled_by` 로 처리 관리자를 알 수 있음 ○ ④ 숨김·없는 글 상세가 404 화면을 HTTP 200 으로 냄(soft 404, `noindex` 있음) ⑤ 로그아웃 Origin 검사·`/api/client-errors` 빈도 제한 없음 ⑥ 신고 큐 조회 실패가 "신고 없음" 과 같아 보임 ⑦ pgTAP 공백: S15 병렬 미검증, S23 러너 없음(`safeNext` 일회 실행 ✅) ⑧ (코드 리뷰 2026-10-13) `LoginLink` 의 `next` 가 경로만 담아 쿼리(`?sort=` 등)가 빠짐 — 다른 진입점과 같은 방식, `useSearchParams` 는 Suspense 경계 필요 ○ ⑨ (코드 리뷰) 0014 삭제 쿼리용 인덱스 없음(`chat_messages(created_at)`, `reports(target_type, target_id)`) — 베타 규모 무관 ○, 메시지 수만 건 이상이면 추가 | `supabase-backend`, `frontend-dev` | — | 항목별 수정 또는 수용 결정 기록 |
| P1-7 | Supabase–Vercel 연동이 넣은 Production 비밀 변수 정리 — `SUPABASE_SERVICE_ROLE_KEY`·`SUPABASE_SECRET_KEY`·`SUPABASE_JWT_SECRET`·`POSTGRES_PASSWORD`·`POSTGRES_URL` 등, 코드 미사용 ✅(T13). 선택지: (a) 연동 해제(권장 ○ — 안 쓰는 비밀값을 두지 않음) (b) 연동 유지 + 변수만 삭제(연동이 다시 만들 수 있음 ❓). **2026-10-12 사용자: 나중에 처리** | 결정 = 사용자, 실행 = Claude | — | 비밀값 변수 0개, 앱 동작·배포 영향 없음 확인 |
| P1-5 | 모바일 Lighthouse 성능·접근성 90+ (PRD §15 Go/No-Go, 주요 4개 화면) | `frontend-dev`, `designer` | P0-1 | 4개 화면 측정값 기록, 90 미만 항목 수정 |

---

## 4. P2 (출시 후)

| 항목 | 근거 / 메모 | 담당 |
|---|---|---|
| 홈 "전체 그룹 최신 글 10개" + 홈 화면 목업 | D-23 (2026-10-11) 으로 P2. 지금 홈은 소개 카드 + "그룹 둘러보기" | `designer`, `frontend-dev` |
| 목업 정렬 후속: 팬픽 뷰어, 글자 크기 단계 토큰화 | PR #26 이후 남은 차이. 최근 방문 그룹은 D-24 로 `/g` 에도 추가함 | `designer`, `frontend-dev` |
| 이미지 업로드 + 검증 | PRD §01 비목표 | `supabase-backend`, `frontend-dev` |
| 스크랩 목록 화면 | F5-4 2단계. 토글은 완료 | `frontend-dev` |
| 댓글 수정 UI | F4-3: MVP 는 삭제만 (2026-10-12 T14 결정). DB 는 `update (content)` 허용(0009) — 도입 시 "수정됨" 표시·신고 스냅샷 고려 | `frontend-dev` |
| 댓글 좋아요 UI | `toggle_comment_like(uuid)` RPC 만 있음(0008) ✅ | `frontend-dev` |
| 타이핑 인디케이터 | presence 코드 없음 | `frontend-dev` |
| Markdown 렌더링 | 비목표. 도입 시 XSS 방어 | `frontend-dev`, `qa-reviewer` |
| OG 이미지 | 메타데이터·OG 공통값은 T12 완료, 이미지 없음 | `frontend-dev`, `designer` |
| 삭제 확인 `confirm()` → 대화상자 | T6 에서 남김 (`CommentItem.tsx:118`, `PostMoreMenu.tsx:35`) | `frontend-dev` |
| Kakao·X 로그인 | D-2. 코드는 `NEXT_PUBLIC_AUTH_PROVIDERS` 로 켤 수 있음 ✅ | 사용자, `frontend-dev` |
| 셀프 탈퇴 | PRD L-4 2단계 | `frontend-dev`, `supabase-backend` |
| Sentry 등 오류 수집 도구 | D-5: 공개 출시 전 재검토 | 사용자 |
| 미사용 의존성 정리 | `@tanstack/react-query`, `zustand` 는 `package.json` 에만 있고 import 없음 ✅ | `frontend-dev` |
| 관리자 통계, API 전반 rate limit, AdSense | 원안 Nice to Have | — |

---

## 5. 결정·사실 기록 (2026-10-11)

- 운영 DB 테스트 데이터는 **정리하지 않기로 결정 (2026-10-11, 사용자)**. 테스트 계정 2개(관리자 1 포함)와 테스트 글·댓글·라운지 메시지가 운영 DB 에 남아 있다.
- D-23~D-26 결정 (2026-10-11, 권장안 채택, TECH-DESIGN §11): 홈 최신 글은 P2, 최근 방문 그룹은 `/g`·`/me` 둘 다, 온보딩 약관·개인정보 동의 분리, 법무 검토는 처리방침·동의 방식만 클로즈드 베타 전(P0-9)·나머지는 공개 출시 전(P1-1).
- 로컬 앱 → 운영 Supabase 로 확인한 것 (PR #27, 2026-10-11) ✅: 글 작성·수정(오류 뒤 팬픽 유지, `post_type=fanfic` 저장), 그룹 수정(오류 뒤 색 유지, 저장 후 데이터 불변). 미확인: 온보딩 완료 → `next` 이동 (P0-6).

---

## 6. 재일정 초안 (추정)

**현재 위치** — 원 재일정(09-24 판)의 W2 끝(10-11)이다. 계획상 W3~W5 에 있던 신고·관리자·출시 준비 코드(T8~T12)가 10-09 에 끝나 **코드 작업은 약 2주 앞서 있다** ✅(git). 남은 일은 대부분 사용자 몫의 외부 작업(배포·OAuth·대시보드·법무)과 QA 다. 클로즈드 베타 목표 **2026-11-08 은 유지 가능**하다고 본다 ○.

| 주차 | 기간 | 목표 | 항목 | 종료 판단 기준 |
|---|---|---|---|---|
| W3 | 10-12 ~ 10-18 | Production 띄우기 | P0-2, P0-3 결정, P0-4, P0-1, P0-6, P0-9 의뢰 | Production 에서 로그인 → 온보딩 → 쓰기, 법적 페이지에 값 표시 |
| W4 | 10-19 ~ 10-25 | 전체 QA | P0-7, P1-2, P1-3 | 차단 이슈 0 (전환 전 기준) |
| W5 | 10-26 ~ 11-01 | 권한 전환 대응·모집 | P0-5(10-30 이후), P0-8, P0-7 수정분 | 전환 후 회귀 없음, 초대 명단 |
| W6 | 11-02 ~ 11-08 | 버퍼 → 클로즈드 베타 | 밀린 항목, P1-4 | 11-08 전후 베타 시작 |

- 신뢰도: **중간~낮음** ○. 코드 쪽은 남은 양이 작지만, P0-1·P0-2·P0-4 는 사용자 시간에 달려 있고 그 소요는 알 수 없다.
- 고정 일정: P0-5 는 10-30 전에 끝낼 수 없다. 그래서 베타 시작은 빨라도 10-31 이후다 ○.
- 가장 큰 불확실성: (1) T13 착수 시점, (2) 90일 문구를 "구현"으로 정하면 `pg_cron` 가능 여부(R8 ❓)와 구현 1~2일 추가 ○, (3) P0-9 법무 검토(처리방침·동의 방식)의 소요 ❓ — D-26 으로 베타 전에 받기로 해서 일정에 직접 걸린다.
