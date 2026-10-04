-- 0009 게시글·댓글 무결성 테스트 (docs/design/TECH-DESIGN.md §4.3·4.4, §9.2 S8~S12)
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

-- P1 공개(U1), P2 공개(U1), P3 숨김(U1)
insert into public.posts (id, author_id, idol_group_id, title, content, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p1', 'body', now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p2', 'body', now() - interval '1 day', now() - interval '1 day');
insert into public.posts (id, author_id, idol_group_id, title, content, is_hidden, created_at) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'p3', 'body', true, now() - interval '1 day');
-- 댓글: D1(P1 최상위), D2(P2 최상위)
insert into public.comments (id, post_id, author_id, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'd1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'd2');

-- ── updated_at (N9) ─────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.posts set updated_at = '2000-01-01' where id = '00000000-0000-0000-0000-0000000000c1'$q$),
  '42501', 'updated_at 은 직접 쓸 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select * from public.toggle_post_like('00000000-0000-0000-0000-0000000000c1')$q$),
  'ok:1', '다른 사용자가 좋아요');
select ok((select updated_at < now() - interval '1 hour' from public.posts where id = '00000000-0000-0000-0000-0000000000c1'),
  '좋아요는 updated_at 을 바꾸지 않는다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.posts set title = 'p1 edited' where id = '00000000-0000-0000-0000-0000000000c1'$q$),
  'ok:1', '작성자가 제목 수정');
select ok((select updated_at > now() - interval '1 minute' from public.posts where id = '00000000-0000-0000-0000-0000000000c1'),
  '내용을 고치면 updated_at 이 서버 시각으로 바뀐다');

-- ── 글쓰기 검사 ─────────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b0',
  $q$insert into public.posts (author_id, idol_group_id, title, content) values ('00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000a1', 't', 'b')$q$),
  'P0001:ONBOARDING_REQUIRED', '온보딩 전에는 글을 쓸 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.posts (author_id, idol_group_id, title, content) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 't', repeat('가', 10001))$q$),
  '23514', '본문 10,001자 거부');
-- 빈도 제한: 10분에 5개
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.posts (author_id, idol_group_id, title, content)
     select '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 't' || g, 'b' from generate_series(1, 5) g$q$),
  'ok:5', '10분 안에 5개까지는 쓸 수 있다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.posts (author_id, idol_group_id, title, content) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 't6', 'b')$q$),
  'P0001:RATE_LIMITED', '6번째 글은 빈도 제한');

-- ── 댓글 검사 (S10) ────────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.comments (post_id, parent_id, author_id, content) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'x')$q$),
  'P0001:INVALID_PARENT', 'S10 다른 글의 댓글을 부모로 지정할 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.comments (id, post_id, parent_id, author_id, content) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b2', 'reply')$q$),
  'ok:1', '최상위 댓글에 대댓글');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.comments (post_id, parent_id, author_id, content) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b2', 'deep')$q$),
  'P0001:INVALID_PARENT', 'S10 대댓글에는 다시 대댓글을 달 수 없다 (1단계)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.comments (post_id, author_id, content) values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', 'x')$q$),
  'P0001:POST_NOT_FOUND', '숨김 글에는 댓글을 달 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.comments (post_id, author_id, content) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', repeat('가', 1001))$q$),
  '23514', '댓글 1,001자 거부');

-- ── 댓글 수 (F4-4) ──────────────────────────────────────────
select is((select comment_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 2,
  'P1 댓글 수 = 최상위 1 + 대댓글 1');
update public.comments set is_hidden = true where id = '00000000-0000-0000-0000-0000000000e1';
select is((select comment_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 1,
  '숨김 댓글은 댓글 수에서 빠진다');
update public.comments set is_hidden = false where id = '00000000-0000-0000-0000-0000000000e1';
select is((select comment_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 2,
  '숨김 해제하면 다시 센다');

-- ── 댓글 삭제 (S11·S12, F4-3) ──────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$delete from public.comments where id = '00000000-0000-0000-0000-0000000000d1'$q$),
  '42501', 'S11 댓글은 직접 삭제할 수 없다 (RPC 전용)');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.delete_comment('00000000-0000-0000-0000-0000000000d1')$q$),
  'P0001:FORBIDDEN', 'S12 남의 댓글은 지울 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 where public.delete_comment('00000000-0000-0000-0000-0000000000d1') = 'tombstoned'$q$),
  'ok:1', '대댓글이 있는 댓글은 자리만 남긴다');
select results_eq(
  $$ select content, deleted_at is not null from public.comments where id = '00000000-0000-0000-0000-0000000000d1' $$,
  $$ values (''::text, true) $$,
  'tombstone 은 본문을 비우고 deleted_at 을 남긴다');
select is((select comment_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 1,
  'tombstone 은 댓글 수에서 빠진다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.comments set content = 'revived' where id = '00000000-0000-0000-0000-0000000000d1'$q$),
  'ok:0', '삭제된 댓글은 내용 수정으로 되살릴 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$insert into public.comments (post_id, parent_id, author_id, content) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b2', 'x')$q$),
  'P0001:INVALID_PARENT', '삭제된 댓글에는 답글을 달 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select 1 where public.delete_comment('00000000-0000-0000-0000-0000000000e1') = 'deleted'$q$),
  'ok:1', '대댓글은 실제로 삭제된다');
select is((select count(*)::int from public.comments where id = '00000000-0000-0000-0000-0000000000d1'), 0,
  '마지막 대댓글이 지워지면 tombstone 부모도 정리된다');
select is((select comment_count from public.posts where id = '00000000-0000-0000-0000-0000000000c1'), 0,
  '모두 지우면 댓글 수 0');

-- ── 숨김 글 읽기 (F2-4, F8) ─────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select id from public.posts where id = '00000000-0000-0000-0000-0000000000c3'$q$),
  'ok:0', '다른 사용자는 숨김 글을 못 본다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  $q$select id from public.posts where id = '00000000-0000-0000-0000-0000000000c3'$q$),
  'ok:1', '관리자는 숨김 글을 본다');

select * from finish();
rollback;
