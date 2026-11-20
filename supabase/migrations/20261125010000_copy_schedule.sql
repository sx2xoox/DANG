-- 방송 시간 기본값(매주 토요일 밤 9시)과 소개 문구 정리 (다웅 이름 반복 줄이기)
alter table public.settings alter column schedule_text set default '매주 토요일 밤 9시';
update public.settings set schedule_text = '매주 토요일 밤 9시' where id = 1 and schedule_text = '';

alter table public.settings alter column tagline set default '방송에서 같이 읽고 이야기하는 고민 상담 코너';
update public.settings
   set tagline = '방송에서 같이 읽고 이야기하는 고민 상담 코너'
 where id = 1 and tagline = '다웅이 방송에서 직접 읽어주는 고민 상담 코너';
