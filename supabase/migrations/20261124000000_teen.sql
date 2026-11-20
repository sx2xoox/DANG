-- =====================================================================
-- 10대 학생 타깃 보완
--  * 학년대(초·중·고·대학생20대·그 이상)로 분류하고, 정확한 나이는 원하는 사람만 (방송 공개도 선택)
--  * 학교·실명 의심 표시(school) 는 flags 배열에 들어가므로 표 변경 없음
-- =====================================================================
alter table public.stories
  add column age_group  text check (age_group in ('elementary', 'middle', 'high', 'young', 'adult')),
  add column age_public boolean not null default false;

-- 예전 사연은 나이로 학년대를 채워둬요. (정확한 나이는 방송에 다시 나오지 않도록 공개 안 함으로)
update public.stories
   set age_group = case
     when age is null then null
     when age <= 13 then 'elementary'
     when age <= 16 then 'middle'
     when age <= 19 then 'high'
     when age <= 29 then 'young'
     else 'adult'
   end
 where age_group is null;

-- 로그인 사용자에게 보여줄 열 추가
grant select (age_group, age_public) on public.stories to authenticated;
