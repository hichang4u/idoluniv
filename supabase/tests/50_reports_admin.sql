-- 0011 신고·모더레이션 테스트 (docs/design/TECH-DESIGN.md §4.3, §7.7·7.8, §9.2 S17~S20)
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
-- 사용자: b1 작성자, b2·b3·b4 신고자, b5 빈도 제한용, b0 온보딩 전, b9 관리자
insert into public.idol_groups (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000a1', 'Test Group', 'test-group');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b0', 'u0@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'u3@test.local'),
  ('00000000-0000-0000-0000-0000000000b4', 'u4@test.local'),
  ('00000000-0000-0000-0000-0000000000b5', 'u5@test.local'),
  ('00000000-0000-0000-0000-0000000000b9', 'admin@test.local');
update public.users u set nickname = v.nick, onboarded_at = now()
  from (values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'user_one'),
               ('00000000-0000-0000-0000-0000000000b2'::uuid, 'user_two'),
               ('00000000-0000-0000-0000-0000000000b3'::uuid, 'user_three'),
               ('00000000-0000-0000-0000-0000000000b4'::uuid, 'user_four'),
               ('00000000-0000-0000-0000-0000000000b5'::uuid, 'user_five'),
               ('00000000-0000-0000-0000-0000000000b9'::uuid, 'admin_x')) v(id, nick)
 where u.id = v.id;
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b9');

-- 글 c1(신고 대상), c2(댓글이 달린 글), 댓글 d1(c2), 채팅 f1·f2
insert into public.posts (id, author_id, idol_group_id, title, content) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p1', 'body1'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p2', 'body2');
insert into public.posts (author_id, idol_group_id, title, content)
  select '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'rl' || lpad(n::text, 2, '0'), 'body'
  from generate_series(1, 11) n;
insert into public.comments (id, post_id, author_id, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'd1');
insert into public.chat_rooms (id, group_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1');
insert into public.chat_messages (id, room_id, author_id, nickname, content) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'user_one', 'f1'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'user_one', 'f2');

-- ── 그룹 색 ─────────────────────────────────────────────────
select is((select color_key from public.idol_groups where slug = 'test-group'), 'baby', '기존 그룹의 color_key 기본값은 baby');

-- ── 신고 자격 ───────────────────────────────────────────────
select is(pg_temp.act('anon', null,
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'spam')$q$),
  '42501', 'anon 은 신고할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b0',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'spam')$q$),
  'P0001:ONBOARDING_REQUIRED', '온보딩 전에는 신고할 수 없다');

-- ── 입력 검사 ───────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'boring')$q$),
  'P0001:VALIDATION', '없는 사유 코드 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('user', '00000000-0000-0000-0000-0000000000c1', 'spam')$q$),
  'P0001:VALIDATION', '없는 대상 유형 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'other', repeat('가', 301))$q$),
  'P0001:VALIDATION', '설명 301자 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-00000000dead', 'spam')$q$),
  'P0001:NOT_FOUND', '없는 글 신고 거부');

-- ── S17 본인·중복 ───────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'spam')$q$),
  'P0001:CANNOT_REPORT_OWN', 'S17 본인 글은 신고할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'spam', '  광고 링크  ')$q$),
  'ok:1', '신고 1');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'abuse')$q$),
  'P0001:ALREADY_REPORTED', 'S17 같은 대상을 다시 신고할 수 없다');
select results_eq(
  $$ select target_author_id, snapshot->>'title', snapshot->>'author_nickname', detail
       from public.reports where reporter_id = '00000000-0000-0000-0000-0000000000b2' and target_id = '00000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'p1'::text, 'user_one'::text, '광고 링크'::text) $$,
  '신고 시점 작성자·내용 스냅샷이 남고 설명은 앞뒤 공백을 지운다');

-- ── S18 자동 숨김 (서로 다른 신고자 3명) ────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'abuse')$q$),
  'ok:1', '신고 2');
select ok(not (select is_hidden from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), '신고 2명까지는 숨기지 않는다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b4',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'spam')$q$),
  'ok:1', '신고 3');
select ok((select is_hidden from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 'S18 3명째 신고로 자동 숨김');
select ok(exists (select 1 from public.moderation_actions
                   where action = 'auto_hide' and target_type = 'post'
                     and target_id = '00000000-0000-0000-0000-0000000000c1' and actor_id is null),
  'S18 감사 로그에 auto_hide (처리자 없음)');
select is((select count(*)::int from public.reports where target_id = '00000000-0000-0000-0000-0000000000c1' and status = 'open'),
  3, '자동 숨김 후에도 신고는 open 으로 남아 검토를 기다린다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b5',
  $q$select public.submit_report('post', '00000000-0000-0000-0000-0000000000c1', 'spam')$q$),
  'P0001:NOT_FOUND', '이미 숨긴 글은 신고할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.posts set title = 'edited' where id = '00000000-0000-0000-0000-0000000000c1'$q$),
  'ok:0', '숨김 글은 작성자도 수정할 수 없다');

