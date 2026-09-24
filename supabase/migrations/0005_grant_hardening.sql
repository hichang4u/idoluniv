-- ============================================================
-- IdolUniv — GRANT Hardening
-- 0004 의 컬럼 GRANT 에 남은 두 구멍을 막는다.
--
--   (1) posts/comments.is_hidden — 0004 가 authenticated 에게 update 권한을
--       줘서, 관리자가 숨긴 글/댓글을 작성자가 PATCH 로 되돌릴 수 있었다.
--   (2) fan_profiles — 0001 의 "update own" 정책 + Supabase 기본 테이블
--       GRANT 때문에 본인이 level/exp/points/badges/title 을 임의 수정 가능.
--
-- 방식: 컬럼 단위 revoke 대신 "테이블 단위 revoke → 필요한 컬럼만 재GRANT".
--   Postgres 에서 컬럼 단위 REVOKE 는 컬럼 GRANT 만 회수하고, 테이블 단위
--   GRANT 가 남아 있으면 그 컬럼은 여전히 쓸 수 있다. 반대로 테이블 단위
--   REVOKE 는 해당 권한의 컬럼 GRANT 까지 함께 회수한다. 따라서 이 방식은
--   0004 적용 여부나 기본 권한 상태와 무관하게 결과가 같다(멱등).
--
-- 숨김 처리/게임화 수치 갱신은 이후 security definer 함수로만 수행한다
-- (소유자 권한으로 실행되므로 아래 GRANT 제약을 받지 않는다).
-- ============================================================

-- ──────────────────────────────────────────
-- 1. posts — is_hidden 쓰기 권한 제거
-- ──────────────────────────────────────────
-- 막는 공격: 작성자가 PATCH /posts?id=eq.X {"is_hidden":false} 로 관리자 숨김 해제.
revoke update on public.posts from anon, authenticated;
grant  update (title, content, post_type, updated_at)
  on public.posts to authenticated;

-- ──────────────────────────────────────────
-- 2. comments — is_hidden 쓰기 권한 제거
-- ──────────────────────────────────────────
-- 막는 공격: 작성자가 PATCH /comments?id=eq.X {"is_hidden":false} 로 관리자 숨김 해제.
revoke update on public.comments from anon, authenticated;
grant  update (content, updated_at)
  on public.comments to authenticated;

-- ──────────────────────────────────────────
-- 3. fan_profiles — 게임화 수치 직접 쓰기 차단
-- ──────────────────────────────────────────
-- 막는 공격: 본인 행에 PATCH {"level":99,"points":999999,"badges":[...]} 로 수치 위조.
-- 막는 공격: POST/DELETE 로 행을 임의 생성·삭제해 초기화(레벨 리셋 악용 등).
revoke insert, update, delete on public.fan_profiles from anon, authenticated;

-- 사용자가 직접 고를 수 있는 프로필 성격 컬럼만 허용.
-- 행 소유권은 기존 "fan_profiles: update own" 정책(auth.uid() = user_id)이 강제.
-- favorite_group 는 idol_groups FK 로 실재 그룹만 들어간다.
grant  update (favorite_group, updated_at)
  on public.fan_profiles to authenticated;

-- 행 생성은 handle_new_user() 트리거(security definer, 0001) 전담 — insert revoke 영향 없음.
