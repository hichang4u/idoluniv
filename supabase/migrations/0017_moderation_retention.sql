-- ============================================================
-- IdolUniv — 신고·처리 기록 1년 보관 후 삭제 (BACKLOG P1-6 ②, 2026-10-24)
--
-- 처리방침 3항: "신고 내역과 처리 기록은 분쟁 대응과 이의 제기 처리를 위해 처리 종료 후 1년간 보관한 뒤 삭제합니다."
-- 0014 와 같은 방식으로 매일 pg_cron 이 지운다. 첫 실제 삭제는 첫 처리(2026-10)로부터 1년 뒤다.
--
-- - reports: 처리가 끝난 것(actioned·dismissed)만, 처리 시각(handled_at)부터 1년. 처리 중(open)인 신고는 남긴다.
--   handled_at 이 비어 있으면(정상 동선에는 없다) 신고 시각으로 센다.
-- - moderation_actions: 처리 기록 한 줄이 곧 처리 종료 시점이라 created_at 부터 1년.
-- - 숨김 상태(posts/comments/chat_messages.is_hidden)는 건드리지 않는다. 기록이 지워져도 숨긴 콘텐츠는 숨긴 채로 남는다.
-- ============================================================

create function private.purge_expired_moderation_records()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  c_retention constant interval := interval '1 year';
  v_reports integer;
  v_actions integer;
begin
  delete from public.reports r
   where r.status <> 'open'
     and coalesce(r.handled_at, r.created_at) < now() - c_retention;
  get diagnostics v_reports = row_count;

  delete from public.moderation_actions a
   where a.created_at < now() - c_retention;
  get diagnostics v_actions = row_count;

  return v_reports + v_actions;
end;
$$;

revoke all on function private.purge_expired_moderation_records() from public;

select cron.schedule(
  'purge-expired-moderation-records',
  '15 3 * * *',
  $$ select private.purge_expired_moderation_records(); $$
);