-- 댓글: 자동 숨김이 댓글 수에서 빠진다
select is((select comment_count from public.posts where id = '00000000-0000-0000-0000-0000000000c2'), 1, '댓글 수 1');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('comment', '00000000-0000-0000-0000-0000000000d1', 'privacy', '숙소 정보')$q$), 'ok:1', '댓글 신고 1 (긴급)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$select public.submit_report('comment', '00000000-0000-0000-0000-0000000000d1', 'abuse')$q$), 'ok:1', '댓글 신고 2');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b4',
  $q$select public.submit_report('comment', '00000000-0000-0000-0000-0000000000d1', 'abuse')$q$), 'ok:1', '댓글 신고 3');
select ok((select is_hidden from public.comments where id = '00000000-0000-0000-0000-0000000000d1'), '댓글 자동 숨김');
select is((select comment_count from public.posts where id = '00000000-0000-0000-0000-0000000000c2'), 0, '숨긴 댓글은 댓글 수에서 빠진다');

-- 채팅: 자동 숨김이 전파 이벤트를 남긴다
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.submit_report('chat_message', '00000000-0000-0000-0000-0000000000f1', 'spam')$q$), 'ok:1', '채팅 신고 1');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$select public.submit_report('chat_message', '00000000-0000-0000-0000-0000000000f1', 'spam')$q$), 'ok:1', '채팅 신고 2');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b4',
  $q$select public.submit_report('chat_message', '00000000-0000-0000-0000-0000000000f1', 'spam')$q$), 'ok:1', '채팅 신고 3');
select ok((select is_hidden from public.chat_messages where id = '00000000-0000-0000-0000-0000000000f1'), '채팅 자동 숨김');
select results_eq(
  $$ select room_id, action from public.chat_moderation_events where message_id = '00000000-0000-0000-0000-0000000000f1' $$,
  $$ values ('00000000-0000-0000-0000-0000000000e1'::uuid, 'hide'::text) $$,
  'F6-7 채팅 숨김은 이벤트로 알린다');

-- ── 빈도 제한: 10분 10건 ────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b5',
  $q$select public.submit_report('post', p.id, 'spam') from (select id from public.posts where title like 'rl%' order by title limit 10) p$q$),
  'ok:10', '10건까지 신고');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b5',
  $q$select public.submit_report('post', id, 'spam') from public.posts where title = 'rl11'$q$),
  'P0001:RATE_LIMITED', '10분 안의 11번째 신고는 거부');

-- ── 읽기 권한 ───────────────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select 1 from public.reports$q$), '42501', 'anon 은 신고를 읽을 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2', $q$select 1 from public.reports$q$),
  'ok:3', '신고자는 자기 신고만 본다 (글·댓글·채팅 각 1)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.reports (reporter_id, target_type, target_id, reason, snapshot) values ('00000000-0000-0000-0000-0000000000b2', 'post', '00000000-0000-0000-0000-0000000000c2', 'spam', '{}')$q$),
  '42501', '신고는 RPC 로만 넣는다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$update public.reports set status = 'dismissed'$q$),
  '42501', '신고 상태는 RPC 로만 바꾼다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2', $q$select 1 from public.moderation_actions$q$),
  'ok:0', 'S19 일반 사용자는 감사 로그를 볼 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9', $q$select 1 from public.moderation_actions$q$),
  'ok:3', '관리자는 감사 로그를 본다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9', $q$select 1 from public.reports$q$),
  'ok:19', '관리자는 모든 신고를 본다 (글 3 + 댓글 3 + 채팅 3 + 빈도 제한용 10)');

-- ── S19 관리자 RPC 는 관리자만 ──────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.admin_moderate('post', '00000000-0000-0000-0000-0000000000c1', 'unhide')$q$),
  'P0001:FORBIDDEN', 'S19 일반 사용자는 admin_moderate 불가');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.admin_dismiss_reports('post', '00000000-0000-0000-0000-0000000000c1')$q$),
  'P0001:FORBIDDEN', 'S19 일반 사용자는 admin_dismiss_reports 불가');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select * from public.admin_report_queue()$q$),
  'P0001:FORBIDDEN', 'S19 일반 사용자는 admin_report_queue 불가');
