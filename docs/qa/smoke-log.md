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
