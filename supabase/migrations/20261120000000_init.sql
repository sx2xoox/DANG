-- =====================================================================
-- 다웅 고민 사연함 : 데이터베이스 구조 + 접근 규칙(RLS)
--
-- 흐름
--   사연 제출 → (그 자리에서) 고민 동물 결과 → 관리자 검토(승인/반려)
--   → 승인된 사연은 방송 대기열에 저장 → 방송 중 OBS 로 열어서 읽음
--
-- 원칙
--  * 비로그인 시청자: DB를 직접 읽거나 쓸 수 없음. 제출/조회는 서버 함수(public)를 거침.
--  * 로그인 시청자: 본인 사연(user_id = auth.uid())과 그 고민 동물/후속 보고만 읽기·삭제.
--  * 관리자/매니저: 서버 함수(admin)가 관리자 세션을 확인한 뒤 service_role 로만 접근.
--    → 브라우저에 내려가는 키(anon/publishable)로는 전체 사연을 읽는 규칙 자체가 없음.
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------
-- 사연함 종류 (고민 사연함, 나중에 환불원정대 등)
-- ---------------------------------------------------------------------
create table public.boxes (
  id           text primary key,
  name         text not null,
  active       boolean not null default true,
  next_receipt integer not null default 1,
  created_at   timestamptz not null default now()
);

insert into public.boxes (id, name) values ('gomin', '다웅 고민 사연함');

-- ---------------------------------------------------------------------
-- 사이트 설정 (한 줄)
-- ---------------------------------------------------------------------
create table public.settings (
  id                  integer primary key default 1 check (id = 1),
  site_name           text    not null default '다웅 고민 사연함',
  tagline             text    not null default '다웅이 방송에서 직접 읽어주는 고민 상담 코너',
  week_theme          text    not null default '',
  preset              text    not null default 'classic' check (preset in ('classic', 'cork', 'gacha')),
  accepting           boolean not null default true,
  admin_password_hash text,
  manager_enabled     boolean not null default false,
  manager_code_hash   text,
  obs_key             text,
  updated_at          timestamptz not null default now()
);

insert into public.settings (id) values (1);

-- ---------------------------------------------------------------------
-- 사연
--   status: pending(검토 대기) → approved(방송 대기) → on_air(방송 중) → read(방송에서 읽음)
--           pending → rejected(이번엔 소개 안 함)
-- ---------------------------------------------------------------------
create table public.stories (
  id               uuid primary key default gen_random_uuid(),
  box_id           text not null default 'gomin' references public.boxes (id),
  receipt_no       integer not null,
  user_id          uuid references auth.users (id) on delete set null,
  code_salt        text not null,
  code_hash        text not null,
  name_mode        text not null check (name_mode in ('chzzk', 'anon')),
  display_name     text not null check (char_length(display_name) between 1 and 30),
  age              integer check (age between 5 and 99),
  gender           text check (gender in ('male', 'female', 'none')),
  category         text not null,
  write_mode       text not null check (write_mode in ('template', 'free')),
  template_id      text,
  template_answers jsonb,
  body             text not null check (char_length(body) between 5 and 6000),
  summary          text not null check (char_length(summary) between 1 and 30),
  temperature      integer not null check (temperature between 0 and 100),
  wish             text not null,
  stamp            text not null,
  voice            text not null,
  visibility       text not null check (visibility in ('named', 'anonymous')),
  badge            text not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'approved', 'on_air', 'read', 'rejected')),
  starred          boolean not null default false,
  flags            text[] not null default '{}',
  animal_state     text not null default 'pending'
                   check (animal_state in ('pending', 'ready', 'fallback', 'failed', 'manual')),
  viewer_status    text not null default 'reviewing'
                   check (viewer_status in ('reviewing', 'approved', 'aired', 'not_selected')),
  reviewed_at      timestamptz,
  aired_at         timestamptz,
  created_at       timestamptz not null default now(),
  unique (box_id, receipt_no)
);

create index stories_created_idx on public.stories (created_at desc);
create index stories_user_idx on public.stories (user_id);
create index stories_status_idx on public.stories (status, created_at);

-- 접수번호 자동 부여 (사연함마다 1, 2, 3 ...)
create or replace function public.assign_receipt_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.boxes
     set next_receipt = next_receipt + 1
   where id = new.box_id
  returning next_receipt - 1 into new.receipt_no;
  if new.receipt_no is null then
    raise exception 'unknown box %', new.box_id;
  end if;
  return new;
end;
$$;

create trigger stories_receipt_no
before insert on public.stories
for each row execute function public.assign_receipt_no();

-- 시청자에게 보여줄 상태 (검토 중 / 방송 대기 / 방송에서 읽음 / 이번엔 소개 안 됨)
create or replace function public.stories_viewer_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.viewer_status := case new.status
    when 'approved' then 'approved'
    when 'on_air' then 'approved'
    when 'read' then 'aired'
    when 'rejected' then 'not_selected'
    else 'reviewing'
  end;
  return new;
end;
$$;

create trigger stories_viewer_status_trg
before insert or update of status on public.stories
for each row execute function public.stories_viewer_status();

