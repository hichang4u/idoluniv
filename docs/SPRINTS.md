# IdolUniv — MVP Sprint 계획 (Phase 1)

> `docs/SPRINTS.html` 은 2026-09-24 판 원본이며 이후 갱신하지 않는다. 관리 문서는 이 파일이다.

| | |
|---|---|
| 문서 | Sprint Plan · Phase 1 MVP |
| 버전 | v1.2.0 · 2026-10-11 진척 갱신 (원안 v1.0.0 2026-05-31) |
| 원 목표 | 2026 Q2 출시 · 8주 / 4 Sprints → **미달** |
| 재일정 | `docs/BACKLOG.md` §6 (추정) |
| 기준 | `main` = `8b593da` (2026-10-11, PR #27) |

PRD Phase 1 Foundation을 4개의 2주 Sprint로 분리한 실행 계획 — 소셜 로그인부터 관리자 대시보드까지, 단계별 deliverable 중심 개발.

| Total Sprints | MVP 개발 기간 | 핵심 기능 | 출시 목표 |
|---|---|---|---|
| 4 | 8주 | 10 | 2026 Q2 |

### 표기

| 표기 | 뜻 |
|---|---|
| ✅ | 코드·git·기존 기록으로 확인함 |
| ○ | 근거 있는 판단 |
| ❓ | 미확인 (Supabase·OAuth·Vercel 등 외부 상태) |

관련 문서: 범위는 `docs/PRD.md`, 순서·담당은 `docs/BACKLOG.md`, 구현 작업(T#)·결정(D#)·리스크(R#)는 `docs/design/TECH-DESIGN.md` §10~12.

---

## 목차

- [00 2026-10-11 현황](#00-2026-10-11-현황)
- [00-이력 2026-09-24 현황 (오래된 판)](#00-이력-2026-09-24-현황-오래된-판)
- [01 Sprint 개요](#01-sprint-개요)
- [02 타임라인](#02-타임라인)
- [03 운영 원칙](#03-운영-원칙)
- [S1 Sprint 1 — Foundation Setup](#s1-sprint-1--foundation-setup)
- [S2 Sprint 2 — Community Core](#s2-sprint-2--community-core)
- [S3 Sprint 3 — Realtime & Media](#s3-sprint-3--realtime--media)
- [S4 Sprint 4 — Admin & Launch](#s4-sprint-4--admin--launch)
- [05 Phase 2~4 예고](#05-phase-24-예고)
- [06 변경 이력](#06-변경-이력)

---

## 00. 2026-10-11 현황

*Status vs. Plan · 코드·git 이력 기준 재측정 (2026-10-11 추가)*

**결론** — 계획상 MVP 종료일(2026-07-27)에서 **76일** 지났다. `14c161a`(06-12) 이후 비병합 커밋 50개, PR #1~#27(10-03 ~ 10-11) ✅. 원안 Must Have 29개는 **완료 16 · 축소 8 · 연기 3 · 남음 2** 다. 남은 2개는 모두 T13(Vercel Production 배포 + Google OAuth 운영 등록)에 묶여 있다. 축소·연기는 PRD §01 비목표와 D-2·D-5 결정에 따른 것이다. 코드 작업은 BACKLOG 09-24 재일정보다 약 2주 앞서 있고, 남은 것은 사용자 몫 외부 작업과 전체 QA(T14)다 → `docs/BACKLOG.md` §2.

| 분류 | 뜻 |
|---|---|
| 완료 | 코드가 있고 로컬 또는 운영 DB 기준 동작을 확인한 기록이 있음 |
| 축소 | 범위를 줄여 완료 (PRD §01 비목표·결정에 따름) |
| 연기 | MVP 에서 뺌, 2단계 이후 |
| 남음 | 끝내려면 할 일이 남음 |

진행률(추정): (완료 + 축소) ÷ 29 = 24/29 ≈ **83%**. 연기 3개를 범위에서 빼면 24/26 ≈ 92%. 남은 2개는 코드가 아니라 배포·외부 설정이다.

### Sprint 별 상태

| Sprint | 계획 기간 | Must Have | 상태 | 핵심 근거 |
|---|---|---|---|---|
| Sprint 1 | 06.02 ~ 06.15 | 완료 5 · 연기 2 · 남음 1 / 8 | Production 로그인만 남음 | Kakao·X 는 D-2 로 연기. Google 은 로컬 로그인 ✅(2026-10-10, `docs/qa/smoke-log.md`), 운영 Redirect URL 은 T13 |
| Sprint 2 | 06.16 ~ 06.29 | 완료 5 · 축소 3 / 8 | 완료 (축소 포함) | 0008·0009, T5·T6 (PR #8~#11), 소유자 UI, PR #27 radio 수정 |
| Sprint 3 | 06.30 ~ 07.13 | 완료 3 · 축소 2 · 연기 1 / 6 | 완료 (축소 포함) | 0010·0011, T7·T8·T11 (PR #12~#15, #19~#21), 로컬 실시간·신고 QA ✅(PR #25) |
| Sprint 4 | 07.14 ~ 07.27 | 완료 3 · 축소 3 · 남음 1 / 7 | Production 배포만 남음 | T9·T12 (PR #16, #22), CI T1·T2 (PR #1·#2). 배포는 T13 |

### Must Have 29개

| # | Sprint | Must Have | 10-11 | 근거 |
|---|---|---|---|---|
| 1 | S1 | Next.js 16 App Router + TypeScript | 완료 | `next@16.2.6`, CI typecheck (T1) |
| 2 | S1 | Tailwind + shadcn/ui + 기본 테마 (다크모드 기본) | 완료 | 토큰·테마 연결 T11-A (PR #19). 기본 테마는 **시스템 따름**으로 바뀜 — D-17 (`docs/design/TOKENS.md`) |
| 3 | S1 | Supabase 연동 (SSR) | 완료 | `lib/supabase/*` 에 생성 타입 `<Database>` 연결 T3 (PR #4), `.env.example` (`a28b3ac`) |
| 4 | S1 | 초기 DB — users, fan_profiles, idol_groups | 완료 | `0001`, 원격 적용 확인 (T0, TECH-DESIGN §8.1) |
| 5 | S1 | Google OAuth | **남음** | 코드·로컬 로그인 ✅. 운영 Redirect URL·Production 확인은 T13 |
| 6 | S1 | Kakao OAuth | 연기 | D-2 (Google 만). `NEXT_PUBLIC_AUTH_PROVIDERS` 로 켤 수 있음 ✅ |
| 7 | S1 | Twitter/X OAuth | 연기 | D-2. 추가 시 공급자 `x`(OAuth 2.0) — N17 |
| 8 | S1 | 기본 레이아웃 — 헤더·사이드바·푸터 | 완료 | T11-B (PR #20): 모바일 하단 탭바 3칸·화면별 TopBar(PR #26), 데스크톱 헤더·사이드바 |
| 9 | S2 | DB — posts, comments, reactions | 완료 | `0002` + `0008`(반응 `auth.uid()`) + `0009`(무결성), 원격 적용 (smoke-log) |
| 10 | S2 | 그룹 목록 + 그룹별 라우팅 | 완료 | `/g`, `/g/[slug]` T4-C (PR #7), 옛 경로 영구 리다이렉트 |
| 11 | S2 | 게시글 작성 폼 (텍스트 + Markdown) | 축소 | 평문만 (PRD §01 비목표), 유형 text/fanfic. T6-B, PR #27 |
| 12 | S2 | 게시판 목록 + 상세 | 완료 | T6-B, T11-C (PR #21), PR #26 |
| 13 | S2 | 게시글 수정·삭제 (작성자만) | 완료 | RLS 0009, 작성자에게만 메뉴 T6-B, 운영 DB 수정 확인 ✅ (PR #27) |
| 14 | S2 | 댓글·대댓글 작성·삭제 | 완료 | `delete_comment` tombstone (0009), 하단 고정 입력창·답글 모드 (PR #26), 로컬 QA ✅ |
| 15 | S2 | 좋아요 토글 (게시글/댓글) | 축소 | 게시글 완료 (0008, T5). 댓글 좋아요는 RPC 만, UI 연기 |
| 16 | S2 | 스크랩 + 마이페이지 스크랩 목록 | 축소 | 토글 완료 (T5). 목록은 F5-4 로 2단계 |
| 17 | S3 | DB — chat_rooms, messages, chat_members | 축소 | `chat_members` 제외 (PRD §12). `0003` + `0010` |
| 18 | S3 | 그룹별 채팅 라운지 (Realtime) | 완료 | T7 (PR #12·#13), 로컬 실시간 전송 ✅ (2026-10-10) |
| 19 | S3 | 실시간 수신 + 타이핑 인디케이터 | 축소 | 수신·재연결 보정 완료 (T7). 타이핑 인디케이터 연기 |
| 20 | S3 | 이미지 업로드 | 연기 | PRD §01 비목표 |
| 21 | S3 | 반응형 UI — 모바일 전체 점검 | 완료 | T11 (PR #19~#21), PR #23, PR #26 (390px·다크·1280px 스크린샷 ✅) |
| 22 | S3 | 신고 시스템 (글/댓글/메시지) | 완료 | 0011 + 신고 시트 T8 (PR #14·#15), 로컬 QA ✅ (PR #25) |
| 23 | S4 | 관리자 대시보드 — 신고 처리 (숨김/삭제/경고) | 축소 | 숨김·해제·기각만. 삭제 없음(증거 보존), 경고는 2단계. T9 (PR #16), 로컬 QA ✅ |
| 24 | S4 | 그룹 관리 CMS | 완료 | `/admin/groups` T9, 운영 DB 그룹 수정 확인 ✅ (PR #27) |
| 25 | S4 | SEO — generateMetadata + OG 이미지 | 축소 | description·canonical·OG 공통값 T12 (PR #22). OG 이미지 연기 |
| 26 | S4 | sitemap.xml + robots.txt | 완료 | `app/sitemap.ts`·`app/robots.ts` T12. `NEXT_PUBLIC_SITE_URL` 값·Production 확인은 BACKLOG P0-2·P0-7 |
| 27 | S4 | GitHub Actions CI | 완료 | `ci.yml` (T1, PR #1), `db.yml` pgTAP (T2, PR #2) |
| 28 | S4 | Sentry 에러 모니터링 | 축소 | Vercel 로그 + 구조화 출력으로 대체 (D-5). `instrumentation.ts`, `/api/client-errors` T12 |
| 29 | S4 | Vercel Production 배포 + 커스텀 도메인 | **남음** | T13. 배포 기록 없음 ❓, 도메인 미정 |

### 09-24 이후 바뀐 것

| 항목 | 내용 | 근거 |
|---|---|---|
| 식별 체계 | 쓰기 전부 로그인 + 온보딩 (D-1 = A). 쿠키 `session_id`·`sid` 폐기 | 0008, 0010, TECH-DESIGN §11 |
| 원격 DB | 0001~0012 적용 기록 ✅. S22·권한 표 대시보드 SQL 은 대기 | smoke-log, TECH-DESIGN §8.1 |
| 품질 게이트 | CI 2개 잡 + pgTAP 8개 파일 (`supabase/tests/`) | PR #1·#2 |
| 디자인 | 토큰·Pretendard·셸·화면별 목업 정렬 | T11, PR #26·#27 |
| Deliverable "Vercel Preview 배포" | 각 Sprint 의 Preview 배포 기록 없음 ❓ | — |

### 남은 일

Must Have 밖에서 출시를 막는 것: T14 전체 QA, `LEGAL_*`·`NEXT_PUBLIC_SITE_URL` 값, 라운지 "90일 후 삭제" 문구 결정, S22·권한 SQL, R2 전환(2026-10-30) 후 회귀 확인, 온보딩 완료 동선 확인, 베타 모집(D-7), 개인정보처리방침·동의 방식 법무 검토(D-26). 담당·순서는 `docs/BACKLOG.md` §2.

---

## 00-이력. 2026-09-24 현황 (오래된 판)

> **이 절은 2026-09-24 기준의 이력이다. 현재 상태는 위 "2026-10-11 현황"을 본다.** `SPRINTS.html` 의 원문을 그대로 옮겼다(기울임 주석만 10-11 추가).

*Status vs. Plan · 코드·git 이력 기준 재측정*

**결론** — 계획상 MVP 종료일(2026-07-27)을 **59일** 넘겼고, 마지막 커밋(2026-06-12) 이후 **104일간 커밋이 없다**. Must Have 29개 중 완료 10 · 부분 11 · 미착수 8, 가중 진행률 약 **53%** (완료=1, 부분=0.5로 셈한 추정치). 게시판·채팅의 뼈대는 있으나 **신고·관리자·CI·배포 등 출시 조건은 전부 미착수**이고, 식별 체계 혼재로 인한 보안 이슈가 미해결이다.

표기: **완료** 코드 존재·동작 경로 확인 / **부분** 일부만 구현 또는 결함 있음 / **미착수** 코드 없음 / **외부 미확인** 코드는 있으나 Supabase/OAuth/Vercel 설정을 저장소에서 확인 불가 / **[작업 트리]** = 미커밋 변경 기준

#### Sprint 별 상태 (09-24)

| Sprint | 계획 기간 | Must Have | 상태 | 핵심 근거 |
|---|---|---|---|---|
| Sprint 1 | 06.02 ~ 06.15 | 완료 5 · 부분 3 / 8 | 코드 완료 · 외부 미확인 | 커밋 `c4b837c`(06-03). OAuth 3종은 코드만 있고 공급자 설정 미확인. 로그인 후 `/profile`(미존재)로 리다이렉트 |
| Sprint 2 | 06.16 ~ 06.29 | 완료 4 · 부분 4 / 8 | 부분 완료 | 커밋 `eaf24c5`(06-12, Sprint 2·3 코드를 한 커밋에 포함). Markdown 렌더링·댓글 좋아요 UI·스크랩 목록 없음 |
| Sprint 3 | 06.30 ~ 07.13 | 완료 1 · 부분 3 · 미착수 2 / 6 | 부분 착수 | `0003_chat.sql` + `ChatRoom.tsx` Realtime 구독. 이미지 업로드·신고 없음 |
| Sprint 4 | 07.14 ~ 07.27 | 부분 1 · 미착수 6 / 7 | 미착수 | 관리자·CMS·sitemap/robots·`.github/workflows`·Sentry·Production 배포 흔적 없음 |

#### 일정 대비 지연 근거 (09-24)

| 항목 | 사실 | 근거 |
|---|---|---|
| 계획 종료일 경과 | 07-27 → 09-24, 59일(약 8.4주) 초과 | 본 문서 타임라인 |
| 커밋 공백 | 06-12 이후 104일간 커밋 0건 | `git log` 마지막 `14c161a` 2026-06-12 |
| 미커밋 작업 누적 | 수정 13개 + 신규 다수 (shadcn UI 25개, `hooks/use-mobile.ts`, 0004·0005 마이그레이션, `docs/PRD.md`) | `git status`. 파일 mtime상 08-16 ~ 09-24 사이 작업으로 보임 (mtime 기반 추정) |
| 품질 게이트 | `tsc --noEmit` 통과, `eslint` **오류 2건** (`react-hooks/purity`: `loading.tsx` 2곳의 `Math.random()`) — CI 도입 시 즉시 실패 | 2026-09-24 작업 트리에서 실행. `next build` 는 미실행 |
| DB 원격 상태 | 0004·0005 원격 적용 여부 알 수 없음. `supabase/config.toml` 없음(로컬 CLI 미연결) | 외부 미확인 |
| 미해결 보안 이슈 | `toggle_post_like` 등 RPC가 호출자가 준 `p_session_id` 를 그대로 신뢰, `reactions` public read 로 `session_id` 노출 → 타인 반응 취소 가능, `increment_view_count` 무제한 호출, 채팅 닉네임 사칭·rate limit 없음 | `0002_community.sql`, `0004_rls_hardening.sql` §4, `app/actions/chat.ts` |

**원인 추정** — (1) Sprint 1~3 코드를 초반 2주에 몰아서 만든 뒤 출시 조건(Sprint 4)으로 넘어가지 못함, (2) 보안 하드닝과 UI 리디자인이 커밋 없이 작업 트리에 쌓임, (3) 식별 체계(auth.uid / 쿠키 `session_id` / 쿠키 `sid`) 결정이 미뤄져 반응·채팅 보안 수정이 막힘. 세 가지 모두 git 이력과 코드로 뒷받침되지만, 작업 중단 사유 자체는 저장소로 확인할 수 없다.

남은 범위의 우선순위, MVP 축소안, 주 단위 재일정 초안은 `docs/BACKLOG.md` 참고 (추정치). *(09-24 당시 기준. 현재 BACKLOG 는 2026-10-11 판)*

---

## 01. Sprint 개요

*Overview*

**목표** — PRD 1단계(Foundation) 기능 전체를 8주 안에 완성하여 2026 Q2 베타 출시. 각 Sprint는 독립적으로 배포 가능한 단위로 설계되어 있어 중간 점검·피드백이 용이합니다.

| Sprint | 기간 | 핵심 목표 | 주요 기술 | 상태 (09-24) | 상태 (10-11) |
|---|---|---|---|---|---|
| Sprint 1 | Week 1–2 | **Foundation Setup** — 프로젝트 초기화 + 인증 | Next.js 16 · Supabase Auth · shadcn/ui | 코드 완료 · 외부 미확인 | Production 로그인만 남음 (T13) |
| Sprint 2 | Week 3–4 | **Community Core** — 게시판 + 댓글 + 반응 | Supabase DB · RLS · React Query | 부분 완료 | 완료 (축소 포함) |
| Sprint 3 | Week 5–6 | **Realtime & Media** — 채팅 + 업로드 + 반응형 | Supabase Realtime · Storage · Tailwind | 부분 착수 | 완료 (축소 포함, 업로드 연기) |
| Sprint 4 | Week 7–8 | **Admin & Launch** — 관리자 + SEO + 배포 | Vercel · GitHub Actions · Sentry | 미착수 | Production 배포만 남음 (T13) |

상태 열: 원안은 Sprint 1 "진행 중", 나머지 "대기". 주요 기술의 "Next.js" 는 실제 설치 버전(`next@16.2.6`)에 맞춰 "Next.js 16" 으로 정정(09-24). 실사용 여부: React Query·Zustand 는 `package.json` 에만 있고 코드에서 import 하지 않음(10-11 재확인 ✅). Storage 는 업로드 연기로 쓰지 않음, Sentry 는 Vercel 로그로 대체(D-5).

---

## 02. 타임라인

*8-Week Timeline*

| Sprint | 주차 · 기간 | 제목 |
|---|---|---|
| Sprint 1 | Week 1–2 · 6.02 ~ 6.15 | Foundation Setup |
| Sprint 2 | Week 3–4 · 6.16 ~ 6.29 | Community Core |
| Sprint 3 | Week 5–6 · 6.30 ~ 7.13 | Realtime & Media |
| Sprint 4 | Week 7–8 · 7.14 ~ 7.27 | Admin & Launch |

| 진행 지표 | 2026-09-24 | 2026-10-11 |
|---|---|---|
| Must Have 진행률 (추정) | 약 53% — 완료 10 · 부분 11 · 미착수 8 / 29 (완료 + 0.5×부분) | 약 83% — 완료 16 · 축소 8 · 연기 3 · 남음 2 / 29 ((완료 + 축소) ÷ 29) |
| 계획 일정 경과 | 100% + 59일 초과 (07-27 종료 예정) | 100% + 76일 초과 |

- 두 시점의 진행률은 계산식이 다르다. 09-24 는 부분=0.5, 10-11 은 축소를 완료로 셌다. 직접 비교하지 않는다.
- 09-24 갱신 메모(원문): 원안 표기 "Sprint 1 진행 중 (25%)" / 막대 8% 는 06월 초 상태에서 멈춰 있었음. 진행률 = (완료 + 0.5×부분) ÷ Must Have 29개 로 계산한 추정치이며, 외부 미확인 항목은 "부분"으로 셈했다.
- 재일정(클로즈드 베타 2026-11-08 목표, 추정)은 `docs/BACKLOG.md` §6.

---

## 03. 운영 원칙

*Sprint Rules*

**🔁 Sprint 기본 원칙**

- 각 Sprint = 2주 / 14일
- Sprint 종료 시 Vercel 배포 가능 상태 유지
- 미완 태스크는 다음 Sprint로 이월 (스코프 조정)
- PR 단위 개발 → Vercel Preview 검증 후 merge
- 커밋 컨벤션: feat / fix / chore / docs

**🎯 1인 개발 최적화**

- 엄격한 deadline 대신 체크포인트 개념으로 운영
- 완성도 > 기능 수 — 덜 만들고 잘 만들기
- UI는 shadcn/ui 컴포넌트 우선 활용
- DB 변경은 Supabase Migration으로 추적
- 에러 핸들링은 Sprint 4에서 일괄 보강

**스코프 원칙** — 각 Sprint의 태스크는 "Must Have"와 "Nice to Have"로 분리합니다. Must Have가 완료되면 Sprint를 닫고, Nice to Have는 다음 Sprint 백로그에 추가합니다.

---

## S1. Sprint 1 — Foundation Setup

*Week 1–2 · 2026.06.02 ~ 06.15 · Sprint 1 · Foundation*

**프로젝트 초기화 & 인증 시스템** — 개발 환경 구성, Supabase 연동, 소셜 로그인 3종 완성. 이후 모든 Sprint의 기반이 되는 프로젝트 골격을 확립한다.

상태: 09-24 코드 완료 · 외부 미확인 → **10-11 완료 5 · 연기 2 · 남음 1** ([00](#00-2026-10-11-현황))

### ✅ Must Have

아래 상태·근거는 **09-24 판**이다. 10-11 상태는 [00 의 Must Have 표](#must-have-29개) #1~#8.

| | 태스크 | 태그 | 09-24 상태 | 09-24 근거 |
|---|---|---|---|---|
| 🏗️ | Next.js ~~14~~ 16 App Router 프로젝트 생성 + TypeScript 설정 | FE | 완료 | `next@16.2.6`, React 19.2.4, `tsconfig.json`. 미들웨어는 Next 16 규약에 따라 `proxy.ts` (`00a4acc`). [정정 2026-09-24: 원안 "Next.js 14" → 실제 16] |
| 🎨 | Tailwind CSS + shadcn/ui 셋업 + 기본 테마 (다크모드 기본) | UX | 완료 | Tailwind v4, `components.json`, `app/layout.tsx` 의 `dark` 클래스. shadcn 컴포넌트 25개 추가는 [작업 트리] |
| 🗃️ | Supabase 프로젝트 생성 + 클라이언트 연동 (SSR 지원) | BE | 완료 | `lib/supabase/{client,server,middleware}.ts` (@supabase/ssr). 원격 프로젝트 상태·환경변수는 외부 미확인, `.env.example` 없음 |
| 🗄️ | 초기 DB 마이그레이션 — users, fan_profiles, idol_groups | DB | 완료 | `0001_initial.sql` (+ members, 가입 트리거). 원격 적용 외부 미확인. idol_groups 시드 데이터 없음 |
| 🔐 | 소셜 로그인 — Google OAuth 연동 | BE | 외부 미확인 | `LoginForm.tsx` `signInWithOAuth` + `auth/callback/route.ts`. Supabase 공급자 설정 외부 미확인. 콜백 기본 경로가 존재하지 않는 `/profile` (`14c161a`) → 로그인 직후 404 |
| 🔐 | 소셜 로그인 — Kakao OAuth 연동 | BE | 외부 미확인 | 위와 같음 |
| 🔐 | 소셜 로그인 — Twitter/X OAuth 연동 | BE | 외부 미확인 | 위와 같음 |
| 📐 | 기본 레이아웃 — 헤더, 사이드바, 푸터 컴포넌트 | FE | 완료 | `components/layout/{Header,Sidebar,Footer}.tsx`. shadcn Sidebar 기반 개편은 [작업 트리] |

### 💡 Nice to Have

| | 태스크 | 태그 |
|---|---|---|
| 👤 | 회원가입 후 닉네임 설정 온보딩 플로우 | FE |
| 🛡️ | Supabase RLS 정책 초안 (users 테이블) | DB |
| 📁 | 환경변수 관리 체계 + .env.example 작성 | OPS |
| 🔀 | 인증 미들웨어 — 비로그인 접근 리다이렉트 | FE |
| 📦 | Zustand 스토어 기본 구조 설계 | FE |

10-11 메모: 온보딩(T4-B), RLS(0004·0007), `.env.example`, proxy 보호 경로(T4-B)는 구현됨 ✅. Zustand 는 쓰지 않음.

### Deliverable

- 로그인 페이지 (Google·Kakao·Twitter)
- 인증 후 메인 페이지 진입
- Supabase DB 초기 스키마
- Vercel Preview 배포

---

## S2. Sprint 2 — Community Core

*Week 3–4 · 2026.06.16 ~ 06.29 · Sprint 2 · Community*

**게시판 · 댓글 · 좋아요 · 프로필** — 아이돌 그룹별 게시판 CRUD, 댓글/대댓글, 좋아요/스크랩 완성. 플랫폼의 핵심 콘텐츠 소비 루프를 구현한다.

상태: 09-24 부분 완료 · 완료 4/8 → **10-11 완료 5 · 축소 3** ([00](#00-2026-10-11-현황))

### ✅ Must Have

아래 상태·근거는 **09-24 판**이다. 10-11 상태는 [00 의 Must Have 표](#must-have-29개) #9~#16.

| | 태스크 | 태그 | 09-24 상태 | 09-24 근거 |
|---|---|---|---|---|
| 🗄️ | DB 마이그레이션 — posts, comments, reactions 테이블 | DB | 완료 | `0002_community.sql`. anon 전체 허용 정책을 교체하는 `0004`·`0005` 는 [작업 트리], 원격 적용 외부 미확인 |
| 🏠 | 아이돌 그룹 목록 페이지 + 그룹별 라우팅 | FE | 완료 | `app/(main)/board/page.tsx`, `board/[groupSlug]/page.tsx` (20개 페이지네이션). 그룹 데이터 입력 수단(시드/CMS) 없음 |
| 📝 | 게시글 작성 폼 (텍스트 + Markdown 지원) | FE | 부분 | `PostForm.tsx` 존재. Markdown 은 placeholder 문구뿐, 상세는 `whitespace-pre-wrap` 평문 렌더. 글 유형 라디오 선택 표시 결함(`peer` 클래스 누락) |
| 📋 | 게시판 목록 + 게시글 상세 페이지 | FE | 완료 | `board/[groupSlug]/page.tsx`, `[postId]/page.tsx` + `loading.tsx` |
| ✏️ | 게시글 수정 / 삭제 (작성자 본인만) | BE | 부분 | 서버: `.eq("author_id", userId)` (`eaf24c5`) + RLS `0004` [작업 트리]. UI 가 수정/삭제 버튼을 모든 방문자에게 노출하고, 수정 페이지에 소유자 확인 없음 |
| 💬 | 댓글 & 대댓글 작성 / 삭제 | FE | 완료 | `app/actions/comment.ts`, `CommentSection/CommentItem/CommentForm.tsx` (대댓글 1단계) |
| ❤️ | 좋아요 토글 (게시글 / 댓글) | BE | 부분 | 게시글만 (`togglePostLike`). `toggle_comment_like` RPC 는 있으나 호출 코드·UI 없음. `p_session_id` 신뢰로 카운트 조작 가능(QA 미해결) |
| 🔖 | 스크랩 기능 + 마이페이지 스크랩 목록 | FE | 부분 | 스크랩 토글만 (`togglePostScrap`, 쿠키 `session_id` 기준). `/profile` 라우트·스크랩 목록 없음 — Sidebar 의 "마이페이지" 링크는 404 |

### 💡 Nice to Have

| | 태스크 | 태그 |
|---|---|---|
| 👤 | 회원 프로필 페이지 (작성글, 댓글 이력) | FE |
| 🔢 | 게시글 조회수 카운터 (debounced update) | BE |
| 📄 | 게시판 무한 스크롤 (React Query + cursor) | FE |
| 🏷️ | 게시글 타입 분류 (텍스트 / 이미지 / 팬픽) | FE |
| 🛡️ | RLS 정책 완성 (posts, comments) | DB |

10-11 메모: 조회수는 24시간 중복 제거(`record_post_view`, 0008), 유형은 text/fanfic + 팬픽 필터 칩(T11-C), RLS 완성(0009·0011) ✅. 프로필 페이지·무한 스크롤은 없음.

### Deliverable

- 아이돌 그룹별 게시판
- 게시글 CRUD
- 댓글/대댓글
- 좋아요/스크랩
- Vercel Preview 배포

---

## S3. Sprint 3 — Realtime & Media

*Week 5–6 · 2026.06.30 ~ 07.13 · Sprint 3 · Realtime*

**실시간 채팅 · 이미지 업로드 · 반응형 UI** — Supabase Realtime 기반 그룹 채팅방, 이미지/영상 업로드, Mobile First 반응형 완성. 콘텐츠 신고 시스템으로 커뮤니티 자정 기능을 확보한다.

상태: 09-24 부분 착수 · 완료 1/6 → **10-11 완료 3 · 축소 2 · 연기 1** ([00](#00-2026-10-11-현황))

### ✅ Must Have

아래 상태·근거는 **09-24 판**이다. 10-11 상태는 [00 의 Must Have 표](#must-have-29개) #17~#22.

| | 태스크 | 태그 | 09-24 상태 | 09-24 근거 |
|---|---|---|---|---|
| 🗄️ | DB 마이그레이션 — chat_rooms, messages, chat_members | DB | 부분 | `0003_chat.sql`: chat_rooms, chat_messages. **chat_members 테이블 없음**. Realtime publication 원격 적용 외부 미확인 |
| 💬 | 아이돌 그룹별 채팅 라운지 (Supabase Realtime) | BE | 완료 | `chat/[groupSlug]/page.tsx`, `ChatRoom.tsx` `postgres_changes` 구독. 방 생성은 `get_or_create_chat_room` RPC(`0004`, [작업 트리]) |
| ⌨️ | 실시간 메시지 수신 + 타이핑 인디케이터 | FE | 부분 | 수신만 구현. presence/broadcast 코드 없음. 초기 로드가 "최근 50개"가 아니라 오래된 순 50개(`ascending: true` + `limit(50)`) *(10-11 주: 09-29 기준 코드는 이미 최근 50개였다 — TECH-DESIGN §1.1. 09-24 판단이 틀렸는지 그 사이 고쳐졌는지는 확인하지 않음)* |
| 🖼️ | 이미지 업로드 (Supabase Storage + Vercel 최적화) | BE | 미착수 | Storage 버킷·업로드 코드 없음 |
| 📱 | 반응형 UI 완성 — 모바일 레이아웃 전체 점검 | UX | 부분 | shadcn Sidebar(Sheet) + `hooks/use-mobile.ts` [작업 트리]. 전체 화면 모바일 점검 기록 없음 |
| 🚩 | 콘텐츠 신고 시스템 (게시글 / 댓글 / 메시지) | FE | 미착수 | reports 테이블·UI 없음. `is_hidden` 컬럼만 존재 |

### 💡 Nice to Have

| | 태스크 | 태그 |
|---|---|---|
| 🎬 | 영상 게시글 지원 (URL embed — YouTube/Twitter) | FE |
| 🔔 | 브라우저 푸시 알림 — 댓글 답글 실시간 | BE |
| 😊 | 채팅 이모지 반응 | FE |
| 🖼️ | 채팅 내 이미지 공유 | FE |
| 📊 | 이미지 업로드 용량/형식 validation | BE |

### Deliverable

- 실시간 채팅방
- 이미지 업로드
- 모바일 반응형 완성
- 신고 시스템
- Vercel Preview 배포

---

## S4. Sprint 4 — Admin & Launch

*Week 7–8 · 2026.07.14 ~ 07.27 · Sprint 4 · Launch*

**관리자 대시보드 · SEO · CI/CD · 출시** — 관리자 패널, SEO 최적화, GitHub Actions CI, Sentry 모니터링 연동 후 베타 출시. 1인 운영 자동화 인프라를 완성하여 지속 가능한 운영 체계를 확립한다.

상태: 09-24 미착수 · 완료 0/7 → **10-11 완료 3 · 축소 3 · 남음 1** ([00](#00-2026-10-11-현황))

### ✅ Must Have

아래 상태·근거는 **09-24 판**이다. 10-11 상태는 [00 의 Must Have 표](#must-have-29개) #23~#29.

| | 태스크 | 태그 | 09-24 상태 | 09-24 근거 |
|---|---|---|---|---|
| 🛡️ | 관리자 대시보드 — 신고 목록 + 처리 (숨김/삭제/경고) | FE | 미착수 | admin 라우트·역할(role) 컬럼·숨김 RPC 없음 |
| 🎛️ | 아이돌 그룹 관리 CMS (추가/수정/비활성화) | FE | 미착수 | 없음. idol_groups 쓰기 정책도 없음 |
| 🔍 | SEO — Next.js generateMetadata + OG 이미지 | FE | 부분 | `generateMetadata` 3곳(title 만). OG 이미지·`openGraph` 없음 |
| 🗺️ | sitemap.xml + robots.txt 자동 생성 | OPS | 미착수 | `app/sitemap.ts`·`robots.ts` 없음 |
| ⚙️ | GitHub Actions CI — lint + type-check + build | OPS | 미착수 | `.github/` 없음. `typecheck` 스크립트는 [작업 트리]에 추가됨. 현재 `eslint` 오류 2건 |
| 🚨 | Sentry 에러 모니터링 연동 (FE + Edge Functions) | OPS | 미착수 | 의존성·설정 없음 |
| 🚀 | Vercel Production 배포 + 커스텀 도메인 연결 | OPS | 미착수 | 저장소에 `vercel.json`/`.vercel` 없음. 배포 여부 외부 미확인 |

### 💡 Nice to Have

| | 태스크 | 태그 |
|---|---|---|
| 📊 | 관리자 대시보드 통계 — 가입자/게시글/신고 추이 | FE |
| ⚡ | Core Web Vitals 점검 + Lighthouse 90+ 달성 | UX |
| 🌐 | Google AdSense 기본 연동 (수익 모델 1단계) | OPS |
| 🔒 | Rate Limiting — API Route별 설정 | BE |
| 📧 | Sentry → 이메일 알림 설정 | OPS |

10-11 메모: Lighthouse 90+ 는 PRD §15 공개 출시 기준이 되어 BACKLOG P1-5 로 옮겼다. 쓰기 rate limit 은 DB 트리거·RPC 로 구현(0009·0010·0011) ✅. AdSense 는 Vercel Hobby 비상업 조건(R17) 때문에 베타 동안 넣지 않는다.

### Deliverable

- 관리자 대시보드
- SEO 최적화
- GitHub Actions CI
- Sentry 모니터링
- 🎉 Production 출시

---

## 05. Phase 2~4 예고

*Post-MVP Roadmap*

MVP 출시 후 실제 사용자 피드백을 반영하여 Phase 2 Sprint를 구체화합니다. 아래는 PRD 기준 예상 일정이며, 유저 데이터에 따라 우선순위가 변경될 수 있습니다.

| Phase | 예상 시점 | 핵심 기능 | KPI 목표 |
|---|---|---|---|
| Phase 2 · Engagement | 2026 Q3~Q4 | 팬덤 레벨, 투표/차트, 팬 캘린더, 다국어, 푸시 알림 | MAU 10,000 / DAU 30% |
| Phase 3 · Creator Economy | 2027 Q1~Q2 | 팬 마켓, 후원/펀딩, 구독 멤버십, 결제 연동 | 유료 전환 2% / 수익화 시작 |
| Phase 4 · AI & Web3 | 2027 Q4+ | AI 팬픽, AI 챗봇, NFT 카드, AR 포토 부스 | MAU 100,000 / 유료 전환 5% |

10-11 메모: 위 시점은 원안(05-31) 값이다. PRD v1.1 §15 는 이후 단계를 날짜가 아닌 앞 단계 종료 조건으로 바꿨다. Phase 2 "2026 Q3~Q4" 는 MVP 가 아직 출시 전이라 맞지 않는다 ○.

---

## 06. 변경 이력

*Changelog*

- **2026-10-11 · v1.2.0 (PM)** — HTML → Markdown 이관 + 2026-10-11 현황.
  사유: 사용자가 SPRINTS 를 md 로 관리하기로 함. 09-24 이후 진척(PR #1~#27)이 TECH-DESIGN §10 과 git 이력에만 있었음.
  변경: `docs/SPRINTS.html` 내용(Sprint 개요·타임라인·운영 원칙·Sprint 1~4 Must Have/Nice to Have/Deliverable·Phase 2~4 예고·변경 이력·09-24 현황)을 이 파일로 옮김. HTML 장식(배지·색·진행 막대)은 버리고 표로 바꿈. "2026-10-11 현황" 추가(Must Have 29개: 완료 16 · 축소 8 · 연기 3 · 남음 2). 09-24 현황은 이력으로 남기고 오래된 판임을 표시. 각 Sprint 에 10-11 상태 줄·메모 추가. 원안의 계획(기간·Must Have 목록)은 그대로. `SPRINTS.html` 은 09-24 판 원본으로 동결.
- **2026-09-24 · v1.1.0 (PM)** — 진척을 코드·git 이력 기준으로 재측정. 사유: 문서가 "Sprint 1 진행 중 (25%)" 에서 갱신되지 않은 채 계획 종료일(07-27)을 넘김. 변경: "2026-09-24 현황" 섹션 추가, Sprint 상태 배지·전체 진행률(8% → 약 53%) 정정, Must Have 29개 항목별 상태·근거 표기, "Next.js 14" → "Next.js 16"(`next@16.2.6`) 정정, 사이드바 버전/갱신일 수정. 계획(기간·Must Have 목록)은 원안 그대로 두었고, 재일정·범위 축소 제안은 `docs/BACKLOG.md` 로 분리.
- **2026-05-31 · v1.0.0** — 최초 작성.
