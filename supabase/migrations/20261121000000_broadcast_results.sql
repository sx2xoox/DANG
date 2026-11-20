-- =====================================================================
-- 다웅 고민 사연함 : 방송 결과 · 상담 후기 · 고민 동물 도감
--
-- 사연은 방송에서 읽고 다웅이 직접 풀어줘요. 사이트는
--   "내 사연이 방송에서 읽혔다" 알림 + 다시보기 링크 + 짧은 한마디(선택)
-- 를 결과 카드로 보여주고, 사연자는 그 결과에 상담 후기를 남길 수 있어요.
-- 로그인한 사람의 사연이 방송에서 읽히면 고민 동물이 도감에 모이고,
-- 1% 확률로 황금 동물이 나와요 (인증하면 구독권 지급).
--
-- 접근 원칙은 처음과 같아요.
--  * 새 표는 모두 RLS 를 켜고, 쓰기는 서버 함수(service_role)만 해요.
--  * 로그인 사용자는 자기 후기 / 자기 도감만 읽을 수 있어요.
--  * 후기 벽은 review_wall() 함수로 "승인됨 + 공개 동의" 후기의 공개 항목만 내보내요.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 방송 회차: "방송 시작" 버튼을 누른 시각과 다시보기 주소
-- ---------------------------------------------------------------------
create table public.broadcasts (
  id           uuid primary key default gen_random_uuid(),
  started_at   timestamptz not null default now(),
  vod_url      text check (char_length(vod_url) <= 500),
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create index broadcasts_started_idx on public.broadcasts (started_at desc);

-- ---------------------------------------------------------------------
-- 사연: 방송 예정 표시 + 방송 결과
-- ---------------------------------------------------------------------
alter table public.stories
  add column scheduled           boolean not null default false,
  add column broadcast_id        uuid references public.broadcasts (id) on delete set null,
  add column read_started_at     timestamptz,
  add column vod_offset_sec      integer check (vod_offset_sec between 0 and 172800),
  add column vod_url             text check (char_length(vod_url) <= 600),
  add column host_note           text check (char_length(host_note) <= 120),
  add column private_message     text check (char_length(private_message) <= 300),
  add column result_published_at timestamptz,
  add column waiting_notice_at   timestamptz;

create index stories_broadcast_idx on public.stories (broadcast_id, read_started_at);

-- 예전에 "방장만 보기"로 들어온 사연이 있다면 지우지 않고 "익명으로 읽기"로 바꿔 보관
update public.stories set visibility = 'anonymous' where visibility not in ('named', 'anonymous');

-- 시청자에게 보여줄 상태
--   reviewing(검토 중) / approved(방송 대기) / scheduled(방송 예정)
--   read(방송에서 읽음, 결과 정리 중) / aired(방송 결과 공개) / not_selected(이번엔 소개 안 됨)
alter table public.stories drop constraint if exists stories_viewer_status_check;
alter table public.stories add constraint stories_viewer_status_check
  check (viewer_status in ('reviewing', 'approved', 'scheduled', 'read', 'aired', 'not_selected'));

create or replace function public.stories_viewer_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.viewer_status := case
    when new.status = 'read' and new.result_published_at is not null then 'aired'
    when new.status = 'read' then 'read'
    when new.status in ('approved', 'on_air') and new.scheduled then 'scheduled'
    when new.status in ('approved', 'on_air') then 'approved'
    when new.status = 'rejected' then 'not_selected'
    else 'reviewing'
  end;
  return new;
end;
$$;

drop trigger if exists stories_viewer_status_trg on public.stories;
create trigger stories_viewer_status_trg
before insert or update of status, scheduled, result_published_at on public.stories
for each row execute function public.stories_viewer_status();

-- 이미 방송에서 읽은 사연은 결과가 공개된 것으로 둡니다 (예전 사연자 화면이 그대로 "방송에서 읽힘"으로 보이게)
update public.stories
   set result_published_at = coalesce(aired_at, now())
 where status = 'read' and result_published_at is null;

-- 사연자에게는 "오래 기다린 사연" 안내 시각만 추가로 보여줘요 (나머지 방송 결과는 서버 함수가 공개된 것만 내보냄)
grant select (waiting_notice_at) on public.stories to authenticated;

-- ---------------------------------------------------------------------
-- 후속 보고: 안전 표시 추가, 쓰기는 서버 함수로만 (개인정보·위험 표현 검사)
-- ---------------------------------------------------------------------
alter table public.follow_ups
  add column flags        text[] not null default '{}',
  add column care_checked boolean not null default false;

create index follow_ups_care_idx on public.follow_ups (care_checked) where 'care' = any (flags);

drop policy if exists follow_ups_owner_insert on public.follow_ups;
revoke insert on public.follow_ups from authenticated;

-- ---------------------------------------------------------------------
-- 상담 후기 (사연 하나에 하나)
-- ---------------------------------------------------------------------
create table public.reviews (
  story_id    uuid primary key references public.stories (id) on delete cascade,
  reaction    text not null check (reaction in ('helped', 'comforted', 'funny', 'still')),
  comment     text not null default '' check (char_length(comment) <= 60),
  share       boolean not null default false,
  status      text not null default 'new' check (status in ('new', 'approved', 'hidden')),
  flags       text[] not null default '{}',
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index reviews_status_idx on public.reviews (status, updated_at desc);

-- ---------------------------------------------------------------------
-- 고민 동물 도감 (로그인 사용자, 방송에서 읽힌 사연만) + 황금 동물
-- ---------------------------------------------------------------------
create table public.dex_entries (
  story_id     uuid primary key references public.stories (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  golden       boolean not null default false,
  golden_code  text unique,
  claim_name   text check (char_length(claim_name) <= 30),
  claimed_at   timestamptz,
  paid_at      timestamptz,
  collected_at timestamptz not null default now()
);

create index dex_entries_user_idx on public.dex_entries (user_id, collected_at);
create index dex_entries_golden_idx on public.dex_entries (golden, claimed_at) where golden;

-- ---------------------------------------------------------------------
-- 설정: 자동 공개(오래 기다린 사연 안내) + 다시보기 시간 형식
-- ---------------------------------------------------------------------
alter table public.settings
  add column auto_notice_enabled boolean not null default true,
  add column auto_notice_days    integer not null default 14 check (auto_notice_days between 1 and 90),
  add column vod_time_param      text    not null default 'currentTime' check (vod_time_param in ('currentTime', 't'));

-- =====================================================================
-- 접근 규칙 (RLS)
-- =====================================================================
alter table public.broadcasts  enable row level security;
alter table public.reviews     enable row level security;
alter table public.dex_entries enable row level security;

revoke all on public.broadcasts, public.reviews, public.dex_entries from anon, authenticated;

-- broadcasts: 정책 없음 → service_role(관리자 서버 함수)만

-- 후기: 본인 사연의 후기만 읽기. 쓰기/고치기/지우기는 서버 함수가 본인(로그인 또는 접수번호+비밀 코드) 확인 후 처리.
grant select (story_id, reaction, comment, share, status, created_at, updated_at) on public.reviews to authenticated;
create policy reviews_owner_read on public.reviews
  for select to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));

-- 도감: 본인 것만 읽기
grant select (story_id, golden, golden_code, claim_name, claimed_at, paid_at, collected_at) on public.dex_entries to authenticated;
create policy dex_owner_read on public.dex_entries
  for select to authenticated using (user_id = (select auth.uid()));

-- =====================================================================
-- 공개용 함수
-- =====================================================================

-- 후기 벽: 승인됨 + 공개 동의 후기의 공개 항목(고민 동물, 반응, 한 줄 후기)만
create or replace function public.review_wall()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('emoji', w.emoji, 'name', w.name, 'reaction', w.reaction, 'comment', w.comment)
                           order by w.at desc), '[]'::json)
  from (
    select a.emoji, a.name, r.reaction, r.comment, coalesce(r.reviewed_at, r.updated_at) as at
      from public.reviews r
      join public.worry_animals a on a.story_id = r.story_id
     where r.status = 'approved' and r.share
     order by at desc
     limit 30
  ) w;
$$;

revoke all on function public.review_wall() from public;
grant execute on function public.review_wall() to anon, authenticated;

-- 오래 기다린 사연 안내 (기존 "자동 답장" 대신). "확인 필요" 사연은 빼고 방장이 직접 확인.
create or replace function public.run_waiting_notices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  st public.settings;
  n  integer;
begin
  select * into st from public.settings where id = 1;
  if not found or not st.auto_notice_enabled then
    return 0;
  end if;
  update public.stories s
     set waiting_notice_at = now()
   where s.waiting_notice_at is null
     and s.status in ('pending', 'approved', 'on_air')
     and not ('care' = any (s.flags))
     and s.created_at < now() - make_interval(days => st.auto_notice_days);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.run_waiting_notices() from public, anon, authenticated;

select cron.schedule('dawoong-waiting-notice', '17 * * * *', $$select public.run_waiting_notices();$$);
