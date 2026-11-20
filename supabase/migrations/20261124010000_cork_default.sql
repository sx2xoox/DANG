-- 기본 디자인을 새 코르크 보드(교실 뒤 게시판)로. 10대 학생 타깃.
alter table public.settings alter column preset set default 'cork';
update public.settings set preset = 'cork' where id = 1 and preset in ('lounge', 'classic');
