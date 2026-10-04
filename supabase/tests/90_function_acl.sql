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

-- S1·S22: 0008 에서 toggle_* 를 auth.uid() 기반으로 바꾸고 anon EXECUTE 회수
select set_eq('select fn from anon_definer_functions',
  array['get_or_create_chat_room(uuid)', 'record_post_view(uuid,uuid)'],
  'S22 anon 이 실행할 수 있는 security definer 함수는 허용 목록뿐이다');
select ok(not has_function_privilege('anon', 'public.toggle_post_like(uuid)', 'EXECUTE'),
  'S1 anon 은 toggle_post_like 를 실행할 수 없다');
select hasnt_function('public', 'toggle_post_like', array['uuid', 'uuid'],
  'session_id 를 받던 옛 toggle_post_like(uuid, uuid) 는 남아 있지 않다');
select hasnt_function('public', 'increment_view_count', array['uuid'],
  '중복 제거 없던 increment_view_count 는 남아 있지 않다');

select * from finish();
rollback;
