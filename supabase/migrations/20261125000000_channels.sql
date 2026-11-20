-- =====================================================================
-- 내 채널(치지직·유튜브)과 사이트 사이를 사람이 오가게
--  * 설정: 치지직·유튜브 채널 주소, 방송 시간 안내 문구
--  * 방송 회차에 "방송 끝" 시각 → 사이트에 "지금 방송 중" 표시를 정확하게
--  * home_info 에 채널 주소, 방송 시간, 지금 방송 중 여부 추가
-- =====================================================================
alter table public.settings
  add column chzzk_url     text check (chzzk_url is null or chzzk_url ~ '^https://'),
  add column youtube_url   text check (youtube_url is null or youtube_url ~ '^https://'),
  add column schedule_text text not null default '' check (char_length(schedule_text) <= 40);

alter table public.broadcasts
  add column ended_at timestamptz;

-- 지금 방송 중: 가장 최근 방송이 끝나지 않았고, 시작 8시간 안이거나 마지막 "읽기 시작"이 3시간 안
create or replace function public.broadcast_on_air()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select b.ended_at is null
       and b.published_at is null
       and (
         b.started_at > now() - interval '8 hours'
         or exists (
           select 1 from public.stories s
            where s.broadcast_id = b.id and s.read_started_at > now() - interval '3 hours'
         )
       )
      from public.broadcasts b
     order by b.started_at desc
     limit 1
  ), false);
$$;

revoke all on function public.broadcast_on_air() from public, anon, authenticated;

create or replace function public.home_info()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'site_name',  st.site_name,
    'tagline',    st.tagline,
    'week_theme', st.week_theme,
    'preset',     st.preset,
    'accepting',  st.accepting,
    'week_count', (select count(*) from public.stories s
                    where s.created_at >= date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    'queue_count', (select count(*) from public.stories s where s.status in ('approved', 'on_air')),
    'total_aired', (select count(*) from public.stories s where s.status = 'read'),
    'chzzk_url',     st.chzzk_url,
    'youtube_url',   st.youtube_url,
    'schedule_text', st.schedule_text,
    'on_air',        public.broadcast_on_air()
  )
  from public.settings st
  where st.id = 1;
$$;

grant execute on function public.home_info() to anon, authenticated;
