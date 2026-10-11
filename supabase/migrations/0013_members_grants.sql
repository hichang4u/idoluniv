-- ============================================================
-- IdolUniv — 남은 기본 권한 회수 (BACKLOG P0-4, docs/qa/smoke-log.md 2026-10-11)
--
-- 왜: 운영 DB 의 권한 표(smoke-log §3)에서 두 가지가 0006 의 의도와 달랐다.
--   (1) members — anon·authenticated 에 INSERT·UPDATE·DELETE 가 테이블·컬럼 단위로 남아 있다.
--       0001 에서 Supabase 의 "새 객체 자동 GRANT" 로 받은 권한이다. 다른 테이블은
--       0004~0011 에서 회수했는데 members 만 빠졌다. 쓰기 정책이 없어 RLS 가 막고 있지만
--       (익명 INSERT 42501 확인), 정책 하나가 실수로 생기면 바로 열린다.
--   (2) fan_profiles — anon 에 SELECT 가 있다. 0006 은 authenticated 에만 의도했다
--       ("select own" 정책이라 anon 에게는 0행).
-- 같은 자리에서 API 가 쓰지 않는 TRUNCATE·TRIGGER·REFERENCES 도 회수한다.
-- TRUNCATE 는 RLS 를 거치지 않고, PostgREST 가 실행하지 않으므로 앱 동작은 바뀌지 않는다.
--
-- 새 환경(로컬·CI)은 자동 GRANT 가 꺼져 있어 (1)(2) 가 처음부터 없다. 이 마이그레이션은
-- 운영을 새 환경과 같은 상태로 맞춘다. 2026-10-30 기본 권한 전환(R2)은 기존 객체 권한을
-- 바꾸지 않으므로, 전환 전에 정리해 둔다.
-- ============================================================

revoke insert, update, delete on public.members from anon, authenticated;
-- 권한 표의 컬럼 권한이 테이블 권한에서 온 것인지 확인하지 않았다. 컬럼 단위 GRANT 가 따로
-- 있으면 테이블 단위 REVOKE 로 지워지지 않으므로 컬럼 단위로도 회수한다(없으면 효과 없음)
revoke insert (id, group_id, name, name_ko, stage_name, position, birth_date, profile_url, is_active, created_at),
       update (id, group_id, name, name_ko, stage_name, position, birth_date, profile_url, is_active, created_at)
  on public.members from anon, authenticated;

revoke select on public.fan_profiles from anon;

-- public 의 모든 테이블에서 API 가 쓰지 않는 권한
do $$
declare t regclass;
begin
  for t in
    select c.oid::regclass from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('revoke truncate, trigger, references on %s from anon, authenticated', t);
  end loop;
end $$;
