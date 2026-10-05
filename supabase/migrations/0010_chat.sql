-- ============================================================
-- IdolUniv — Chat (TECH-DESIGN §3.2 0010, §4.4, §7.6, AD-5)
--
-- 막는 것:
--   S3   비로그인 채팅 쓰기 (D-1=A: 쓰기 = 로그인 + 온보딩 완료)
--   S13  발신자 사칭: author_id·nickname 을 클라이언트가 정함 → 트리거가 덮어쓴다(AD-5)
--   S14  도배: 10초 5건 🟡 F6-5, 같은 내용 3연속
--   F6-6 Realtime payload 의 session_id 노출 → 컬럼 삭제
--   F2-6 비활성 그룹 라운지 쓰기
-- 준비하는 것:
--   F6-7 숨김 전파용 chat_moderation_events (행은 0011 의 모더레이션 RPC 가 넣는다)
-- ============================================================

-- ── 쿠키 신원 폐기 (F6-6) ───────────────────────────────────
alter table public.chat_messages drop column session_id;

-- ── 쓰기 권한 ───────────────────────────────────────────────
-- 클라이언트는 방과 내용만 보낸다. 발신자·닉네임·숨김은 트리거가 정한다.
-- 컬럼 INSERT 권한은 INSERT 문에 명시된 컬럼만 검사하므로 트리거가 채운 컬럼은 막히지 않는다(R13).
revoke insert on public.chat_messages from anon, authenticated;
grant  insert (room_id, content) on public.chat_messages to authenticated;

drop policy if exists "chat_messages: insert" on public.chat_messages;
create policy "chat_messages: insert own" on public.chat_messages
  for insert to authenticated
  with check (author_id = (select auth.uid()) and not is_hidden);
-- WITH CHECK 는 BEFORE 트리거 이후에 평가된다(트리거가 author_id 를 채운 값으로 검사)

-- ── 읽기: 숨김은 관리자만 (F6-7, S21) ───────────────────────
-- 채팅은 작성자 예외가 없다. 숨김 메시지는 라운지에서 "가려진 메시지" 로만 보인다.
drop policy if exists "chat_messages: public read" on public.chat_messages;
create policy "chat_messages: read" on public.chat_messages
  for select
  using (not is_hidden or (select private.is_admin()));

-- ── 쓰기 전 검사 트리거 ─────────────────────────────────────
create function private.chat_messages_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_limit  constant integer  := 5;
  c_window constant interval := interval '10 seconds';
  v_uid uuid := auth.uid();
begin
  if not private.is_api_role() then
    return new;
  end if;
  perform private.raise_if_cannot_write();

  -- 발신자 스냅샷 (AD-5). 닉네임을 나중에 바꿔도 지난 메시지는 그대로다.
  new.author_id := v_uid;
  new.nickname  := (select u.nickname from public.users u where u.id = v_uid);
  new.is_hidden := false;

  if not exists (
    select 1 from public.chat_rooms r
    join public.idol_groups g on g.id = r.group_id
    where r.id = new.room_id and g.is_active
  ) then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 같은 사용자의 동시 요청을 직렬화해 빈도 제한이 경쟁으로 뚫리지 않게 한다
  perform pg_advisory_xact_lock(hashtextextended('chat:' || v_uid::text, 0));

  if (select count(*) from public.chat_messages m
       where m.author_id = v_uid and m.created_at > now() - c_window) >= c_limit then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- 같은 방에서 내 직전 두 메시지가 모두 같은 내용이면 세 번째는 거부한다.
  -- 방 전체가 아니라 본인 기준이다(여러 사람이 같은 응원 문구를 쓰는 것은 막지 않는다).
  if (select count(*) filter (where recent.content = new.content) = 2
        from (select m.content from public.chat_messages m
               where m.room_id = new.room_id and m.author_id = v_uid
               order by m.created_at desc
               limit 2) recent) then
    raise exception 'DUPLICATE_MESSAGE' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.chat_messages_before_insert() from public;

create trigger chat_messages_before_insert
  before insert on public.chat_messages
  for each row execute function private.chat_messages_before_insert();

-- 빈도 제한 조회용
create index idx_chat_messages_author_created on public.chat_messages (author_id, created_at desc);

-- ── 숨김 전파 이벤트 (F6-7) ─────────────────────────────────
-- 숨긴 메시지는 SELECT 정책을 통과하지 못해 UPDATE 이벤트가 구독자에게 가지 않는다(§7.6).
-- 그래서 숨김·해제를 별도 테이블의 INSERT 로 알린다. 내용은 담지 않는다.
-- message_id 는 FK 를 걸지 않는다(보존 기간이 지나 메시지가 지워져도 이벤트는 남아도 된다).
create table public.chat_moderation_events (
  id         bigint generated always as identity primary key,
  room_id    uuid not null references public.chat_rooms(id) on delete cascade,
  message_id uuid not null,
  action     text not null check (action in ('hide', 'unhide')),
  created_at timestamptz not null default now()
);
create index idx_chat_moderation_events_room on public.chat_moderation_events (room_id, created_at);

alter table public.chat_moderation_events enable row level security;
create policy "chat_moderation_events: public read" on public.chat_moderation_events
  for select using (true);
revoke all    on public.chat_moderation_events from anon, authenticated;
grant  select on public.chat_moderation_events to anon, authenticated;

alter publication supabase_realtime add table public.chat_moderation_events;
