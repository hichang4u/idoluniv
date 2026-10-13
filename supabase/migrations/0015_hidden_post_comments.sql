-- ============================================================
-- IdolUniv — 숨김 글의 댓글 비공개 (T14 발견, 2026-10-12)
--
-- 왜: 0009 의 "comments: public read" 는 댓글 자신의 is_hidden 만 본다. 그래서 글이 숨겨져도
-- 그 글의 댓글은 anon 이 API 로 읽을 수 있었다(운영: 숨김 글의 댓글 3건이 익명 조회됨).
-- 화면은 글이 404 라 댓글을 보여 주지 않지만, 개인정보 신고로 숨긴 글이라면 댓글이 그 내용을
-- 되풀이할 수 있다.
--
-- 고침: 댓글은 "글을 볼 수 있을 때만" 보인다. 정책 안의 posts 조회에도 posts 의 RLS 가 적용되므로
-- 숨김 글의 댓글은 글 작성자·관리자에게만 보인다(글을 볼 수 있는 사람과 같다).
-- 숨김 글에 댓글을 단 다른 사용자는 자기 댓글도 보지 못한다 — 글 자체를 볼 수 없으므로 같은 기준이다.
-- 하위 쿼리의 post_id 는 comments.post_id 로 적는다(posts 에 같은 이름 열이 생겨도 해석이 바뀌지 않게).
-- security definer 함수(delete_comment, sync_comment_count, 신고·관리자 RPC)는 RLS 를 거치지 않아 영향이 없다.
-- ============================================================

drop policy if exists "comments: public read" on public.comments;
create policy "comments: public read" on public.comments
  for select
  using (
    (not is_hidden or author_id = (select auth.uid()) or (select private.is_admin()))
    and exists (select 1 from public.posts p where p.id = comments.post_id)
  );
