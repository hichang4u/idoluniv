-- ============================================================
-- IdolUniv — 라운지 메시지 보존 기간 (F6-8, BACKLOG P0-3 = A, 2026-10-11)
--
-- 개인정보처리방침 §3 "라운지 메시지는 작성 후 90일이 지나면 삭제합니다" 를 실제 동작으로 만든다.
-- 실행 수단은 pg_cron(Supabase Cron). 설치 SQL 은 Supabase 문서(guides/cron/install)를 따른다.
--
-- 지우는 것 (매일 03:00 UTC = 12:00 KST):
--   chat_messages           작성 후 90일 지난 메시지. 단, 처리 중(open) 신고가 걸린 메시지는 처리 후로 미룬다
--                           (admin_moderate 가 원문을 찾지 못하면 NOT_FOUND). 신고 내용은 reports.snapshot 에 남는다.
--   chat_moderation_events  90일 지난 숨김·해제 이벤트 (내용 없음, Realtime 알림용)
--   cron.job_run_details    30일 지난 실행 기록 (자동 정리되지 않음 — Supabase 문서)
--
-- 클라이언트는 INSERT 만 구독하므로(ChatRoom) 삭제는 열린 라운지에 이벤트를 보내지 않는다.
-- 베타 규모(하루 수백 건 이하 ○)라 한 번에 지운다. 커지면 배치로 나눈다.
-- ============================================================

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- 지운 메시지 수를 돌려준다(테스트·수동 실행 확인용)
create function private.purge_expired_chat_messages()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  c_retention constant interval := interval '90 days';
  v_deleted integer;
begin
  delete from public.chat_messages m
   where m.created_at < now() - c_retention
     and not exists (
       select 1 from public.reports r
        where r.target_type = 'chat_message'
          and r.target_id = m.id
          and r.status = 'open'
     );
  get diagnostics v_deleted = row_count;

  delete from public.chat_moderation_events e
   where e.created_at < now() - c_retention;

  return v_deleted;
end;
$$;

revoke all on function private.purge_expired_chat_messages() from public;

-- 같은 이름으로 다시 부르면 기존 작업을 덮어쓴다(upsert, Supabase 문서)
select cron.schedule(
  'purge-expired-chat-messages',
  '0 3 * * *',
  $$ select private.purge_expired_chat_messages();
     delete from cron.job_run_details where end_time < now() - interval '30 days'; $$
);
