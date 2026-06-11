-- ============================================================
-- IdolUniv — Community Schema Migration
-- Sprint 2: posts, comments, reactions
-- ============================================================

-- ──────────────────────────────────────────
-- posts
-- ──────────────────────────────────────────
create table public.posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid references public.users(id) on delete set null,
  idol_group_id uuid references public.idol_groups(id) on delete set null,
  title         text not null,
  content       text not null,
  post_type     text not null default 'text'
                  check (post_type in ('text', 'image', 'video', 'fanfic')),
  like_count    int4 not null default 0,
  comment_count int4 not null default 0,
  view_count    int4 not null default 0,
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- comments
-- ──────────────────────────────────────────
create table public.comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid references public.users(id) on delete set null,
  parent_id  uuid references public.comments(id) on delete cascade,
  content    text not null,
  like_count int4 not null default 0,
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- reactions (like + scrap)
-- session_id: 로그인 없이 익명 사용자 추적용 UUID (쿠키 저장)
-- user_id: 로그인 후 연결 (nullable until auth)
-- ──────────────────────────────────────────
create table public.reactions (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null,
  user_id       uuid references public.users(id) on delete cascade,
  target_type   text not null check (target_type in ('post', 'comment')),
  target_id     uuid not null,
  reaction_type text not null check (reaction_type in ('like', 'scrap')),
  created_at    timestamptz not null default now(),
  unique (session_id, target_type, target_id, reaction_type)
);

-- ──────────────────────────────────────────
-- 트리거: comment 추가/삭제 시 posts.comment_count 동기화
-- ──────────────────────────────────────────
create or replace function public.sync_comment_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_comment_count
  after insert or delete on public.comments
  for each row execute procedure public.sync_comment_count();

-- ──────────────────────────────────────────
-- 함수: 좋아요 토글 (post)
-- 반환: true = liked, false = unliked
-- ──────────────────────────────────────────
create or replace function public.toggle_post_like(
  p_post_id    uuid,
  p_session_id uuid
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from public.reactions
    where session_id = p_session_id
      and target_type = 'post'
      and target_id = p_post_id
      and reaction_type = 'like'
  ) into v_exists;

  if v_exists then
    delete from public.reactions
    where session_id = p_session_id
      and target_type = 'post'
      and target_id = p_post_id
      and reaction_type = 'like';

    update public.posts
    set like_count = greatest(like_count - 1, 0)
    where id = p_post_id;

    return false;
  else
    insert into public.reactions (session_id, target_type, target_id, reaction_type)
    values (p_session_id, 'post', p_post_id, 'like')
    on conflict do nothing;

    update public.posts
    set like_count = like_count + 1
    where id = p_post_id;

    return true;
  end if;
end;
$$;

-- ──────────────────────────────────────────
-- 함수: 스크랩 토글 (post)
-- ──────────────────────────────────────────
create or replace function public.toggle_post_scrap(
  p_post_id    uuid,
  p_session_id uuid
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from public.reactions
    where session_id = p_session_id
      and target_type = 'post'
      and target_id = p_post_id
      and reaction_type = 'scrap'
  ) into v_exists;

  if v_exists then
    delete from public.reactions
    where session_id = p_session_id
      and target_type = 'post'
      and target_id = p_post_id
      and reaction_type = 'scrap';
    return false;
  else
    insert into public.reactions (session_id, target_type, target_id, reaction_type)
    values (p_session_id, 'post', p_post_id, 'scrap')
    on conflict do nothing;
    return true;
  end if;
end;
$$;

-- ──────────────────────────────────────────
-- 함수: 댓글 좋아요 토글
-- ──────────────────────────────────────────
create or replace function public.toggle_comment_like(
  p_comment_id uuid,
  p_session_id uuid
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from public.reactions
    where session_id = p_session_id
      and target_type = 'comment'
      and target_id = p_comment_id
      and reaction_type = 'like'
  ) into v_exists;

  if v_exists then
    delete from public.reactions
    where session_id = p_session_id
      and target_type = 'comment'
      and target_id = p_comment_id
      and reaction_type = 'like';

    update public.comments
    set like_count = greatest(like_count - 1, 0)
    where id = p_comment_id;

    return false;
  else
    insert into public.reactions (session_id, target_type, target_id, reaction_type)
    values (p_session_id, 'comment', p_comment_id, 'like')
    on conflict do nothing;

    update public.comments
    set like_count = like_count + 1
    where id = p_comment_id;

    return true;
  end if;
end;
$$;

-- ──────────────────────────────────────────
-- 함수: 조회수 증가
-- ──────────────────────────────────────────
create or replace function public.increment_view_count(p_post_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.posts set view_count = view_count + 1 where id = p_post_id;
$$;

-- ──────────────────────────────────────────
-- RLS 정책 (개발 단계: anon 전체 허용 — 인증 구현 후 교체)
-- ──────────────────────────────────────────
alter table public.posts     enable row level security;
alter table public.comments  enable row level security;
alter table public.reactions enable row level security;

-- posts
create policy "posts: public read"   on public.posts for select using (true);
create policy "posts: anon insert"   on public.posts for insert with check (true);
create policy "posts: anon update"   on public.posts for update using (true);
create policy "posts: anon delete"   on public.posts for delete using (true);

-- comments
create policy "comments: public read"  on public.comments for select using (true);
create policy "comments: anon insert"  on public.comments for insert with check (true);
create policy "comments: anon update"  on public.comments for update using (true);
create policy "comments: anon delete"  on public.comments for delete using (true);

-- reactions
create policy "reactions: public read"  on public.reactions for select using (true);
create policy "reactions: anon insert"  on public.reactions for insert with check (true);
create policy "reactions: anon delete"  on public.reactions for delete using (true);

-- ──────────────────────────────────────────
-- 인덱스
-- ──────────────────────────────────────────
create index idx_posts_group_id     on public.posts(idol_group_id);
create index idx_posts_created_at   on public.posts(created_at desc);
create index idx_posts_author_id    on public.posts(author_id);

create index idx_comments_post_id   on public.comments(post_id);
create index idx_comments_parent_id on public.comments(parent_id);

create index idx_reactions_target   on public.reactions(target_type, target_id);
create index idx_reactions_session  on public.reactions(session_id);
