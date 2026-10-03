-- ============================================================
-- IdolUniv — Onboarding & admin foundation (TECH-DESIGN §3.2 0007, §4.2·4.3)
--
-- 쓰기 = 로그인 + 온보딩 완료(닉네임 + 만 14세 확인 + 약관 동의). D-1=A.
--   - users 에 온보딩 상태 컬럼, 닉네임 형식 CHECK, 대소문자 무시 유일 인덱스
--   - 닉네임은 RPC 로만 바꾼다(30일 쿨다운, 금지어, NFC 정규화). users UPDATE 권한 회수(AD-3)
--   - 관리자 판별은 admins 테이블(D-3) + private.is_admin()
--   - RLS·트리거에서만 쓰는 헬퍼는 API 로 노출되지 않는 private 스키마에 둔다(§4.1)
--
-- 오류는 raise exception '<CODE>' using errcode = 'P0001' 로 던진다.
-- 앱은 lib/action-result.ts 의 fromDbError 로 코드를 문구로 바꾼다.
--
-- 사전 점검(적용 전 수동, 원격): 형식 위반 닉네임이 있으면 CHECK 추가가 실패하고
-- 마이그레이션 전체가 되돌려진다.
--   select nickname from public.users where nickname !~ '^[가-힣A-Za-z0-9_]{2,20}$';
-- ============================================================

-- ── 비노출 스키마 ───────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- ── users: 온보딩 상태 · 닉네임 규칙 ─────────────────────────
alter table public.users
  add column onboarded_at        timestamptz,
  add column nickname_changed_at timestamptz,
  add column terms_version       text;

alter table public.users
  add constraint users_nickname_format
  check (nickname is null or nickname ~ '^[가-힣A-Za-z0-9_]{2,20}$');   -- D-11

-- 0001 의 대소문자 구분 unique 를 대소문자 무시 unique 로 교체
create unique index users_nickname_lower_key on public.users (lower(nickname));
alter table public.users drop constraint if exists users_nickname_key;

-- 프로필 수정은 RPC 로만 (avatar_url·bio 편집 UI 는 2단계). 0004 의 컬럼 UPDATE GRANT 도 함께 회수된다.
revoke update on public.users from anon, authenticated;
-- 새 컬럼(onboarded_at 등)은 SELECT GRANT 하지 않는다 — 본인 상태는 get_viewer() 로만 읽는다.

-- ── 금지 닉네임 ─────────────────────────────────────────────
create table public.reserved_nicknames (
  word text primary key check (word = lower(word))
);
alter table public.reserved_nicknames enable row level security;  -- 정책 없음 = 클라이언트 접근 불가
revoke all on public.reserved_nicknames from anon, authenticated;
insert into public.reserved_nicknames (word) values
  ('admin'), ('administrator'), ('운영자'), ('관리자'), ('idoluniv'), ('아이돌유니브'),
  ('system'), ('익명'), ('탈퇴한사용자'), ('공식'), ('official');

-- ── 관리자 ──────────────────────────────────────────────────
create table public.admins (
  user_id    uuid primary key references public.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;   -- 정책 없음 = 클라이언트 접근 불가
revoke all on public.admins from anon, authenticated;
-- 관리자 지정은 SQL 에디터에서만: insert into public.admins (user_id) values ('<uuid>');

-- ── private 헬퍼 ────────────────────────────────────────────
create function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create function private.can_write()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.onboarded_at is not null and u.nickname is not null
  );
$$;

create function private.raise_if_cannot_write()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if not private.can_write() then
    raise exception 'ONBOARDING_REQUIRED' using errcode = 'P0001';
  end if;
end;
$$;

-- 형식 검사 + NFC 정규화 + 금지어. 통과하면 정규화된 닉네임을 돌려준다.
-- 금지어는 완전 일치 또는 금지어로 시작하는 경우(예: '운영자_1')를 막는다.
create function private.normalize_nickname(p_nickname text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v text := normalize(btrim(coalesce(p_nickname, '')), NFC);
begin
  if v !~ '^[가-힣A-Za-z0-9_]{2,20}$' then
    raise exception 'NICKNAME_INVALID' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.reserved_nicknames r
    where lower(v) = r.word or lower(v) like r.word || '%'
  ) then
    raise exception 'NICKNAME_RESERVED' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

