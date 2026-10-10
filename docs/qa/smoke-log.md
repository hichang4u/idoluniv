# 운영 스모크 (D-9 C 축소판)

운영 Supabase 에 마이그레이션을 적용한 **직후마다** 실행한다. 10분 안팎. DB 보안 규칙의 회귀는 CI(`.github/workflows/db.yml`, pgTAP)가 맡고, 여기서는 CI 가 못 보는 것(운영 DB 에만 있는 권한 차이, 실제 OAuth·Realtime)만 확인한다. 근거: `docs/design/TECH-DESIGN.md` §9.1.

## 절차

1. **백업**: `npx supabase db dump --linked -f backups/<날짜>.sql` (`backups/` 는 커밋하지 않는다)
2. **마이그레이션 적용**: `npx supabase db push --linked` (먼저 `--dry-run`)
3. **읽기 전용 확인** — Supabase 대시보드 SQL 에디터에서 아래 쿼리 실행
4. **실제 동선 확인** — 운영 사이트에서 본인 계정으로
   - 로그인 → 글 1개 작성 → 좋아요 → 삭제
   - 라운지 메시지 1개 보내기 (다른 탭에서 실시간으로 보이는지)
5. **기록** — 아래 표에 한 줄

## 3. 읽기 전용 쿼리

### S22 — anon 이 실행할 수 있는 security definer 함수

```sql
select p.oid::regprocedure::text as fn
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and p.prorettype <> 'trigger'::regtype
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by 1;
```

허용 목록(이것만 나와야 한다):

| 시점 | 허용 목록 |
|---|---|
| 0006 까지 | `get_or_create_chat_room(uuid)` + 알려진 구멍 `toggle_post_like(uuid,uuid)`, `toggle_post_scrap(uuid,uuid)`, `toggle_comment_like(uuid,uuid)`, `increment_view_count(uuid)` |
| 0008 이후 | `get_or_create_chat_room(uuid)`, `record_post_view(uuid,uuid)` |

### S21·S2 — anon 권한 (테이블 단위)

```sql
select c.relname,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') as anon_delete
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
```

기대: anon 의 INSERT·UPDATE·DELETE 는 모두 `false` (예외: 0010 전까지 `chat_messages` INSERT 는 컬럼 단위로 열려 있어 표에는 `false` 로 보일 수 있다 — 컬럼 권한은 아래로 확인).

```sql
select table_name, column_name, privilege_type
from information_schema.column_privileges
where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'
order by 1, 2;
```

### `users.email` 비공개

```sql
select has_column_privilege('anon', 'public.users', 'email', 'SELECT') as anon_email,
       has_column_privilege('authenticated', 'public.users', 'email', 'SELECT') as auth_email;
```

기대: 둘 다 `false`.

## 기록

