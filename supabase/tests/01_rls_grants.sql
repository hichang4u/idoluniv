-- RLS · 컬럼 GRANT 보안 테스트 (docs/design/TECH-DESIGN.md §9.2)
-- 실행: supabase test db  (CI 의 db-test 잡)
-- 아직 고치지 않은 구멍은 todo 로 표시한다. todo 테스트는 실패해도 전체를 깨지 않으며,
-- 고친 마이그레이션이 들어오면 통과하므로 그때 todo 를 지운다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- ── 헬퍼 ────────────────────────────────────────────────────
-- p_sql 을 p_role(anon|authenticated) 로 실행한다. p_uid 가 있으면 auth.uid() 가 그 값이 된다.
-- 성공: 'ok:<영향 행 수>' (SELECT 는 반환 행 수), 실패: SQLSTATE (예: 42501 = 권한 없음/RLS 위반).
-- pgTAP 단언은 postgres 로 실행되도록 역할 전환은 이 함수 안에서만 한다.
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
    -- 이 블록 안의 설정 변경(role, claims)은 서브트랜잭션과 함께 되돌려진다
    return sqlstate;
  end;
end $$;

-- ── 테스트 데이터 (postgres 로 생성) ───────────────────────
-- 그룹: g1 활성, g2 비활성
insert into public.idol_groups (id, name, slug, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'Test Group', 'test-group', true),
  ('00000000-0000-0000-0000-0000000000a2', 'Inactive Group', 'inactive-group', false);

-- 사용자: U1, U2 (handle_new_user 트리거가 public.users·fan_profiles 를 만든다)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local');
-- 쓰기에는 온보딩이 필요하다(0007·0009). 여기서는 온보딩을 마친 상태로 둔다
update public.users set nickname = 'user_one', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
update public.users set nickname = 'user_two', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b2';

-- 글: P1 (U1, 공개), P2 (U1, 숨김)
insert into public.posts (id, author_id, idol_group_id, title, content) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p1', 'body');
insert into public.posts (id, author_id, idol_group_id, title, content, is_hidden) values
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p2', 'body', true);

-- 댓글: C1 (U1, P1)
insert into public.comments (id, post_id, author_id, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'c1');

-- 채팅방
select public.get_or_create_chat_room('00000000-0000-0000-0000-0000000000a1');

-- ── users · fan_profiles ───────────────────────────────────
select is(pg_temp.act('anon', null, $q$select id, nickname from public.users$q$),
  'ok:2', 'anon 은 users 공개 컬럼을 읽을 수 있다');
select is(pg_temp.act('anon', null, $q$select email from public.users$q$),
  '42501', 'anon 은 users.email 을 읽을 수 없다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1', $q$select email from public.users$q$),
  '42501', '로그인 사용자도 users.email 을 읽을 수 없다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.fan_profiles set level = 99 where user_id = '00000000-0000-0000-0000-0000000000b1'$q$),
  '42501', '본인 fan_profiles.level 을 바꿀 수 없다 (0005)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.fan_profiles set favorite_group = '00000000-0000-0000-0000-0000000000a1' where user_id = '00000000-0000-0000-0000-0000000000b1'$q$),
  'ok:1', '본인 fan_profiles.favorite_group 은 바꿀 수 있다 (0005)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$update public.fan_profiles set favorite_group = '00000000-0000-0000-0000-0000000000a1' where user_id = '00000000-0000-0000-0000-0000000000b1'$q$),
  'ok:0', '남의 fan_profiles 는 바꿀 수 없다 (RLS 로 0행)');

-- S4: 0007 에서 users UPDATE 회수
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.users set nickname = 'renamed' where id = '00000000-0000-0000-0000-0000000000b1'$q$),
  '42501', 'S4 users.nickname 직접 수정 거부');

-- ── posts ───────────────────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select id from public.posts$q$),
  'ok:1', 'anon 은 숨김이 아닌 글만 본다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1', $q$select id from public.posts$q$),
  'ok:2', '작성자는 자기 숨김 글도 본다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2', $q$select id from public.posts$q$),
  'ok:1', '다른 사용자는 남의 숨김 글을 보지 못한다 (0004)');
