-- 라운지 메시지 보존 기간 테스트 (F6-8, 0014)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- ── 데이터 (postgres 로 넣으므로 쓰기 검사 트리거는 적용되지 않는다) ──
insert into public.idol_groups (id, name, slug, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'Test Group', 'test-group', true);
insert into public.chat_rooms (id, group_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local');

-- f1: 91일 전, f2: 89일 전, f3: 91일 전 + 처리 중 신고, f4: 91일 전 + 처리 끝난 신고
insert into public.chat_messages (id, room_id, author_id, nickname, content, created_at) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'u1', 'old',      now() - interval '91 days'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'u1', 'recent',   now() - interval '89 days'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'u1', 'reported', now() - interval '91 days'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'u1', 'handled',  now() - interval '91 days');
insert into public.reports (reporter_id, target_type, target_id, reason, snapshot, status) values
  ('00000000-0000-0000-0000-0000000000b2', 'chat_message', '00000000-0000-0000-0000-0000000000f3', 'spam', '{}', 'open'),
  ('00000000-0000-0000-0000-0000000000b2', 'chat_message', '00000000-0000-0000-0000-0000000000f4', 'spam', '{}', 'dismissed');
insert into public.chat_moderation_events (room_id, message_id, action, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', 'hide', now() - interval '91 days'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f2', 'hide', now() - interval '1 day');

-- ── 실행 ─────────────────────────────────────────────────────
select is(private.purge_expired_chat_messages(), 2, '90일 지난 메시지 중 처리 중 신고가 없는 2건을 지운다');

select set_eq(
  $$ select id::text from public.chat_messages where room_id = '00000000-0000-0000-0000-0000000000e1' $$,
  array['00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3'],
  '90일 안 된 메시지와 처리 중 신고가 걸린 메시지는 남는다');
select is((select count(*)::int from public.reports where target_id = '00000000-0000-0000-0000-0000000000f4'), 1,
  '메시지가 지워져도 신고 기록(snapshot)은 남는다');
select set_eq(
  $$ select message_id::text from public.chat_moderation_events $$,
  array['00000000-0000-0000-0000-0000000000f2'],
  '90일 지난 숨김 이벤트는 지운다');
select is(private.purge_expired_chat_messages(), 0, '다시 실행하면 지울 것이 없다');

-- ── 권한 · 예약 ──────────────────────────────────────────────
select ok(not has_function_privilege('anon', 'private.purge_expired_chat_messages()', 'EXECUTE'),
  'anon 은 삭제 함수를 실행할 수 없다');
select ok(not has_function_privilege('authenticated', 'private.purge_expired_chat_messages()', 'EXECUTE'),
  'authenticated 는 삭제 함수를 실행할 수 없다');
select is(
  (select schedule from cron.job where jobname = 'purge-expired-chat-messages'), '0 3 * * *',
  '매일 03:00 UTC 에 실행하도록 예약돼 있다');
select ok(
  (select active from cron.job where jobname = 'purge-expired-chat-messages'),
  '예약 작업이 켜져 있다');

select * from finish();
rollback;
