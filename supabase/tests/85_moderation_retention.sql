-- 신고·처리 기록 보존 기간 테스트 (처리방침 3항, 0017)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- ── 데이터 (postgres 로 넣으므로 쓰기 검사 트리거는 적용되지 않는다) ──
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local');

-- r1: 13개월 전 처리(기각), r2: 11개월 전 처리, r3: 13개월 전 신고·아직 처리 중, r4: 13개월 전 처리(숨김)·handled_at 없음
insert into public.reports (id, reporter_id, target_type, target_id, reason, snapshot, status, handled_at, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'post', gen_random_uuid(), 'spam', '{}', 'dismissed', now() - interval '13 months', now() - interval '14 months'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'post', gen_random_uuid(), 'spam', '{}', 'actioned',  now() - interval '11 months', now() - interval '14 months'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b1', 'post', gen_random_uuid(), 'spam', '{}', 'open',      null,                         now() - interval '13 months'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000b2', 'post', gen_random_uuid(), 'spam', '{}', 'actioned',  null,                         now() - interval '13 months');
insert into public.moderation_actions (action, target_type, target_id, note, created_at) values
  ('hide',    'post', gen_random_uuid(), 'old',    now() - interval '13 months'),
  ('dismiss', 'post', gen_random_uuid(), 'recent', now() - interval '11 months');

-- ── 실행 ─────────────────────────────────────────────────────
select is(private.purge_expired_moderation_records(), 3, '1년 지난 처리 끝난 신고 2건과 처리 기록 1건을 지운다');

select set_eq(
  $$ select id::text from public.reports $$,
  array['00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3'],
  '처리 후 1년이 안 된 신고와 처리 중인 신고는 남는다');
select set_eq(
  $$ select note from public.moderation_actions $$,
  array['recent'],
  '1년 안 된 처리 기록은 남는다');
select is(private.purge_expired_moderation_records(), 0, '다시 실행하면 지울 것이 없다');

-- ── 권한 · 예약 ──────────────────────────────────────────────
select ok(not has_function_privilege('anon', 'private.purge_expired_moderation_records()', 'EXECUTE'),
  'anon 은 삭제 함수를 실행할 수 없다');
select ok(not has_function_privilege('authenticated', 'private.purge_expired_moderation_records()', 'EXECUTE'),
  'authenticated 는 삭제 함수를 실행할 수 없다');
select is(
  (select schedule from cron.job where jobname = 'purge-expired-moderation-records'), '15 3 * * *',
  '매일 03:15 UTC 에 실행하도록 예약돼 있다');
select ok(
  (select active from cron.job where jobname = 'purge-expired-moderation-records'),
  '예약 작업이 켜져 있다');

select * from finish();
rollback;