| 날짜 | 적용한 마이그레이션 | S22 | 권한 표 | email | 로그인·글·좋아요 | 라운지 | 비고 |
|---|---|---|---|---|---|---|---|
| 2026-10-03 | 0004·0005·0006 (0001~0003 은 이력 repair) | 대기 — 대시보드 실행 필요 | 대기 | 익명 401 ✅ (API) | 해당 없음 — 그룹 0개, 앱 미배포 | 해당 없음 — 그룹 0개 | 백업 생략(Docker 없음, 콘텐츠 0행). 익명 API 확인: 글쓰기·like_count 수정 401, RPC 생성됨 |
| 2026-10-03 | 0007 | — (anon 허용 목록 변화 없음) | — | — | 해당 없음 — 앱 미배포 | 해당 없음 | 사전 점검: 원격 사용자 1명, 닉네임 null(형식 위반·대소문자 중복 0). 익명 API: `get_viewer`·`complete_onboarding` 401, `users` 직접 수정·`onboarded_at` 조회 401, `admins` 401, 공개 컬럼 200 |
| 2026-10-04 | 0008 | ✅ 익명 API 로 확인: `toggle_post_like` 401, 옛 2-인자 함수·`increment_view_count` 없음(PGRST202), `record_post_view` 호출 가능(204) — 대시보드 S22 쿼리는 여전히 대기 | — | — | 해당 없음 — 앱 미배포 | 해당 없음 | 사전 점검: 반응·글·댓글 0행(삭제될 데이터 없음). 익명 `reactions`·`post_views` 조회 401 |
| 2026-10-05 | 0009 | — (anon 허용 목록 변화 없음. `delete_comment` 는 authenticated 전용) | — | — | 해당 없음 — 앱 미배포 | 해당 없음 | 길이 CHECK validate 통과(직전 확인 2026-10-04 기준 글·댓글 0행). 익명 API: `delete_comment` 401(42501), 댓글 DELETE 401(42501), 글·댓글 읽기 200, `comments.deleted_at` 조회 200 |
| 2026-10-05 | 0010 | — (anon 허용 목록 변화 없음) | — | — | 해당 없음 — 앱 미배포 | 해당 없음 — 그룹 0개 | 사전 점검: 익명 count 채팅 메시지·방 0행. 익명 API: 채팅 쓰기 401(42501), `session_id` 조회 400(42703, 컬럼 없음), 채팅·`chat_moderation_events` 읽기 200, 이벤트 쓰기 401 |
| 2026-10-09 | 0011 | ✅ 익명 API: `submit_report`·`admin_moderate`·`admin_dismiss_reports`·`admin_report_queue` 모두 401(42501) — 허용 목록 변화 없음. 대시보드 S22 쿼리는 여전히 대기 | — | — | 해당 없음 — 앱 미배포 | 해당 없음 — 그룹 0개 | 사전 점검: 익명 count 그룹 0행. 익명 API: `reports`·`moderation_actions` 읽기 401, `idol_groups.color_key` 읽기 200, 그룹 쓰기 401 |
| 2026-10-09 | 0012 | — (함수 변화 없음) | — | — | 로그인 이후 동선은 대기 — Google 공급자 설정 필요. 비로그인 렌더 ✅(로컬 `next start` → 원격 DB: 그룹 목록 5개, 게시판 빈 상태, 글쓰기·`/admin` 은 로그인으로 307, 없는 slug 404, 옛 `/board/ive` 308) | 비로그인 렌더 ✅ (입력 대신 "로그인하고 대화에 참여하세요"). 실시간 전송은 대기 | 적용 전 그룹 0행. 익명 API 로 5개 확인, 한글 값 UTF-8 바이트 일치 |
| 2026-10-10 | — (로컬 테스트, `docs/qa/local-oauth.md`) | — | — | — | 로컬 Google 로그인 ✅ → 온보딩 ✅ → 첫 관리자 지정(SQL Editor) ✅ → `/me` 관리자 링크 ✅. 이후 playwright-cli(사용자가 직접 로그인한 창)로 390px 확인: 글쓰기 일반·팬픽 ✅, 목록 행·팬픽 필터·헤더 지표 ✅, 수정 → "수정됨" ✅, 좋아요·스크랩 새로고침 유지 ✅, 댓글 → 답글 → 답글의 답글 `@닉네임` 자동 입력 ✅, 답글 있는 댓글 삭제 → "삭제된 댓글입니다"·댓글 수 3→2 ✅, 다크 모드 전환 ✅, `/admin` 3화면 열림 ✅, 콘솔 오류 0. 발견·수정: 상세 하단 버튼 두 줄 엉킴(→ ⋯ 메뉴), 라운지 1px 넘침 | 로그인 창 전송 → 비로그인 창 실시간 표시 ✅, 같은 문구 3연속 거부 + 입력 유지 ✅ | 신고·관리자 처리(두 번째 계정 필요)는 대기. 테스트 데이터(글 2·댓글 3·메시지 3·좋아요·스크랩)는 정리 대기 |
| 2026-10-10 | — (로컬 테스트: 신고·관리자) | — | — | — | 두 번째 계정(Test user)으로 신고: 글 ⋯ 메뉴는 "신고"만(관리자 링크 없음) ✅, 신고 시트 사유 8종·사유 전 제출 비활성 ✅, 글·댓글·라운지 메시지 신고 → "신고한 … · 보기" 가림, 새로고침 후 유지 ✅. 관리자: 큐 대상별 카드 3장 ✅, 글 숨김 → 비로그인·신고자 404, 작성자 "나에게만 보여요" 배너, 목록에서 빠짐 ✅, 댓글 기각 → 큐 비움 ✅, `/admin/log` 처리자·메모 기록 ✅, 콘솔 오류 0 | **R1 확인**: 관리자 숨김 → 새로고침 없는 비로그인 창에서 "가려진 메시지입니다" ✅, 입장 전에 숨겨졌던 메시지의 숨김 해제 → 실시간으로 다시 나타남 ✅ | 자동 숨김(신고자 3명)은 계정 부족으로 pgTAP 결과로 갈음. 관찰: 숨김 해제해도 이미 닫힌(actioned) 신고는 그대로라 카드가 "숨김 처리" 탭에 남는다(설계대로). 테스트 데이터 정리 대기 |
