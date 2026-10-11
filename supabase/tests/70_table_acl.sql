-- 테이블 권한 테스트 (BACKLOG P0-4, 0013)
-- 운영 스모크(docs/qa/smoke-log.md §3)의 권한 표 조회를 같은 기준으로 단언한다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- anon·authenticated 는 public 테이블에 직접 쓰지 않는다(쓰기는 컬럼 GRANT 또는 RPC).
-- 테이블 단위 INSERT·DELETE 와 API 가 쓰지 않는 TRUNCATE·TRIGGER·REFERENCES 는 어디에도 없어야 한다.
-- 예외: 본인 글 삭제(authenticated DELETE on posts, 0004 — 행은 RLS 가 거른다)
select is_empty(
  $$ select c.relname || ' ' || r.role || ' ' || p.priv
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join (values ('anon'), ('authenticated')) r(role)
     cross join (values ('INSERT'), ('DELETE'), ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) p(priv)
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and has_table_privilege(r.role, c.oid, p.priv)
       and not (c.relname = 'posts' and r.role = 'authenticated' and p.priv = 'DELETE') $$,
  'anon·authenticated 에 테이블 단위 INSERT·DELETE·TRUNCATE·TRIGGER·REFERENCES 가 없다 (본인 글 삭제 제외)');
select ok(has_table_privilege('authenticated', 'public.posts', 'DELETE'), 'authenticated 는 posts DELETE 권한이 있다 (0004)');

-- members 는 읽기 전용 (0013)
select ok(has_table_privilege('anon', 'public.members', 'SELECT'), 'anon 은 members 를 읽을 수 있다 (0006)');
select is_empty(
  $$ select r.role || ' ' || a.attname || ' ' || p.priv
     from pg_attribute a
     cross join (values ('anon'), ('authenticated')) r(role)
     cross join (values ('INSERT'), ('UPDATE')) p(priv)
     where a.attrelid = 'public.members'::regclass and a.attnum > 0 and not a.attisdropped
       and has_column_privilege(r.role, a.attrelid, a.attnum, p.priv) $$,
  'members 에 anon·authenticated 의 INSERT·UPDATE 권한이 컬럼 단위로도 없다 (0013)');

-- fan_profiles 는 로그인 사용자만 읽는다 (0006 의도, 0013)
select ok(not has_table_privilege('anon', 'public.fan_profiles', 'SELECT'), 'anon 은 fan_profiles 를 읽을 수 없다');
select ok(has_table_privilege('authenticated', 'public.fan_profiles', 'SELECT'), 'authenticated 는 fan_profiles 를 읽을 수 있다');

select * from finish();
rollback;