revoke all on function private.is_admin()               from public;
revoke all on function private.can_write()              from public;
revoke all on function private.raise_if_cannot_write()  from public;
revoke all on function private.normalize_nickname(text) from public;
-- RLS 정책 안에서 호출되므로 역할에 EXECUTE 가 필요하다. private 은 API 노출 스키마가 아니다.
grant execute on function private.is_admin()  to anon, authenticated;
grant execute on function private.can_write() to authenticated;

-- ── 공개 RPC ────────────────────────────────────────────────
-- 현재 로그인 사용자의 상태. private 함수는 API 로 부를 수 없으므로 앱은 이것만 쓴다.
create function public.get_viewer()
returns table (
  id                  uuid,
  nickname            text,
  onboarded           boolean,
  is_admin            boolean,
  nickname_changed_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select u.id,
         u.nickname,
         (u.onboarded_at is not null and u.nickname is not null),
         private.is_admin(),
         u.nickname_changed_at
  from public.users u
  where u.id = auth.uid();
$$;

-- 닉네임 + 만 14세 확인 + 약관 동의. 이미 온보딩한 사용자가 다시 부르면 약관 버전만 갱신한다
-- (닉네임 변경은 change_nickname 의 쿨다운을 따른다).
create function public.complete_onboarding(
  p_nickname      text,
  p_age_over_14   boolean,
  p_agree_terms   boolean,
  p_terms_version text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_nick text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if not coalesce(p_age_over_14, false) or not coalesce(p_agree_terms, false) then
    raise exception 'CONSENT_REQUIRED' using errcode = 'P0001';
  end if;
  if coalesce(btrim(p_terms_version), '') = '' then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.users u where u.id = v_uid and u.onboarded_at is not null) then
    update public.users set terms_version = p_terms_version, updated_at = now() where id = v_uid;
    return;
  end if;

  v_nick := private.normalize_nickname(p_nickname);
  begin
    update public.users
       set nickname            = v_nick,
           onboarded_at        = now(),
           nickname_changed_at = now(),
           terms_version       = p_terms_version,
           updated_at          = now()
     where id = v_uid;
  exception when unique_violation then
    raise exception 'NICKNAME_TAKEN' using errcode = 'P0001';
  end;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

-- 닉네임 변경(30일에 1회, D-11). 다음에 바꿀 수 있는 시각을 돌려준다.
-- 쿨다운 중이면 NICKNAME_COOLDOWN, detail 에 다음 가능 시각(ISO 8601).
create function public.change_nickname(p_nickname text)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_nick    text;
  v_current text;
  v_changed timestamptz;
begin
  perform private.raise_if_cannot_write();

  select u.nickname, u.nickname_changed_at into v_current, v_changed
  from public.users u where u.id = v_uid;

  v_nick := private.normalize_nickname(p_nickname);
  if v_nick = v_current then
    return coalesce(v_changed, now()) + interval '30 days';
  end if;
  if v_changed is not null and v_changed > now() - interval '30 days' then
    raise exception 'NICKNAME_COOLDOWN' using
      errcode = 'P0001',
      detail  = to_char((v_changed + interval '30 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  begin
    update public.users
       set nickname = v_nick, nickname_changed_at = now(), updated_at = now()
     where id = v_uid;
  exception when unique_violation then
    raise exception 'NICKNAME_TAKEN' using errcode = 'P0001';
  end;
  return now() + interval '30 days';
end;
$$;

revoke all on function public.get_viewer()                                  from public, anon;
revoke all on function public.complete_onboarding(text, boolean, boolean, text) from public, anon;
revoke all on function public.change_nickname(text)                        from public, anon;
grant execute on function public.get_viewer()                                  to authenticated;
grant execute on function public.complete_onboarding(text, boolean, boolean, text) to authenticated;
grant execute on function public.change_nickname(text)                        to authenticated;
