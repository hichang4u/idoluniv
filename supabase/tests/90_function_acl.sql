-- 함수 실행 권한 테스트 (docs/design/TECH-DESIGN.md §9.2 S1·S22)
-- 운영 스모크(docs/qa/smoke-log.md)도 같은 조회를 원격에서 읽기 전용으로 실행한다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- public 스키마의 security definer 함수 중 anon 이 실행할 수 있는 것 (트리거 함수 제외)
create temp view anon_definer_functions as
  select p.oid::regprocedure::text as fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('anon', p.oid, 'EXECUTE');

-- 모든 security definer 함수는 search_path 를 고정해야 한다 (§4.1)
select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'security definer 함수는 모두 search_path 를 고정한다');

select ok(has_function_privilege('anon', 'public.get_or_create_chat_room(uuid)', 'EXECUTE'),
  'anon 은 get_or_create_chat_room 을 실행할 수 있다 (0004)');

select todo('S1·S22: session_id 를 믿는 toggle_*·increment_view_count 를 anon 이 실행할 수 있다 — 0008 에서 회수', 2);
select set_eq('select fn from anon_definer_functions',
  array['get_or_create_chat_room(uuid)'],
  'S22 anon 이 실행할 수 있는 security definer 함수는 허용 목록뿐이다');
select ok(not has_function_privilege('anon', 'public.toggle_post_like(uuid, uuid)', 'EXECUTE'),
  'S1 anon 은 toggle_post_like(uuid, uuid) 를 실행할 수 없다');

select * from finish();
rollback;
