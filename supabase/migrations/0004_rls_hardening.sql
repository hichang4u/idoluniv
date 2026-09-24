-- ============================================================
-- IdolUniv — RLS Hardening
-- 0002/0003 의 "anon 전체 허용" 임시 정책을 auth.uid() 기반으로 교체.
--
-- 전제: 클라이언트가 쥐고 있는 anon key 로도 PostgREST 에 직접 접근할 수
-- 있으므로, Server Action 안의 .eq("author_id", userId) 는 방어선이 될 수
-- 없다. 소유권은 RLS 와 컬럼 권한으로 DB 에서 강제한다.
--
-- 방어 계층 2종:
--   (1) RLS  — 어떤 "행" 을 읽고 쓸 수 있는가
--   (2) GRANT — 어떤 "컬럼" 을 쓸 수 있는가 (like_count 위조 차단)
-- security definer 함수(toggle_post_like 등)는 소유자 권한으로 실행되므로
-- 아래 제약의 영향을 받지 않는다.
-- ============================================================

-- ──────────────────────────────────────────
-- 1. users — 공개 프로필 컬럼만 노출
-- ──────────────────────────────────────────
-- 문제: "users: select own" 때문에 posts→author 조인이 본인 글 외에는
--       nickname 을 null 로 돌려주어 목록이 전부 "익명" 으로 표시됨.
-- 해결: 행 단위로는 전체 공개하되, email 은 컬럼 권한으로 차단.
--       (RLS 는 컬럼 단위 제어가 불가능하므로 GRANT 를 병용)

drop policy if exists "users: select own" on public.users;
drop policy if exists "users: update own" on public.users;

create policy "users: public read"
  on public.users for select
  using (true);

create policy "users: update own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- email 은 어떤 클라이언트도 읽을 수 없다. 본인 이메일은 auth.getUser() 로 얻는다.
-- 주의: 이 시점부터 클라이언트의 select("*") on users 는
--       "permission denied for column email" 로 실패한다. 컬럼을 명시할 것.
revoke select on public.users from anon, authenticated;
grant  select (id, nickname, avatar_url, bio, created_at, updated_at)
  on public.users to anon, authenticated;

-- 프로필 수정은 본인 소유 컬럼만
revoke update on public.users from anon, authenticated;
grant  update (nickname, avatar_url, bio, updated_at)
  on public.users to authenticated;

-- users 행 생성은 handle_new_user() 트리거(security definer) 전담
revoke insert, delete on public.users from anon, authenticated;

-- ──────────────────────────────────────────
-- 2. posts
-- ──────────────────────────────────────────
drop policy if exists "posts: public read" on public.posts;
drop policy if exists "posts: anon insert" on public.posts;
drop policy if exists "posts: anon update" on public.posts;
drop policy if exists "posts: anon delete" on public.posts;

-- 숨김 처리된 글은 작성자 본인만 볼 수 있다
create policy "posts: public read"
  on public.posts for select
  using (not is_hidden or auth.uid() = author_id);

create policy "posts: insert own"
  on public.posts for insert to authenticated
  with check (auth.uid() = author_id);

create policy "posts: update own"
  on public.posts for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "posts: delete own"
  on public.posts for delete to authenticated
  using (auth.uid() = author_id);

-- like_count / view_count / comment_count 위조 차단.
-- 이 값들은 security definer 함수(toggle_post_like, increment_view_count,
-- sync_comment_count)만 갱신한다.
revoke insert, update, delete on public.posts from anon, authenticated;
grant  insert (author_id, idol_group_id, title, content, post_type)
  on public.posts to authenticated;
grant  update (title, content, post_type, is_hidden, updated_at)
  on public.posts to authenticated;
grant  delete on public.posts to authenticated;

-- ──────────────────────────────────────────
-- 3. comments
-- ──────────────────────────────────────────
drop policy if exists "comments: public read" on public.comments;
drop policy if exists "comments: anon insert" on public.comments;
drop policy if exists "comments: anon update" on public.comments;
drop policy if exists "comments: anon delete" on public.comments;

create policy "comments: public read"
  on public.comments for select
  using (not is_hidden or auth.uid() = author_id);

create policy "comments: insert own"
  on public.comments for insert to authenticated
  with check (auth.uid() = author_id);

create policy "comments: update own"
  on public.comments for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "comments: delete own"
  on public.comments for delete to authenticated
  using (auth.uid() = author_id);

revoke insert, update, delete on public.comments from anon, authenticated;
grant  insert (post_id, parent_id, content, author_id)
  on public.comments to authenticated;
grant  update (content, is_hidden, updated_at)
  on public.comments to authenticated;
grant  delete on public.comments to authenticated;

-- ──────────────────────────────────────────
-- 4. reactions — 직접 DML 전면 차단, RPC 경유만 허용
-- ──────────────────────────────────────────
-- session_id 는 httpOnly 쿠키 값이라 RLS 로 검증할 수 없다. 따라서
-- 쓰기는 전부 security definer 함수(toggle_post_like / toggle_post_scrap /
-- toggle_comment_like)로만 통과시키고, 테이블 직접 쓰기는 막는다.
drop policy if exists "reactions: anon insert" on public.reactions;
drop policy if exists "reactions: anon delete" on public.reactions;
-- "reactions: public read" 는 유지 — getPostReactions() 가 직접 select 한다.
-- session_id 는 랜덤 UUID 이므로 개인 식별 정보가 아니다.

revoke insert, update, delete on public.reactions from anon, authenticated;

-- ──────────────────────────────────────────
-- 5. chat_rooms — 임의 생성 차단, RPC 경유만 허용
-- ──────────────────────────────────────────
drop policy if exists "chat_rooms: anon insert" on public.chat_rooms;
revoke insert, update, delete on public.chat_rooms from anon, authenticated;

create or replace function public.get_or_create_chat_room(p_group_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_room_id uuid;
begin
  -- 실재하는 활성 그룹에 대해서만 생성
  if not exists (
    select 1 from public.idol_groups
    where id = p_group_id and is_active
  ) then
    return null;
  end if;

  insert into public.chat_rooms (group_id)
  values (p_group_id)
  on conflict (group_id) do nothing;

  select id into v_room_id
  from public.chat_rooms
  where group_id = p_group_id;

  return v_room_id;
end;
$$;

grant execute on function public.get_or_create_chat_room(uuid) to anon, authenticated;

-- ──────────────────────────────────────────
-- 6. chat_messages — 익명 쓰기는 유지하되 위조 차단
-- ──────────────────────────────────────────
-- 채팅은 비로그인 참여가 설계 의도이므로 insert 자체는 열어둔다.
-- 다만 (a) 남의 계정을 사칭한 author_id, (b) 처음부터 숨김 상태인 메시지
-- 삽입은 막는다. content/nickname 길이는 0003 의 CHECK 제약이 담당.
drop policy if exists "chat_messages: anon insert" on public.chat_messages;

create policy "chat_messages: insert"
  on public.chat_messages for insert
  with check (
    not is_hidden
    and (author_id is null or auth.uid() = author_id)
  );

-- update/delete 정책은 없다 = 아무도 메시지를 수정·삭제할 수 없다.
-- (숨김 처리는 추후 관리자용 security definer 함수로)
revoke insert, update, delete on public.chat_messages from anon, authenticated;
grant  insert (room_id, author_id, session_id, nickname, content)
  on public.chat_messages to anon, authenticated;
