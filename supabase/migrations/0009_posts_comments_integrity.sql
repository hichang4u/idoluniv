-- ============================================================
-- IdolUniv — Posts & comments integrity (TECH-DESIGN §3.2 0009, §4.3·4.4, AD-4·AD-11)
--
-- 막는 것:
--   N6  글·댓글 길이 제약이 DB 에 없음 (PostgREST 직접 호출로 Server Action 검사 우회)
--   N7  댓글 parent_id 검증 없음 (다른 글의 댓글을 부모로, 무한 깊이)
--   N9  updated_at 을 클라이언트가 임의 값으로 씀
--   F3-2 새 글 유형은 text/fanfic 만, F2-6 비활성 그룹 글쓰기 금지
--   F4-3 대댓글이 있는 댓글 삭제 시 자리 유지(tombstone), F4-4 댓글 수는 보이는 댓글만
--   AD-4 빈도 제한: 글 10분 5개, 댓글 1분 10개 (🟡, 함수 상단 상수)
--   D-1=A 쓰기 = 로그인 + 온보딩 완료
--
-- 쓰기 검사 트리거는 API 역할(anon·authenticated)로 들어온 쓰기에만 적용한다.
-- 관리자 SQL·마이그레이션·테스트 데이터 입력(postgres)은 검사하지 않는다.
-- PostgREST 는 요청마다 SET ROLE 을 하므로 role 설정값으로 구분한다(security definer 안에서도 유지).
-- ============================================================

-- ── 길이 CHECK (N6) ─────────────────────────────────────────
-- not valid 로 걸고 바로 validate: 기존 위반 행이 있으면 여기서 실패하고 전체가 되돌려진다.
alter table public.posts
  add constraint posts_title_len   check (char_length(title)   between 1 and 100)   not valid,
  add constraint posts_content_len check (char_length(content) between 1 and 10000) not valid;
alter table public.posts validate constraint posts_title_len;
alter table public.posts validate constraint posts_content_len;

alter table public.comments add column deleted_at timestamptz;
alter table public.comments
  add constraint comments_content_len
  check (deleted_at is not null or char_length(content) between 1 and 1000) not valid;
alter table public.comments validate constraint comments_content_len;

-- ── 공통 헬퍼 ───────────────────────────────────────────────
create function private.is_api_role()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated');
$$;

create function private.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.is_api_role()    from public;
revoke all on function private.set_updated_at() from public;

-- ── updated_at 은 서버가 정한다 (N9) ────────────────────────
-- 카운터(like_count 등) 갱신이 updated_at 을 바꾸지 않도록 내용 컬럼으로 한정한다.
create trigger posts_set_updated_at
  before update of title, content, post_type on public.posts
  for each row execute function private.set_updated_at();
create trigger comments_set_updated_at
  before update of content on public.comments
  for each row execute function private.set_updated_at();

revoke update on public.posts    from anon, authenticated;
grant  update (title, content, post_type) on public.posts to authenticated;
revoke update on public.comments from anon, authenticated;
grant  update (content) on public.comments to authenticated;
-- 댓글 삭제는 delete_comment RPC 전용 (AD-11)
revoke delete on public.comments from anon, authenticated;

-- ── 쓰기 전 검사 트리거 ─────────────────────────────────────
create function private.posts_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_limit  constant integer  := 5;
  c_window constant interval := interval '10 minutes';
begin
  if not private.is_api_role() then
    return new;
  end if;
  perform private.raise_if_cannot_write();
  -- 같은 사용자의 동시 요청을 직렬화해 빈도 제한이 경쟁으로 뚫리지 않게 한다
  perform pg_advisory_xact_lock(hashtextextended('posts:' || auth.uid()::text, 0));
  if (select count(*) from public.posts p
       where p.author_id = auth.uid() and p.created_at > now() - c_window) >= c_limit then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function private.comments_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_limit  constant integer  := 10;
  c_window constant interval := interval '1 minute';
  v_parent record;
