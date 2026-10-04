-- 0008 반응·조회수 테스트 (docs/design/TECH-DESIGN.md §4.3, §9.2 S1·S2·S15·S16)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

create function pg_temp.act(p_role text, p_uid uuid, p_sql text) returns text
language plpgsql as $$
declare n bigint;
begin
  begin
    perform set_config('request.jwt.claims',
      case when p_uid is null then '' else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
    execute format('set local role %I', p_role);
    execute p_sql;
    get diagnostics n = row_count;
    reset role;
    return 'ok:' || n;
  exception when others then
    return case when sqlstate = 'P0001' then 'P0001:' || sqlerrm else sqlstate end;
  end;
end $$;

-- ── 데이터 ──────────────────────────────────────────────────
insert into public.idol_groups (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000a1', 'Test Group', 'test-group');
-- U1·U2 온보딩 완료, U0 온보딩 전
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local'),
  ('00000000-0000-0000-0000-0000000000b0', 'u0@test.local');
update public.users set nickname = 'user_one', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
update public.users set nickname = 'user_two', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b2';
-- P1 공개, P2 숨김
insert into public.posts (id, author_id, idol_group_id, title, content) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p1', 'body');
insert into public.posts (id, author_id, idol_group_id, title, content, is_hidden) values
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p2', 'body', true);
insert into public.comments (id, post_id, author_id, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'c1');

-- ── 좋아요 권한 ─────────────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select * from public.toggle_post_like('00000000-0000-0000-0000-0000000000c1')$q$),
  '42501', 'S1 anon 은 좋아요를 누를 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b0',
  $q$select * from public.toggle_post_like('00000000-0000-0000-0000-0000000000c1')$q$),
  'P0001:ONBOARDING_REQUIRED', 'D-13 온보딩 전에는 좋아요 불가');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select * from public.toggle_post_like('00000000-0000-0000-0000-0000000000c2')$q$),
  'P0001:NOT_FOUND', '숨김 글에는 좋아요 불가');

-- ── 좋아요 토글 ─────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.toggle_post_like('00000000-0000-0000-0000-0000000000c1') where liked and like_count = 1$q$),
  'ok:1', '처음 누르면 좋아요, 카운트 1');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.toggle_post_like('00000000-0000-0000-0000-0000000000c1') where not liked and like_count = 0$q$),
  'ok:1', '다시 누르면 취소, 카운트 0');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select * from public.toggle_post_like('00000000-0000-0000-0000-0000000000c1')$q$),
  'ok:1', 'U1 다시 좋아요');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select 1 from public.toggle_post_like('00000000-0000-0000-0000-0000000000c1') where liked and like_count = 2$q$),
  'ok:1', 'U2 좋아요 → 카운트 2');
select is(
  (select like_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'),
  (select count(*)::int from public.reactions
    where target_type = 'post' and target_id = '00000000-0000-0000-0000-0000000000c1' and reaction_type = 'like'),
  'S15 like_count 는 실제 좋아요 행 수와 같다');

-- ── reactions 읽기 (S2) ────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select id from public.reactions$q$),
  '42501', 'S2 anon 은 reactions 를 읽을 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1', $q$select id from public.reactions$q$),
  'ok:1', 'S2 로그인 사용자는 본인 반응만 본다');

-- ── 스크랩 · 댓글 좋아요 ────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 where public.toggle_post_scrap('00000000-0000-0000-0000-0000000000c1')$q$),
  'ok:1', '스크랩 켜기');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 where not public.toggle_post_scrap('00000000-0000-0000-0000-0000000000c1')$q$),
  'ok:1', '스크랩 끄기');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select 1 from public.toggle_comment_like('00000000-0000-0000-0000-0000000000d1') where liked and like_count = 1$q$),
  'ok:1', '댓글 좋아요');

-- ── 조회수 (S16) ────────────────────────────────────────────
select is(pg_temp.act('anon', null,
  $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c1', '11111111-1111-1111-1111-111111111111')$q$),
  'ok:1', '비로그인 조회 기록');
select is(pg_temp.act('anon', null,
  $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c1', '11111111-1111-1111-1111-111111111111')$q$),
  'ok:1', '같은 키로 다시 조회');
select is((select view_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 1,
  'S16 같은 비로그인 키는 24시간 안에 한 번만 센다');
select is(pg_temp.act('anon', null,
  $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c1', '22222222-2222-2222-2222-222222222222')$q$),
  'ok:1', '다른 키는 따로 센다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c1', '33333333-3333-3333-3333-333333333333')$q$),
  'ok:1', '로그인 사용자 조회');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c1', '44444444-4444-4444-4444-444444444444')$q$),
  'ok:1', '로그인 사용자가 키를 바꿔 다시 조회');
select is((select view_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 3,
  'S16 로그인 사용자는 키 인자와 무관하게 한 번만 센다');
update public.post_views set viewed_at = now() - interval '25 hours'
  where viewer_key = 'u:00000000-0000-0000-0000-0000000000b1';
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c1')$q$),
  'ok:1', '24시간 뒤 다시 조회');
select is((select view_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 4,
  '24시간이 지나면 다시 센다');
select is(pg_temp.act('anon', null,
  $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c2', '11111111-1111-1111-1111-111111111111')$q$),
  'ok:1', '숨김 글 조회 기록 호출');
select is((select view_count from public.posts where id = '00000000-0000-0000-0000-0000000000c2'), 0,
  '숨김 글은 조회수가 오르지 않는다');
select is(pg_temp.act('anon', null, $q$select public.record_post_view('00000000-0000-0000-0000-0000000000c1')$q$),
  'ok:1', '키 없는 비로그인 호출은 무시');
select is((select view_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 4,
  '키 없는 비로그인 호출은 세지 않는다');
select is(pg_temp.act('anon', null, $q$select * from public.post_views$q$),
  '42501', 'post_views 는 읽을 수 없다');

select * from finish();
rollback;
