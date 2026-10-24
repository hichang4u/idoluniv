-- ============================================================
-- IdolUniv — 글 유형 수정 제한 · 신고 처리자 비공개 (BACKLOG P1-6 ①③, 2026-10-24)
--
-- ① 0009 는 새 글의 유형을 text/fanfic 으로 막았지만(insert 정책), 수정 정책(0011)에는 유형
--    조건이 없어 작성자가 API 로 post_type 을 image·video 로 바꿀 수 있었다. 수정에도 같은 조건을 건다.
--    운영 글은 text 2·fanfic 3 건뿐이라(2026-10-24) 수정할 수 없게 되는 글은 없다.
-- ③ 신고자는 자기 신고를 읽을 수 있어(0011 "reports: select own or admin") handled_by 로
--    처리한 관리자의 id 를 알 수 있었다. 화면은 신고자에게 target_type·target_id 만 쓴다
--    (lib/reports.ts). 관리자 화면은 security definer RPC(admin_report_queue 등)로 읽어 영향이 없다.
--    그래서 authenticated 의 SELECT 를 handled_by 를 뺀 컬럼 단위로 바꾼다.
-- ============================================================

drop policy if exists "posts: update own" on public.posts;
create policy "posts: update own" on public.posts
  for update to authenticated
  using (auth.uid() = author_id and not is_hidden)
  with check (auth.uid() = author_id and post_type in ('text', 'fanfic'));

revoke select on public.reports from authenticated;
grant  select (id, reporter_id, target_type, target_id, target_author_id, reason, detail, snapshot,
               status, handled_at, created_at)
  on public.reports to authenticated;
