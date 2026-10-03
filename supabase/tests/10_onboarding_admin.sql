-- 0007 온보딩·관리자 테스트 (docs/design/TECH-DESIGN.md §4.3, §9.2 S4~S6)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- p_sql 을 p_role 로 실행. 성공: 'ok:<행 수>', 실패: SQLSTATE, DB 함수가 던진 코드(P0001)는 'P0001:<CODE>'
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'u1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'u2@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'u3@test.local');

-- ── get_viewer ──────────────────────────────────────────────
select is(pg_temp.act('anon', null, $q$select * from public.get_viewer()$q$),
  '42501', 'anon 은 get_viewer 를 부를 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.get_viewer() where not onboarded and not is_admin and nickname is null$q$),
  'ok:1', '가입 직후: 온보딩 전, 관리자 아님');

-- ── complete_onboarding ─────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.complete_onboarding('하루별빛', false, true, 'v1')$q$),
  'P0001:CONSENT_REQUIRED', '만 14세 확인 없이 온보딩 불가');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.complete_onboarding('하', true, true, 'v1')$q$),
  'P0001:NICKNAME_INVALID', '1자 닉네임 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.complete_onboarding('하루 별빛', true, true, 'v1')$q$),
  'P0001:NICKNAME_INVALID', '공백이 든 닉네임 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.complete_onboarding('ADMIN', true, true, 'v1')$q$),
  'P0001:NICKNAME_RESERVED', 'S6 금지어는 대소문자 무관하게 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.complete_onboarding('운영자_1', true, true, 'v1')$q$),
  'P0001:NICKNAME_RESERVED', 'S6 금지어로 시작하는 닉네임 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.complete_onboarding('Haru_1', true, true, 'v1')$q$),
  'ok:1', '정상 온보딩');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.get_viewer() where onboarded and nickname = 'Haru_1'$q$),
  'ok:1', '온보딩 후 get_viewer 가 onboarded = true');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.complete_onboarding('haru_1', true, true, 'v1')$q$),
  'P0001:NICKNAME_TAKEN', 'S6 대소문자만 다른 닉네임은 중복');

-- NFD(자모 분리)로 들어온 한글은 NFC 로 저장된다
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b3',
  format($q$select public.complete_onboarding(%L, true, true, 'v1')$q$, normalize('별빛', NFD))),
  'ok:1', 'NFD 한글 닉네임도 받아들인다');
select is((select nickname from public.users where id = '00000000-0000-0000-0000-0000000000b3'),
  normalize('별빛', NFC), 'NFD 입력은 NFC 로 저장된다');

-- 이미 온보딩한 사용자가 다시 부르면 약관 버전만 갱신, 닉네임은 그대로
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.complete_onboarding('Other', true, true, 'v2')$q$),
  'ok:1', '재호출은 약관 버전 갱신');
select results_eq(
  $$ select nickname, terms_version from public.users where id = '00000000-0000-0000-0000-0000000000b1' $$,
  $$ values ('Haru_1'::text, 'v2'::text) $$,
  '재호출로 닉네임은 바뀌지 않는다');

-- ── change_nickname (S5) ────────────────────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select public.change_nickname('Newbie')$q$),
  'P0001:ONBOARDING_REQUIRED', '온보딩 전에는 닉네임 변경 불가');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.change_nickname('Haru_2')$q$),
  'P0001:NICKNAME_COOLDOWN', 'S5 온보딩 직후 30일 안에는 변경 불가');
update public.users set nickname_changed_at = now() - interval '31 days'
  where id = '00000000-0000-0000-0000-0000000000b1';
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.change_nickname('Haru_2')$q$),
  'ok:1', '30일이 지나면 변경 가능');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select public.change_nickname('Haru_3')$q$),
  'P0001:NICKNAME_COOLDOWN', 'S5 변경 직후 다시 변경 불가');

-- ── users 직접 수정 · 비공개 컬럼 (S4) ──────────────────────
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.users set nickname = 'direct' where id = '00000000-0000-0000-0000-0000000000b1'$q$),
  '42501', 'S4 users.nickname 직접 수정 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$update public.users set onboarded_at = null where id = '00000000-0000-0000-0000-0000000000b1'$q$),
  '42501', 'onboarded_at 직접 수정 거부');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select onboarded_at from public.users$q$),
  '42501', 'onboarded_at 은 select 할 수 없다 (get_viewer 로만)');
select is(pg_temp.act('anon', null, $q$select id, nickname from public.users$q$),
  'ok:3', '공개 컬럼은 계속 읽을 수 있다');

-- ── admins · reserved_nicknames ─────────────────────────────
select is(pg_temp.act('anon', null, $q$select * from public.admins$q$),
  '42501', 'anon 은 admins 를 읽을 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b1')$q$),
  '42501', '스스로 관리자가 될 수 없다');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select * from public.reserved_nicknames$q$),
  '42501', '금지어 목록은 읽을 수 없다');

insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b2');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b2',
  $q$select 1 from public.get_viewer() where is_admin$q$),
  'ok:1', 'admins 에 있으면 get_viewer.is_admin = true');
select is(pg_temp.act('authenticated', '00000000-0000-0000-0000-0000000000b1',
  $q$select 1 from public.get_viewer() where not is_admin$q$),
  'ok:1', '다른 사용자는 관리자가 아니다');

-- private 헬퍼는 API 노출 스키마가 아니고, anon 이 직접 호출해도 쓰기 권한 판별만 돌려준다
select is(pg_temp.act('anon', null, $q$select private.can_write()$q$),
  '42501', 'anon 은 private.can_write 를 실행할 수 없다');

select * from finish();
rollback;