select is(pg_temp.act('anon', null, $q$select * from public.admin_report_queue()$q$),
  '42501', 'anon 은 관리자 RPC 를 실행할 수 없다');

-- ── 신고 큐 ─────────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select 1 from public.admin_report_queue('open', 1, 0) q
      where q.target_type = 'comment' and q.urgent and q.report_count = 3 and q.is_hidden
        and q.details = array['숙소 정보'] and q.latest_snapshot->>'content' = 'd1'$q$),
  'ok:1', '신고 큐는 대상별로 묶고 긴급(privacy) 을 먼저 보여 준다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select 1 from public.admin_report_queue('open', 100, 0)$q$),
  'ok:13', '대상 13개 (글 c1·댓글·채팅 + 빈도 제한용 글 10)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select 1 from public.admin_report_queue('closed')$q$),
  'P0001:VALIDATION', '없는 상태값 거부');

-- ── 처리 ────────────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select public.admin_moderate('post', '00000000-0000-0000-0000-0000000000c1', 'delete')$q$),
  'P0001:INVALID_ACTION', '숨김·해제 외의 처리는 없다 (삭제 없음)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select public.admin_moderate('post', '00000000-0000-0000-0000-00000000dead', 'hide')$q$),
  'P0001:NOT_FOUND', '없는 대상');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select public.admin_moderate('post', '00000000-0000-0000-0000-0000000000c1', 'unhide', '오신고')$q$),
  'ok:1', '숨김 해제');
select ok(not (select is_hidden from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), '해제하면 다시 보인다');
select is((select count(*)::int from public.reports
            where target_id = '00000000-0000-0000-0000-0000000000c1' and status = 'dismissed'
              and handled_by = '00000000-0000-0000-0000-0000000000b9' and handled_at is not null),
  3, '해제하면 open 신고는 처리자와 함께 기각된다');
select ok(exists (select 1 from public.moderation_actions
                   where action = 'unhide' and actor_id = '00000000-0000-0000-0000-0000000000b9' and note = '오신고'),
  '해제는 처리자·메모와 함께 기록된다');

select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select public.admin_moderate('chat_message', '00000000-0000-0000-0000-0000000000f2', 'hide')$q$),
  'ok:1', '신고 없이도 숨길 수 있다');
select is((select count(*)::int from public.chat_moderation_events where message_id = '00000000-0000-0000-0000-0000000000f2' and action = 'hide'),
  1, '관리자 채팅 숨김도 이벤트로 알린다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select public.admin_moderate('chat_message', '00000000-0000-0000-0000-0000000000f1', 'hide', '확인')$q$),
  'ok:1', '자동 숨김된 채팅을 숨김으로 확정');
select is((select count(*)::int from public.reports where target_id = '00000000-0000-0000-0000-0000000000f1' and status = 'actioned'),
  3, '숨기면 open 신고는 actioned');

select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$select 1 where public.admin_dismiss_reports('comment', '00000000-0000-0000-0000-0000000000d1', '문제 없음') = 3$q$),
  'ok:1', 'admin_dismiss_reports 는 처리한 신고 수를 돌려준다');
select ok((select is_hidden from public.comments where id = '00000000-0000-0000-0000-0000000000d1'), '기각은 대상의 숨김 상태를 바꾸지 않는다');
select ok(exists (select 1 from public.moderation_actions where action = 'dismiss' and note = '문제 없음'), '기각도 기록된다');

-- ── 그룹 관리 (F8-4, S19·S20) ───────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.idol_groups (name, slug) values ('New', 'new-group')$q$),
  '42501', 'S19 일반 사용자는 그룹을 만들 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$update public.idol_groups set name = 'x' where slug = 'test-group'$q$),
  'ok:0', '일반 사용자는 그룹을 고칠 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$insert into public.idol_groups (name, slug, color_key) values ('New', 'new-group', 'pink')$q$),
  'ok:1', '관리자는 그룹을 만든다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$update public.idol_groups set color_key = 'neon' where slug = 'new-group'$q$),
  '23514', '팔레트에 없는 color_key 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$update public.idol_groups set name = 'Renamed', is_active = false where slug = 'new-group'$q$),
  'ok:1', '관리자는 이름·활성 상태를 고친다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$update public.idol_groups set slug = 'renamed' where slug = 'new-group'$q$),
  '42501', 'S20 slug 는 관리자도 바꿀 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b9',
  $q$delete from public.idol_groups where slug = 'new-group'$q$),
  '42501', '그룹은 삭제하지 않는다 (비활성화로 대체)');

select * from finish();
rollback;