-- ---------------------------------------------------------------------
-- 후속 보고 (로그인 사용자가 "그 뒤로 어떻게 됐는지" 이어 쓰기)
-- ---------------------------------------------------------------------
create table public.follow_ups (
  id         uuid primary key default gen_random_uuid(),
  story_id   uuid not null references public.stories (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index follow_ups_story_idx on public.follow_ups (story_id);

-- ---------------------------------------------------------------------
-- 고민 동물 (사연 하나에 하나, 제출 직후 만들어져 바로 공개)
-- ---------------------------------------------------------------------
create table public.worry_animals (
  story_id      uuid primary key references public.stories (id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 12),
  emoji         text not null,
  why           text not null,
  description   text not null,
  quote         text not null,
  hashtags      text[] not null,
  source        text not null check (source in ('ai', 'fallback', 'manual')),
  prev_name     text,
  prev_emoji    text,
  change_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 로그인 사용자 프로필 (이메일은 저장하지 않음)
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  default_name text check (char_length(default_name) <= 30),
  name_mode    text check (name_mode in ('chzzk', 'anon')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 관리자/운영용 (service_role 전용)
-- ---------------------------------------------------------------------
create table public.admin_sessions (
  token_hash text primary key,
  role       text not null check (role in ('owner', 'manager')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  user_agent text
);

create table public.auth_attempts (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('admin', 'lookup')),
  key_hash   text not null,
  success    boolean not null,
  detail     text,
  created_at timestamptz not null default now()
);

create index auth_attempts_lookup_idx on public.auth_attempts (kind, key_hash, created_at desc);

create table public.submit_log (
  id          bigint generated always as identity primary key,
  device_hash text not null,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index submit_log_device_idx on public.submit_log (device_hash, created_at desc);
create index submit_log_ip_idx on public.submit_log (ip_hash, created_at desc);

-- OBS 방송 카드 상태 (한 줄)
create table public.broadcast_state (
  id         integer primary key default 1 check (id = 1),
  story_id   uuid references public.stories (id) on delete set null,
  revealed   boolean not null default false,
  hidden     boolean not null default true,
  scroll     integer not null default 0,
  roulette   jsonb,
  updated_at timestamptz not null default now()
);

insert into public.broadcast_state (id) values (1);

create table public.picks (
  id        bigint generated always as identity primary key,
  story_id  uuid not null references public.stories (id) on delete cascade,
  picked_at timestamptz not null default now()
);

create table public.ai_usage (
  id            bigint generated always as identity primary key,
  kind          text not null,
  ok            boolean not null,
  model         text,
  input_tokens  integer,
  output_tokens integer,
  error         text,
  created_at    timestamptz not null default now()
);

create index ai_usage_created_idx on public.ai_usage (created_at desc);

-- =====================================================================
-- 접근 규칙 (RLS)
-- =====================================================================
alter table public.boxes           enable row level security;
alter table public.settings        enable row level security;
alter table public.stories         enable row level security;
alter table public.follow_ups      enable row level security;
alter table public.worry_animals   enable row level security;
alter table public.profiles        enable row level security;
alter table public.admin_sessions  enable row level security;
alter table public.auth_attempts   enable row level security;
alter table public.submit_log      enable row level security;
alter table public.broadcast_state enable row level security;
alter table public.picks           enable row level security;
alter table public.ai_usage        enable row level security;

-- 기본 권한을 모두 회수한 뒤 필요한 것만 다시 줍니다.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- 사연함 목록은 누구나 읽기 가능 (이름, 활성 여부)
grant select (id, name, active) on public.boxes to anon, authenticated;
create policy boxes_read on public.boxes for select to anon, authenticated using (true);

-- 사연: 본인 것만 읽기/삭제. 비밀 코드 해시, 내부 상태, 관리자 표시는 열 권한에서 제외.
grant select (id, box_id, receipt_no, user_id, name_mode, display_name, age, gender, category,
              write_mode, template_id, template_answers, body, summary, temperature, wish, stamp,
              voice, visibility, badge, viewer_status, aired_at, created_at)
  on public.stories to authenticated;
grant delete on public.stories to authenticated;

create policy stories_owner_read on public.stories
  for select to authenticated using (user_id = (select auth.uid()));
create policy stories_owner_delete on public.stories
  for delete to authenticated using (user_id = (select auth.uid()));

-- 후속 보고: 본인 사연에만 읽기/쓰기
grant select (id, story_id, body, created_at) on public.follow_ups to authenticated;
grant insert (story_id, body) on public.follow_ups to authenticated;
grant delete on public.follow_ups to authenticated;

create policy follow_ups_owner_read on public.follow_ups
  for select to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));
create policy follow_ups_owner_insert on public.follow_ups
  for insert to authenticated
  with check (exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));
create policy follow_ups_owner_delete on public.follow_ups
  for delete to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));

-- 고민 동물: 본인 사연 것만 (제출 직후 바로 공개)
grant select (story_id, name, emoji, why, description, quote, hashtags, prev_name, prev_emoji,
              change_reason, created_at)
  on public.worry_animals to authenticated;

create policy animals_owner_read on public.worry_animals
  for select to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));

-- 프로필: 본인 것만
grant select, insert, update on public.profiles to authenticated;

create policy profiles_owner_read on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_owner_insert on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_owner_update on public.profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- settings, admin_sessions, auth_attempts, submit_log, broadcast_state, picks, ai_usage:
-- 정책 없음 → anon/authenticated 는 아무것도 못 함 (service_role 만 가능)

-- =====================================================================
-- 공개용 함수 (브라우저에서 호출 가능)
-- =====================================================================

-- 첫 화면 정보: 사이트 이름, 테마, 접수 여부, 사연 수 (내용은 없음)
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
    'total_aired', (select count(*) from public.stories s where s.status = 'read')
  )
  from public.settings st
  where st.id = 1;
$$;

grant execute on function public.home_info() to anon, authenticated;

-- 매일 새벽 4시(한국 시간)에 오래된 운영 기록 정리
select cron.schedule('dawoong-cleanup', '0 19 * * *', $$
  delete from public.admin_sessions where expires_at < now();
  delete from public.submit_log where created_at < now() - interval '3 days';
  delete from public.auth_attempts where created_at < now() - interval '30 days';
$$);
