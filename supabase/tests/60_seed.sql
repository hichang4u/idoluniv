-- 0012 출시 그룹 시드 테스트 (TECH-DESIGN §3.2 0012, D-10)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select set_eq(
  $$ select slug, name, color_key, is_active from public.idol_groups
      where slug in ('blackpink', 'newjeans', 'seventeen', 'ive', 'aespa') $$,
  $$ values ('blackpink', 'BLACKPINK', 'pink',  true),
            ('newjeans',  'NewJeans',  'sky',   true),
            ('seventeen', 'SEVENTEEN', 'peach', true),
            ('ive',       'IVE',       'lilac', true),
            ('aespa',     'aespa',     'mint',  true) $$,
  '출시 그룹 5개가 표기·색·활성 상태대로 들어 있다');
select is((select count(distinct color_key)::int from public.idol_groups
            where slug in ('blackpink', 'newjeans', 'seventeen', 'ive', 'aespa')),
  5, '출시 그룹 색은 서로 다르다');
select is_empty(
  $$ select slug from public.idol_groups
      where slug in ('blackpink', 'newjeans', 'seventeen', 'ive', 'aespa')
        and (cover_url is not null or description is null or debut_date is null) $$,
  '로고·사진 없이(D-22) 소개와 데뷔일이 채워져 있다');
select ok(
  (select public.get_or_create_chat_room(id) is not null from public.idol_groups where slug = 'ive'),
  '시드 그룹의 라운지를 열 수 있다');

select * from finish();
rollback;
