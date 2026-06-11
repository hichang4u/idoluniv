-- ============================================================
-- IdolUniv — Chat Migration
-- Sprint 3: chat_rooms, chat_messages, Realtime
-- ============================================================

-- chat_rooms: 그룹당 하나의 채팅방
create table public.chat_rooms (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null unique references public.idol_groups(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- chat_messages: 실시간 채팅 메시지
create table public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  room_id    uuid not null references public.chat_rooms(id) on delete cascade,
  author_id  uuid references public.users(id) on delete set null, -- nullable, 인증 구현 전
  session_id uuid,                                                  -- 익명 사용자 식별
  nickname   text not null default '익명' check (char_length(nickname) between 1 and 20),
  content    text not null check (char_length(content) between 1 and 500),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- RLS 정책
-- ──────────────────────────────────────────
alter table public.chat_rooms    enable row level security;
alter table public.chat_messages enable row level security;

-- chat_rooms: 누구나 읽기 (TODO: 관리자만 생성/삭제)
create policy "chat_rooms: public read"
  on public.chat_rooms for select using (true);

create policy "chat_rooms: anon insert"
  on public.chat_rooms for insert with check (true);

-- chat_messages: 숨김 처리되지 않은 메시지 누구나 읽기
create policy "chat_messages: public read"
  on public.chat_messages for select using (not is_hidden);

-- 익명 쓰기 허용 (TODO: 인증 구현 후 제한)
create policy "chat_messages: anon insert"
  on public.chat_messages for insert with check (true);

-- ──────────────────────────────────────────
-- Supabase Realtime 활성화
-- ──────────────────────────────────────────
alter publication supabase_realtime add table public.chat_messages;

-- ──────────────────────────────────────────
-- 인덱스
-- ──────────────────────────────────────────
create index idx_chat_rooms_group_id on public.chat_rooms(group_id);
create index idx_chat_messages_room_created on public.chat_messages(room_id, created_at);
