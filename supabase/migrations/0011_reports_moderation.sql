-- ============================================================
-- IdolUniv — Reports & moderation (TECH-DESIGN §3.2 0011, §4.3, §7.7·7.8, PRD 6.1·F7·F8)
--
-- 추가하는 것:
--   reports              신고 (insert·update 는 RPC 전용)
--   moderation_actions   감사 로그 (숨김·해제·자동 숨김·기각)
--   submit_report        F7: 본인 콘텐츠·중복 신고 금지, 10분 10건 🟡, 서로 다른 신고자 3명이면 자동 숨김(D-4)
--   admin_moderate / admin_dismiss_reports / admin_report_queue   F8 (화면은 T9)
--   idol_groups          관리자 insert/update(F8-4, slug 변경 불가) + color_key(D-18, TOKENS §3.2)
-- 고치는 것:
--   숨김 글·댓글을 작성자가 수정할 수 있던 구멍 — 숨김은 검토 대상이므로 내용을 바꾸지 못하게 한다.
--   (해제 시 검토하지 않은 내용이 공개되는 것을 막는다. 삭제는 계속 허용, 신고 스냅샷이 남는다)
--
-- 설계 대비 변경: moderation_actions.action 에 'dismiss' 추가 — 기각도 처리자·사유를 남긴다(F8-3).
-- ============================================================

-- ── 신고 ────────────────────────────────────────────────────
-- 사유 코드는 lib/report-reasons.ts 와 같은 목록이다(PRD 6.1)
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.users(id) on delete cascade,
  target_type      text not null check (target_type in ('post', 'comment', 'chat_message')),
  target_id        uuid not null,                 -- 다형 참조라 FK 없음
  target_author_id uuid,                          -- 신고 시점 작성자 (2단계 제재용)
  reason           text not null check (reason in
                     ('spam', 'abuse', 'privacy', 'sexual', 'rumor', 'copyright', 'impersonation', 'other')),
  detail           text check (char_length(detail) <= 300),
  snapshot         jsonb not null,                -- 신고 시점 내용. 원문이 지워져도 검토할 수 있게
  status           text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by       uuid references public.users(id) on delete set null,
  handled_at       timestamptz,
  created_at       timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index idx_reports_open   on public.reports (status, created_at) where status = 'open';
create index idx_reports_target on public.reports (target_type, target_id);

alter table public.reports enable row level security;
-- 신고자는 자기 신고만 본다(F7-4 "신고한 콘텐츠" 가림에 쓴다, AD-10)
create policy "reports: select own or admin" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
revoke all    on public.reports from anon, authenticated;
grant  select on public.reports to authenticated;