begin
  new.deleted_at := null;
  if not private.is_api_role() then
    return new;
  end if;
  perform private.raise_if_cannot_write();

  if not exists (select 1 from public.posts p where p.id = new.post_id and not p.is_hidden) then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 대댓글은 1단계까지, 같은 글의 살아 있는 최상위 댓글에만 (F4-2, N7)
  if new.parent_id is not null then
    select c.post_id, c.parent_id, c.deleted_at into v_parent
    from public.comments c where c.id = new.parent_id;
    if not found
       or v_parent.post_id <> new.post_id
       or v_parent.parent_id is not null
       or v_parent.deleted_at is not null then
      raise exception 'INVALID_PARENT' using errcode = 'P0001';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('comments:' || auth.uid()::text, 0));
  if (select count(*) from public.comments c
       where c.author_id = auth.uid() and c.created_at > now() - c_window) >= c_limit then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.posts_before_insert()    from public;
revoke all on function private.comments_before_insert() from public;

create trigger posts_before_insert
  before insert on public.posts
  for each row execute function private.posts_before_insert();
create trigger comments_before_insert
  before insert on public.comments
  for each row execute function private.comments_before_insert();

-- ── 댓글 수: 보이는 댓글만 (F4-4) ───────────────────────────
create or replace function public.sync_comment_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_was boolean;
  v_now boolean;
begin
  if tg_op = 'INSERT' then
    if not new.is_hidden and new.deleted_at is null then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
  elsif tg_op = 'DELETE' then
    if not old.is_hidden and old.deleted_at is null then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    end if;
  else
    v_was := not old.is_hidden and old.deleted_at is null;
    v_now := not new.is_hidden and new.deleted_at is null;
    if v_was and not v_now then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif v_now and not v_was then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comment_count on public.comments;
create trigger trg_comment_count
  after insert or delete or update of is_hidden, deleted_at on public.comments
  for each row execute function public.sync_comment_count();

update public.posts p
   set comment_count = (
     select count(*) from public.comments c
      where c.post_id = p.id and not c.is_hidden and c.deleted_at is null);

-- ── 정책 ────────────────────────────────────────────────────
-- 읽기: 숨김은 작성자 본인과 관리자만 (F2-4, F8)
drop policy if exists "posts: public read" on public.posts;
create policy "posts: public read" on public.posts
  for select
  using (not is_hidden or author_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "comments: public read" on public.comments;
create policy "comments: public read" on public.comments
  for select
  using (not is_hidden or author_id = (select auth.uid()) or (select private.is_admin()));

-- 글쓰기: 본인 + 온보딩 완료 + 활성 그룹 + 새 글 유형은 text/fanfic (F3-2, F2-6)
drop policy if exists "posts: insert own" on public.posts;
create policy "posts: insert own" on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.can_write())
    and post_type in ('text', 'fanfic')
    and exists (select 1 from public.idol_groups g where g.id = idol_group_id and g.is_active)
  );

-- 삭제된 댓글(tombstone)은 내용 수정으로 되살릴 수 없다
drop policy if exists "comments: update own" on public.comments;
create policy "comments: update own" on public.comments
  for update to authenticated
  using (auth.uid() = author_id and deleted_at is null)
  with check (auth.uid() = author_id);

-- ── 댓글 삭제 RPC (AD-11, F4-3) ─────────────────────────────
-- 대댓글이 있으면 tombstone(본문 비움, deleted_at), 없으면 실제 삭제.
-- 지운 것이 tombstone 부모의 마지막 대댓글이면 부모도 정리한다.
create function public.delete_comment(p_comment_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_c   record;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select c.id, c.author_id, c.parent_id, c.deleted_at into v_c
  from public.comments c where c.id = p_comment_id for update;
  if not found or v_c.deleted_at is not null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_c.author_id is distinct from v_uid then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.comments r where r.parent_id = p_comment_id) then
    update public.comments set deleted_at = now(), content = '' where id = p_comment_id;
    return 'tombstoned';
  end if;

  delete from public.comments where id = p_comment_id;

  if v_c.parent_id is not null
     and exists (select 1 from public.comments p where p.id = v_c.parent_id and p.deleted_at is not null)
     and not exists (select 1 from public.comments r where r.parent_id = v_c.parent_id) then
    delete from public.comments where id = v_c.parent_id;
  end if;
  return 'deleted';
end;
$$;

revoke all on function public.delete_comment(uuid) from public, anon;
grant execute on function public.delete_comment(uuid) to authenticated;

-- ── 인덱스 ──────────────────────────────────────────────────
create index idx_posts_group_created     on public.posts (idol_group_id, created_at desc);
create index idx_posts_author_created    on public.posts (author_id, created_at desc);
create index idx_comments_author_created on public.comments (author_id, created_at desc);
