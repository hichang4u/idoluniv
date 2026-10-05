-- 0010 채팅 테스트 (docs/design/TECH-DESIGN.md §4.4·§7.6, §9.2 S3·S13·S14·S21)
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
insert into public.idol_groups (id, name, slug, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'Test Group', 'test-group', true),
  ('00000000-0000-0000-0000-0000000000a2', 'Closed Group', 'closed-group', false);
insert into public.chat_rooms (id, group_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b0', 'u0@test.local');
update public.users set nickname = 'user_one', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
update public.users set nickname = 'user_two', onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b2';
update public.users set nickname = 'admin_x',  onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000b3';
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b3');

-- ── 스키마 ──────────────────────────────────────────────────
select hasnt_column('public', 'chat_messages', 'session_id', 'F6-6 session_id 컬럼은 없다');
select ok(exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_moderation_events'),
  'chat_moderation_events 는 Realtime 으로 전파된다');

-- ── 쓰기 자격 (S3) ──────────────────────────────────────────
select is(pg_temp.act('anon', null,
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'hi')$q$),
  '42501', 'S3 anon 은 채팅을 보낼 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b0',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'hi')$q$),
  'P0001:ONBOARDING_REQUIRED', 'S3 온보딩 전에는 채팅을 보낼 수 없다');

-- ── 정상 전송과 발신자 스냅샷 (AD-5, R13) ───────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'm1')$q$),
  'ok:1', 'room_id·content 만으로 보낼 수 있다 (트리거가 채운 컬럼은 컬럼 권한 검사 대상이 아니다)');
select results_eq(
  $$ select author_id, nickname, is_hidden from public.chat_messages where content = 'm1' $$,
  $$ values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'user_one'::text, false) $$,
  '발신자와 닉네임은 서버가 정한다');

-- ── 사칭·위조 (S13) ─────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content, author_id) values ('00000000-0000-0000-0000-0000000000e1', 'x', '00000000-0000-0000-0000-0000000000b2')$q$),
  '42501', 'S13 author_id 를 지정할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content, nickname) values ('00000000-0000-0000-0000-0000000000e1', 'x', 'admin_x')$q$),
  '42501', 'S13 nickname 을 지정할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content, is_hidden) values ('00000000-0000-0000-0000-0000000000e1', 'x', true)$q$),
  '42501', 'S13 is_hidden 을 지정할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.chat_messages set content = 'edited' where content = 'm1'$q$),
  '42501', '메시지는 수정할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$delete from public.chat_messages where content = 'm1'$q$),
  '42501', '메시지는 삭제할 수 없다');

-- ── 방·길이 ─────────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e2', 'hi')$q$),
  'P0001:ROOM_NOT_FOUND', 'F2-6 비활성 그룹 라운지에는 보낼 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-00000000dead', 'hi')$q$),
  'P0001:ROOM_NOT_FOUND', '없는 방에는 보낼 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', repeat('가', 501))$q$),
  '23514', '501자 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', '')$q$),
  '23514', '빈 메시지 거부');

-- ── 빈도 제한: 10초에 5건 (S14) ─────────────────────────────
-- U1 은 위에서 1건(m1)을 보냈다
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'm2')$q$), 'ok:1', '2번째');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'm3')$q$), 'ok:1', '3번째');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'm4')$q$), 'ok:1', '4번째');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'm5')$q$), 'ok:1', '5번째');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'm6')$q$),
  'P0001:RATE_LIMITED', 'S14 10초 안의 6번째는 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'from u2')$q$),
  'ok:1', '빈도 제한은 사용자별이다');

-- ── 같은 내용 3연속 (S14) ───────────────────────────────────
-- 테스트는 한 트랜잭션이라 now() 가 같다. 순서가 정해지도록 앞선 메시지는 과거 시각으로 넣는다.
insert into public.chat_messages (room_id, author_id, nickname, content, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b3', 'admin_x', 'go', now() - interval '40 seconds'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b3', 'admin_x', 'other', now() - interval '30 seconds');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'go')$q$),
  'ok:1', '사이에 다른 메시지가 있으면 같은 내용을 다시 보낼 수 있다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'go')$q$),
  'ok:1', '같은 내용 2연속은 허용');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'go')$q$),
  'P0001:DUPLICATE_MESSAGE', 'S14 같은 내용 3연속은 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.chat_messages (room_id, content) values ('00000000-0000-0000-0000-0000000000e1', 'go')$q$),
  'ok:1', '다른 사람이 같은 문구를 쓰는 것은 막지 않는다');

-- ── 숨김 읽기 (S21) ─────────────────────────────────────────
insert into public.chat_messages (id, room_id, author_id, nickname, content, is_hidden) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'user_one', 'hidden', true);
select is(pg_temp.act('anon', null,
  $q$select 1 from public.chat_messages where id = '00000000-0000-0000-0000-0000000000f1'$q$),
  'ok:0', 'S21 anon 은 숨김 메시지를 볼 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.chat_messages where id = '00000000-0000-0000-0000-0000000000f1'$q$),
  'ok:0', '작성자도 자기 숨김 메시지를 볼 수 없다 (채팅은 작성자 예외 없음)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$select 1 from public.chat_messages where id = '00000000-0000-0000-0000-0000000000f1'$q$),
  'ok:1', '관리자는 숨김 메시지를 볼 수 있다');
select is(pg_temp.act('anon', null,
  $q$select 1 from public.chat_messages where content = 'm1'$q$),
  'ok:1', 'anon 은 보이는 메시지를 읽을 수 있다');

-- ── 숨김 전파 이벤트 ────────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select 1 from public.chat_moderation_events$q$),
  'ok:0', 'anon 은 이벤트를 읽을 수 있다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$insert into public.chat_moderation_events (room_id, message_id, action) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', 'hide')$q$),
  '42501', '이벤트는 직접 넣을 수 없다 (관리자도 RPC 로만, 0011)');

select * from finish();
rollback;