-- ── 감사 로그 ───────────────────────────────────────────────
create table public.moderation_actions (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.users(id) on delete set null,  -- null = 시스템(자동 숨김)
  action      text not null check (action in ('hide', 'unhide', 'auto_hide', 'dismiss')),
  target_type text not null check (target_type in ('post', 'comment', 'chat_message')),
  target_id   uuid not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index idx_moderation_actions_created on public.moderation_actions (created_at desc);

alter table public.moderation_actions enable row level security;
create policy "moderation_actions: admin read" on public.moderation_actions
  for select to authenticated
  using ((select private.is_admin()));
revoke all    on public.moderation_actions from anon, authenticated;
grant  select on public.moderation_actions to authenticated;

-- ── 숨김 콘텐츠는 작성자도 수정할 수 없다 ───────────────────
drop policy if exists "posts: update own" on public.posts;
create policy "posts: update own" on public.posts
  for update to authenticated
  using (auth.uid() = author_id and not is_hidden)
  with check (auth.uid() = author_id);

drop policy if exists "comments: update own" on public.comments;
create policy "comments: update own" on public.comments
  for update to authenticated
  using (auth.uid() = author_id and deleted_at is null and not is_hidden)
  with check (auth.uid() = author_id);

-- ── 공통: 대상 숨김 상태 바꾸기 ─────────────────────────────
-- 대상이 없으면 NOT_FOUND. 채팅이면 구독자에게 숨김·해제를 알리는 이벤트도 넣는다(F6-7, 0010).
-- definer 함수(submit_report, admin_moderate) 안에서만 부른다.
create function private.set_target_hidden(p_target_type text, p_target_id uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room uuid;
begin
  case p_target_type
    when 'post' then
      update public.posts set is_hidden = p_hidden where id = p_target_id;
    when 'comment' then
      update public.comments set is_hidden = p_hidden where id = p_target_id;
    when 'chat_message' then
      update public.chat_messages set is_hidden = p_hidden where id = p_target_id
      returning room_id into v_room;
    else
      raise exception 'VALIDATION' using errcode = 'P0001';
  end case;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_room is not null then
    insert into public.chat_moderation_events (room_id, message_id, action)
    values (v_room, p_target_id, case when p_hidden then 'hide' else 'unhide' end);
  end if;
end;
$$;
revoke all on function private.set_target_hidden(text, uuid, boolean) from public;

-- ── submit_report (F7) ──────────────────────────────────────
create function public.submit_report(p_target_type text, p_target_id uuid, p_reason text, p_detail text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  c_limit     constant integer  := 10;
  c_window    constant interval := interval '10 minutes';
  c_threshold constant integer  := 3;   -- D-4: 서로 다른 신고자 수
  v_uid       uuid;
  v_author    uuid;
  v_hidden    boolean;
  v_snapshot  jsonb;
  v_detail    text := nullif(btrim(coalesce(p_detail, '')), '');
  v_id        uuid;
begin
  perform private.raise_if_cannot_write();
  v_uid := auth.uid();

  if p_reason is null
     or p_reason not in ('spam', 'abuse', 'privacy', 'sexual', 'rumor', 'copyright', 'impersonation', 'other')
     or char_length(v_detail) > 300 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  -- ① 대상 조회. 행을 잠가 같은 대상에 대한 동시 신고를 직렬화한다(자동 숨김 임계값 판정이 경쟁으로 빠지지 않게)
  case p_target_type
    when 'post' then
      select p.author_id, p.is_hidden,
             jsonb_build_object('title', p.title, 'content', p.content, 'author_nickname', u.nickname,
                                'created_at', p.created_at, 'group_slug', g.slug)
        into v_author, v_hidden, v_snapshot
        from public.posts p
        left join public.users u on u.id = p.author_id
        left join public.idol_groups g on g.id = p.idol_group_id
       where p.id = p_target_id
         for update of p;
    when 'comment' then
      select c.author_id, c.is_hidden or c.deleted_at is not null,
             jsonb_build_object('content', c.content, 'author_nickname', u.nickname,
                                'created_at', c.created_at, 'post_id', c.post_id)
        into v_author, v_hidden, v_snapshot
        from public.comments c
        left join public.users u on u.id = c.author_id
       where c.id = p_target_id
         for update of c;
    when 'chat_message' then
      select m.author_id, m.is_hidden,
             jsonb_build_object('content', m.content, 'author_nickname', m.nickname,
                                'created_at', m.created_at, 'room_id', m.room_id)
        into v_author, v_hidden, v_snapshot
        from public.chat_messages m
       where m.id = p_target_id
         for update of m;
    else
      raise exception 'VALIDATION' using errcode = 'P0001';
  end case;
  if not found or v_hidden then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- ② 본인 콘텐츠
  if v_author = v_uid then
    raise exception 'CANNOT_REPORT_OWN' using errcode = 'P0001';
  end if;

  -- ③ 빈도 제한
  perform pg_advisory_xact_lock(hashtextextended('reports:' || v_uid::text, 0));
  if (select count(*) from public.reports r
       where r.reporter_id = v_uid and r.created_at > now() - c_window) >= c_limit then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- ④ 저장. 같은 대상을 다시 신고하면 유일키에 걸린다
  insert into public.reports (reporter_id, target_type, target_id, target_author_id, reason, detail, snapshot)
  values (v_uid, p_target_type, p_target_id, v_author, p_reason, v_detail, v_snapshot)
  on conflict (reporter_id, target_type, target_id) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'ALREADY_REPORTED' using errcode = 'P0001';
  end if;

  -- ⑤ 자동 임시 숨김 (F7-5). 신고는 open 으로 남아 관리자가 검토한다
  if (select count(distinct r.reporter_id) from public.reports r
       where r.target_type = p_target_type and r.target_id = p_target_id and r.status = 'open') >= c_threshold then
    perform private.set_target_hidden(p_target_type, p_target_id, true);
    insert into public.moderation_actions (actor_id, action, target_type, target_id, note)
    values (null, 'auto_hide', p_target_type, p_target_id, format('서로 다른 신고자 %s명', c_threshold));
  end if;

  return v_id;
end;
$$;

-- ── 관리자 RPC (F8, 화면은 T9) ──────────────────────────────
create function public.admin_moderate(p_target_type text, p_target_id uuid, p_action text, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_action is null or p_action not in ('hide', 'unhide') then
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;

  -- 신고 없이도 실행할 수 있다(발견 즉시 숨김, PRD 6.1)
  perform private.set_target_hidden(p_target_type, p_target_id, p_action = 'hide');

  -- 숨기면 신고를 받아들인 것, 해제하면 신고를 기각한 것으로 닫는다
  update public.reports r
     set status = case when p_action = 'hide' then 'actioned' else 'dismissed' end,
         handled_by = auth.uid(), handled_at = now()
   where r.target_type = p_target_type and r.target_id = p_target_id and r.status = 'open';

  insert into public.moderation_actions (actor_id, action, target_type, target_id, note)
  values (auth.uid(), p_action, p_target_type, p_target_id, nullif(btrim(coalesce(p_note, '')), ''));
end;
$$;

-- 대상은 그대로 두고 open 신고만 기각한다. 처리한 신고 수를 돌려준다
create function public.admin_dismiss_reports(p_target_type text, p_target_id uuid, p_note text default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.reports r
     set status = 'dismissed', handled_by = auth.uid(), handled_at = now()
   where r.target_type = p_target_type and r.target_id = p_target_id and r.status = 'open';
  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into public.moderation_actions (actor_id, action, target_type, target_id, note)
    values (auth.uid(), 'dismiss', p_target_type, p_target_id, nullif(btrim(coalesce(p_note, '')), ''));
  end if;
  return v_count;
end;
$$;

-- 신고 큐: 대상별로 묶는다. 긴급(privacy·sexual, PRD 6.2) 먼저, 그다음 오래된 순.
-- is_hidden 이 null 이면 대상이 지워진 것이다(작성자 삭제 등).
create function public.admin_report_queue(p_status text default 'open', p_limit integer default 20, p_offset integer default 0)
returns table (
  target_type     text,
  target_id       uuid,
  report_count    integer,
  reasons         text[],
  details         text[],
  urgent          boolean,
  first_at        timestamptz,
  last_at         timestamptz,
  is_hidden       boolean,
  latest_snapshot jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_status is null or p_status not in ('open', 'actioned', 'dismissed') then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  -- 반환 열 이름이 plpgsql 변수가 되므로 모든 열을 별칭으로 한정한다
  return query
  with grouped as (
    select r.target_type as q_type,
           r.target_id   as q_id,
           count(*)::integer as q_count,
           array_agg(distinct r.reason order by r.reason) as q_reasons,
           coalesce(array_agg(r.detail order by r.created_at) filter (where r.detail is not null), '{}') as q_details,
           bool_or(r.reason in ('privacy', 'sexual')) as q_urgent,
           min(r.created_at) as q_first,
           max(r.created_at) as q_last,
           (array_agg(r.snapshot order by r.created_at desc))[1] as q_snapshot
      from public.reports r
     where r.status = p_status
     group by r.target_type, r.target_id
  )
  select g.q_type, g.q_id, g.q_count, g.q_reasons, g.q_details, g.q_urgent, g.q_first, g.q_last,
         case g.q_type
           when 'post'         then (select p.is_hidden from public.posts p where p.id = g.q_id)
           when 'comment'      then (select c.is_hidden from public.comments c where c.id = g.q_id)
           when 'chat_message' then (select m.is_hidden from public.chat_messages m where m.id = g.q_id)
         end,
         g.q_snapshot
    from grouped g
   order by g.q_urgent desc, g.q_first asc
   limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.submit_report(text, uuid, text, text)          from public, anon;
revoke all on function public.admin_moderate(text, uuid, text, text)         from public, anon;
revoke all on function public.admin_dismiss_reports(text, uuid, text)        from public, anon;
revoke all on function public.admin_report_queue(text, integer, integer)     from public, anon;
grant execute on function public.submit_report(text, uuid, text, text)       to authenticated;
grant execute on function public.admin_moderate(text, uuid, text, text)      to authenticated;
grant execute on function public.admin_dismiss_reports(text, uuid, text)     to authenticated;
grant execute on function public.admin_report_queue(text, integer, integer)  to authenticated;

-- ── 그룹: 색 + 관리자 관리 (F8-4, D-18) ─────────────────────
-- key 목록 원본은 docs/design/tokens/presets.json (24색). 기본은 baby(베이비블루)
alter table public.idol_groups
  add column color_key text not null default 'baby'
  check (color_key in (
    'cherry', 'rose', 'coral', 'peach', 'apricot', 'mango', 'butter', 'lemon',
    'lime', 'pistachio', 'sage', 'mint', 'aqua', 'teal', 'sky', 'baby',
    'cobalt', 'periwinkle', 'lavender', 'lilac', 'orchid', 'pink', 'mauve', 'greige'));

create policy "idol_groups: admin insert" on public.idol_groups
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "idol_groups: admin update" on public.idol_groups
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- 삭제는 없다(비활성화로 대체). slug 는 주소라 만든 뒤 바꾸지 않는다
revoke insert, update, delete on public.idol_groups from anon, authenticated;
grant  insert (name, name_ko, slug, agency, debut_date, cover_url, description, is_active, color_key)
  on public.idol_groups to authenticated;
grant  update (name, name_ko, agency, debut_date, cover_url, description, is_active, color_key)
  on public.idol_groups to authenticated;