select is(pg_temp.act('anon', null,
  $q$insert into public.posts (author_id, idol_group_id, title, content) values (null, '00000000-0000-0000-0000-0000000000a1', 't', 'b')$q$),
  '42501', 'anon 은 글을 쓸 수 없다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.posts (author_id, idol_group_id, title, content) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 't', 'b')$q$),
  '42501', 'S7 남을 작성자로 한 글은 쓸 수 없다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.posts (author_id, idol_group_id, title, content) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 't', 'b')$q$),
  'ok:1', '본인 글은 쓸 수 있다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$update public.posts set title = 'hijack' where id = '00000000-0000-0000-0000-0000000000c1'$q$),
  'ok:0', '남의 글은 수정되지 않는다 (RLS 로 0행)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.posts set like_count = 9999 where id = '00000000-0000-0000-0000-0000000000c1'$q$),
  '42501', 'S9 like_count 는 직접 바꿀 수 없다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.posts set is_hidden = false where id = '00000000-0000-0000-0000-0000000000c2'$q$),
  '42501', 'S9 작성자도 is_hidden 을 바꿀 수 없다 (0005)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.posts set title = 'edited' where id = '00000000-0000-0000-0000-0000000000c1'$q$),
  'ok:1', '작성자는 제목을 고칠 수 있다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$delete from public.posts where id = '00000000-0000-0000-0000-0000000000c1'$q$),
  'ok:0', '남의 글은 삭제되지 않는다 (RLS 로 0행)');

-- S8: 0009 에서 길이 CHECK·활성 그룹·유형 제한
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.posts (author_id, idol_group_id, title, content) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', repeat('가', 101), 'b')$q$),
  '23514', 'S8 제목 101자 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.posts (author_id, idol_group_id, title, content) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 't', 'b')$q$),
  '42501', 'S8 비활성 그룹에 글쓰기 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.posts (author_id, idol_group_id, title, content, post_type) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 't', 'b', 'video')$q$),
  '42501', 'S8 video 유형 새 글 거부');

-- ── comments ────────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.comments (post_id, author_id, content) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'x')$q$),
  '42501', '남을 작성자로 한 댓글은 쓸 수 없다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.comments set is_hidden = false where id = '00000000-0000-0000-0000-0000000000d1'$q$),
  '42501', '작성자도 댓글 is_hidden 을 바꿀 수 없다 (0005)');

-- ── reactions ───────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.reactions (user_id, target_type, target_id, reaction_type) values ('00000000-0000-0000-0000-0000000000b1', 'post', '00000000-0000-0000-0000-0000000000c1', 'like')$q$),
  '42501', 'reactions 는 직접 쓸 수 없다 (0004)');

-- S2: 0008 에서 공개 읽기 제거, 본인 행만
select is(pg_temp.act('anon', null, $q$select id from public.reactions$q$),
  '42501', 'S2 anon 은 reactions 를 읽을 수 없다');

-- ── chat ────────────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_rooms (group_id) values ('00000000-0000-0000-0000-0000000000a2')$q$),
  '42501', 'chat_rooms 는 직접 만들 수 없다 (0004)');
select is(pg_temp.act('anon', null,
  $q$select public.get_or_create_chat_room('00000000-0000-0000-0000-0000000000a1') where public.get_or_create_chat_room('00000000-0000-0000-0000-0000000000a1') is not null$q$),
  'ok:1', '활성 그룹의 채팅방은 RPC 로 얻는다 (0004)');
select is(pg_temp.act('anon', null,
  $q$select 1 where public.get_or_create_chat_room('00000000-0000-0000-0000-0000000000a2') is null$q$),
  'ok:1', '비활성 그룹의 채팅방은 만들어지지 않는다 (0004)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, author_id, nickname, content)
     select id, '00000000-0000-0000-0000-0000000000b2', 'x', 'hi' from public.chat_rooms limit 1$q$),
  '42501', '남의 author_id 로 채팅을 보낼 수 없다 (0004)');
select is(pg_temp.act('anon', null,
  $q$insert into public.chat_messages (room_id, nickname, content, is_hidden)
     select id, 'x', 'hi', true from public.chat_rooms limit 1$q$),
  '42501', 'is_hidden 을 지정해 채팅을 넣을 수 없다 (0004 컬럼 GRANT)');

select is(pg_temp.act('anon', null,
  $q$insert into public.chat_messages (room_id, nickname, content) select id, 'x', 'hi' from public.chat_rooms limit 1$q$),
  '42501', 'S3 anon 채팅 쓰기 거부 (0010)');

select * from finish();
rollback;
