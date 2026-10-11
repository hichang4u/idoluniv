-- 댓글 공개 범위 테스트 (0009·0015, TECH-DESIGN §9.2 S3·S21)
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

-- ── 데이터 (postgres 로 넣으므로 쓰기 검사 트리거는 적용되지 않는다) ──
insert into public.idol_groups (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000a1', 'Test Group', 'test-group');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b0', 'u0@test.local');
update public.users set nickname = 'user_one', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
update public.users set nickname = 'user_two', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b2';
update public.users set nickname = 'admin_x',  onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b3';
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b3');

-- P1 공개(U1), P2 숨김(U1)
insert into public.posts (id, author_id, idol_group_id, title, content) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p1', 'body');
insert into public.posts (id, author_id, idol_group_id, title, content, is_hidden) values
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p2', 'body', true);
-- D1: P1 공개 댓글(U2), D2: P1 숨김 댓글(U2), D3: 숨김 글 P2 의 공개 댓글(U2)
insert into public.comments (id, post_id, author_id, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'd1'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'd3');
insert into public.comments (id, post_id, author_id, content, is_hidden) values
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'd2', true);

-- ── S21: 숨김 댓글 ───────────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select 1 from public.comments where id = '00000000-0000-0000-0000-0000000000d2'$q$),
  'ok:0', 'S21 anon 은 숨김 댓글을 볼 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select 1 from public.comments where id = '00000000-0000-0000-0000-0000000000d2'$q$),
  'ok:1', 'S21 댓글 작성자는 자기 숨김 댓글을 볼 수 있다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.comments where id = '00000000-0000-0000-0000-0000000000d2'$q$),
  'ok:0', 'S21 다른 사용자는 숨김 댓글을 볼 수 없다');

-- ── 0015: 숨김 글의 댓글 ─────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select 1 from public.comments where post_id = '00000000-0000-0000-0000-0000000000c2'$q$),
  'ok:0', 'anon 은 숨김 글의 댓글을 볼 수 없다 (0015)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select 1 from public.comments where post_id = '00000000-0000-0000-0000-0000000000c2'$q$),
  'ok:0', '숨김 글에 댓글을 단 사용자도 글을 볼 수 없으므로 댓글을 볼 수 없다 (0015)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.comments where post_id = '00000000-0000-0000-0000-0000000000c2'$q$),
  'ok:1', '숨김 글 작성자는 그 글의 댓글을 볼 수 있다 (0015)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$select 1 from public.comments where post_id = '00000000-0000-0000-0000-0000000000c2'$q$),
  'ok:1', '관리자는 숨김 글의 댓글을 볼 수 있다 (0015)');
select is(pg_temp.act('anon', null, $q$select 1 from public.comments where id = '00000000-0000-0000-0000-0000000000d1'$q$),
  'ok:1', '공개 글의 공개 댓글은 anon 도 볼 수 있다');

-- ── S3: 온보딩 전 사용자의 댓글 ──────────────────────────────
select ok(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b0',
  $q$insert into public.comments (post_id, content, author_id) values ('00000000-0000-0000-0000-0000000000c1', 'hi', '00000000-0000-0000-0000-0000000000b0')$q$)
  in ('42501', 'P0001:ONBOARDING_REQUIRED'),
  'S3 온보딩 전 사용자는 댓글을 쓸 수 없다');

select * from finish();
rollback;
