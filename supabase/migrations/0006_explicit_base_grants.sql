-- ============================================================
-- IdolUniv — Explicit base grants
--
-- 왜: 0001~0003 은 Supabase 의 "새 객체에 anon/authenticated 권한 자동 부여"
-- 기본값에 기대어 GRANT 를 적지 않았다. 새 프로젝트·로컬 DB(supabase start)는
-- 이 자동 부여가 꺼져 있고, 2026-10-30 부터는 기존 프로젝트에도 새 기본값이
-- 적용된다(기존 객체의 권한은 유지). 그래서 같은 마이그레이션으로 만든 DB 라도
-- 원격과 새 환경의 권한이 달라진다.
--
-- 이 마이그레이션은 원격 DB 가 이미 가진 "현재 동작에 필요한 권한"을 명시해서
-- 새 환경을 원격과 같은 상태로 맞춘다. 원격에는 이미 있는 권한이므로 효과가 없다.
--
-- 주의: 아래 함수 EXECUTE 권한에는 알려진 구멍(클라이언트가 넘긴 session_id 를
-- 믿는 toggle_* 등, docs/design/TECH-DESIGN.md P0-1·N10)이 포함된다. 원격 상태를
-- 그대로 재현하려는 것이며, 0008(반응·조회수)에서 회수한다. 테스트는
-- supabase/tests 에서 todo 로 추적한다.
--
-- 행 단위 제어는 기존 RLS 정책, 컬럼 쓰기는 0004/0005 의 컬럼 GRANT 가 맡는다.
-- 여기서는 읽기(SELECT)와 스키마 사용 권한만 다룬다.
-- ============================================================

grant usage on schema public to anon, authenticated;

-- 공개 읽기 (행은 RLS 가 거른다)
grant select on public.idol_groups   to anon, authenticated;
grant select on public.members       to anon, authenticated;
grant select on public.posts         to anon, authenticated;
grant select on public.comments      to anon, authenticated;
grant select on public.chat_rooms    to anon, authenticated;
grant select on public.chat_messages to anon, authenticated;

-- reactions: 현재 "public read" 정책 + 코드(getPostReactions)가 직접 select 한다.
-- 본인 행만 보이도록 바꾸는 것은 0008.
grant select on public.reactions to anon, authenticated;

-- fan_profiles: "select own" 정책이므로 로그인 사용자만 의미가 있다.
grant select on public.fan_profiles to authenticated;

-- users 는 0004 가 공개 컬럼만 GRANT 했으므로 여기서 손대지 않는다(email 비공개 유지).

-- 현재 앱이 호출하는 RPC. 원격은 Postgres 기본값(PUBLIC EXECUTE)으로 이미 열려 있다.
grant execute on function public.toggle_post_like(uuid, uuid)    to anon, authenticated;
grant execute on function public.toggle_post_scrap(uuid, uuid)   to anon, authenticated;
grant execute on function public.toggle_comment_like(uuid, uuid) to anon, authenticated;
grant execute on function public.increment_view_count(uuid)      to anon, authenticated;
