-- ============================================================
-- IdolUniv — Initial Schema Migration
-- Sprint 1: users, fan_profiles, idol_groups, members
-- ============================================================

-- UUID extension
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────
-- idol_groups
-- ──────────────────────────────────────────
create table public.idol_groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  name_ko     text,
  slug        text not null unique,
  agency      text,
  debut_date  date,
  cover_url   text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- members (아이돌 멤버)
-- ──────────────────────────────────────────
create table public.members (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references public.idol_groups(id) on delete cascade,
  name         text not null,
  name_ko      text,
  stage_name   text,
  birth_date   date,
  position     text[],               -- 예: ['vocal', 'rapper']
  profile_url  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- users (auth.users 확장)
-- ──────────────────────────────────────────
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  nickname     text unique,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- fan_profiles (팬덤 활동 정보)
-- ──────────────────────────────────────────
create table public.fan_profiles (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null unique references public.users(id) on delete cascade,
  level          int not null default 1,
  exp            int not null default 0,
  points         int not null default 0,
  title          text default '새내기 팬',
  badges         text[] default '{}',
  favorite_group uuid references public.idol_groups(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- 신규 유저 자동 프로비저닝 트리거
-- ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.fan_profiles (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────
-- RLS 정책
-- ──────────────────────────────────────────
alter table public.idol_groups  enable row level security;
alter table public.members      enable row level security;
alter table public.users        enable row level security;
alter table public.fan_profiles enable row level security;

-- idol_groups: 누구나 읽기, 관리자만 쓰기
create policy "idol_groups: public read"
  on public.idol_groups for select using (true);

-- members: 누구나 읽기
create policy "members: public read"
  on public.members for select using (true);

-- users: 본인 읽기/수정
create policy "users: select own"
  on public.users for select using (auth.uid() = id);
create policy "users: update own"
  on public.users for update using (auth.uid() = id);

-- fan_profiles: 본인 읽기/수정
create policy "fan_profiles: select own"
  on public.fan_profiles for select using (
    auth.uid() = user_id
  );
create policy "fan_profiles: update own"
  on public.fan_profiles for update using (
    auth.uid() = user_id
  );

-- ──────────────────────────────────────────
-- 인덱스
-- ──────────────────────────────────────────
create index idx_members_group_id    on public.members(group_id);
create index idx_fan_profiles_user   on public.fan_profiles(user_id);
create index idx_idol_groups_slug    on public.idol_groups(slug);
