-- ============================================================
-- IdolUniv — Reactions & views on auth.uid() (TECH-DESIGN §3.2 0008, §4.3, AD-6·AD-7)
--
-- 막는 구멍 (P0-1, N10, N11):
--   - toggle_*(p_post_id, p_session_id) 가 클라이언트가 넘긴 session_id 를 그대로 믿어
--     anon key 로 임의 UUID 를 넣어 좋아요를 무한히 올리거나 남의 좋아요를 취소할 수 있었다.
--   - reactions 공개 읽기로 남의 session_id 가 노출됐다.
--   - 동시 호출 시 exists→insert 경쟁으로 like_count 가 실제 행 수와 어긋날 수 있었다.
--   - increment_view_count 는 렌더마다 +1, 중복 제거 없음.
--
-- 바뀌는 것:
--   - reactions: session_id 삭제, user_id 필수, 본인 행만 읽기. 쓰기는 RPC 전용(0004 그대로)
--   - 좋아요·스크랩은 로그인 + 온보딩 완료 필요(D-13). 대상 행을 잠그고 delete 결과로 분기
--   - 조회수는 post_views 로 24시간 중복 제거. 로그인은 'u:<uid>', 비로그인은 's:<vid 쿠키>'
--     (비로그인 경로는 조작 가능함을 수용한다 — 조회수는 정렬·보상에 쓰지 않는다)
--
-- 데이터: 쿠키 기반 반응은 로그인 사용자와 연결할 정보가 없어 폐기한다(D-8).
-- 원격은 반응 0행이다(T0 조사, R5).
-- ============================================================

-- ── 기존 데이터·함수 정리 ───────────────────────────────────
delete from public.reactions;
update public.posts    set like_count = 0 where like_count <> 0;
update public.comments set like_count = 0 where like_count <> 0;

drop function if exists public.toggle_post_like(uuid, uuid);
drop function if exists public.toggle_post_scrap(uuid, uuid);
drop function if exists public.toggle_comment_like(uuid, uuid);
drop function if exists public.increment_view_count(uuid);

-- ── reactions ───────────────────────────────────────────────
drop policy if exists "reactions: public read" on public.reactions;
drop index if exists public.idx_reactions_session;
-- session_id 를 포함한 unique 제약도 컬럼과 함께 삭제된다
alter table public.reactions drop column session_id;
alter table public.reactions alter column user_id set not null;
alter table public.reactions
  add constraint reactions_user_target_key unique (user_id, target_type, target_id, reaction_type);

create policy "reactions: select own" on public.reactions
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all    on public.reactions from anon, authenticated;
grant  select on public.reactions to authenticated;

-- ── post_views ──────────────────────────────────────────────
create table public.post_views (
  post_id    uuid not null references public.posts(id) on delete cascade,
  viewer_key text not null check (viewer_key ~ '^(u|s):[0-9a-f-]{36}$'),
  viewed_at  timestamptz not null default now(),
  primary key (post_id, viewer_key)
);
alter table public.post_views enable row level security;  -- 정책 없음 = 클라이언트 접근 불가
revoke all on public.post_views from anon, authenticated;

-- ── RPC ─────────────────────────────────────────────────────
-- 반환: (liked, like_count). 대상 글 행을 잠가 같은 글에 대한 토글을 직렬화한다.
create function public.toggle_post_like(p_post_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid     uuid := auth.uid();
  v_deleted integer;
  v_count   integer;
begin
  perform private.raise_if_cannot_write();

  perform 1 from public.posts p where p.id = p_post_id and not p.is_hidden for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  delete from public.reactions r
   where r.user_id = v_uid and r.target_type = 'post' and r.target_id = p_post_id and r.reaction_type = 'like';
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    update public.posts p set like_count = greatest(p.like_count - 1, 0)
     where p.id = p_post_id returning p.like_count into v_count;
    return query select false, v_count;
  else
    insert into public.reactions (user_id, target_type, target_id, reaction_type)
    values (v_uid, 'post', p_post_id, 'like');
    update public.posts p set like_count = p.like_count + 1
     where p.id = p_post_id returning p.like_count into v_count;
    return query select true, v_count;
  end if;
end;
$$;

-- 반환: 스크랩 상태(true = 스크랩됨). 카운터 없음.
create function public.toggle_post_scrap(p_post_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_deleted integer;
begin
  perform private.raise_if_cannot_write();

  perform 1 from public.posts p where p.id = p_post_id and not p.is_hidden for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  delete from public.reactions r
   where r.user_id = v_uid and r.target_type = 'post' and r.target_id = p_post_id and r.reaction_type = 'scrap';
  get diagnostics v_deleted = row_count;
  if v_deleted > 0 then
    return false;
  end if;

  insert into public.reactions (user_id, target_type, target_id, reaction_type)
  values (v_uid, 'post', p_post_id, 'scrap');
  return true;
end;
$$;

-- 댓글 좋아요 (UI 는 P2). 시그니처를 함께 바꿔 옛 구멍을 남기지 않는다.
create function public.toggle_comment_like(p_comment_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid     uuid := auth.uid();
  v_deleted integer;
  v_count   integer;
begin
  perform private.raise_if_cannot_write();

  perform 1 from public.comments c where c.id = p_comment_id and not c.is_hidden for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  delete from public.reactions r
   where r.user_id = v_uid and r.target_type = 'comment' and r.target_id = p_comment_id and r.reaction_type = 'like';
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    update public.comments c set like_count = greatest(c.like_count - 1, 0)
     where c.id = p_comment_id returning c.like_count into v_count;
    return query select false, v_count;
  else
    insert into public.reactions (user_id, target_type, target_id, reaction_type)
    values (v_uid, 'comment', p_comment_id, 'like');
    update public.comments c set like_count = c.like_count + 1
     where c.id = p_comment_id returning c.like_count into v_count;
    return query select true, v_count;
  end if;
end;
$$;

-- 조회 기록. 로그인 사용자는 인자를 무시하고 auth.uid() 로 판단한다.
-- 같은 viewer_key 가 24시간 안에 다시 보면 세지 않는다. 숨김 글은 무시한다.
create function public.record_post_view(p_post_id uuid, p_anon_key uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_key text;
  v_hit integer;
begin
  if auth.uid() is not null then
    v_key := 'u:' || auth.uid()::text;
  elsif p_anon_key is not null then
    v_key := 's:' || p_anon_key::text;
  else
    return;
  end if;

  if not exists (select 1 from public.posts p where p.id = p_post_id and not p.is_hidden) then
    return;
  end if;

  insert into public.post_views as v (post_id, viewer_key, viewed_at)
  values (p_post_id, v_key, now())
  on conflict (post_id, viewer_key) do update
     set viewed_at = excluded.viewed_at
   where v.viewed_at < now() - interval '24 hours';
  get diagnostics v_hit = row_count;

  if v_hit > 0 then
    update public.posts p set view_count = p.view_count + 1 where p.id = p_post_id;
  end if;
end;
$$;

revoke all on function public.toggle_post_like(uuid)          from public, anon;
revoke all on function public.toggle_post_scrap(uuid)         from public, anon;
revoke all on function public.toggle_comment_like(uuid)       from public, anon;
revoke all on function public.record_post_view(uuid, uuid)    from public;
grant execute on function public.toggle_post_like(uuid)       to authenticated;
grant execute on function public.toggle_post_scrap(uuid)      to authenticated;
grant execute on function public.toggle_comment_like(uuid)    to authenticated;
grant execute on function public.record_post_view(uuid, uuid) to anon, authenticated;
