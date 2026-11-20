-- =====================================================================
-- 다웅 고민 사연함 : 데이터베이스 구조 + 접근 규칙(RLS)
--
-- 원칙
--  * 비로그인 시청자: DB를 직접 읽거나 쓸 수 없음. 제출/답장 확인은 서버 함수(public)를 거침.
--  * 로그인 시청자: 본인 사연(user_id = auth.uid())과 그 답장/동물/후속 보고만 읽기·삭제.
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
  tagline             text    not null default '다웅이 직접 읽고 답해주는 고민 상담 코너',
  week_theme          text    not null default '',
  preset              text    not null default 'classic' check (preset in ('classic', 'cork', 'gacha')),
  accepting           boolean not null default true,
  auto_reply_enabled  boolean not null default true,
  auto_reply_days     integer not null default 7 check (auto_reply_days between 1 and 60),
  admin_password_hash text,
  manager_enabled     boolean not null default false,
  manager_code_hash   text,
  obs_key             text,
  updated_at          timestamptz not null default now()
);

insert into public.settings (id) values (1);

-- ---------------------------------------------------------------------
-- 사연
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
  visibility       text not null check (visibility in ('named', 'anonymous', 'private')),
  badge            text not null,
  status           text not null default 'new'
                   check (status in ('new', 'starred', 'scheduled', 'on_air', 'read', 'hold')),
  flags            text[] not null default '{}',
  animal_state     text not null default 'pending'
                   check (animal_state in ('pending', 'ready', 'fallback', 'failed', 'manual')),
  viewer_status    text not null default 'received'
                   check (viewer_status in ('received', 'scheduled', 'aired', 'private', 'replied')),
  aired_at         timestamptz,
  created_at       timestamptz not null default now(),
  unique (box_id, receipt_no)
);

create index stories_created_idx on public.stories (created_at desc);
create index stories_user_idx on public.stories (user_id);
create index stories_status_idx on public.stories (status);

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

-- ---------------------------------------------------------------------
-- 후속 보고
-- ---------------------------------------------------------------------
create table public.follow_ups (
  id         uuid primary key default gen_random_uuid(),
  story_id   uuid not null references public.stories (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index follow_ups_story_idx on public.follow_ups (story_id);

-- ---------------------------------------------------------------------
-- 고민 동물 (사연 하나에 하나, 다시 만들면 덮어씀)
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
-- 답장 (초안은 sent_at 이 비어 있음 → 시청자에게 보이지 않음)
-- ---------------------------------------------------------------------
create table public.replies (
  story_id    uuid primary key references public.stories (id) on delete cascade,
  body        text not null default '',
  draft       text,
  kind        text not null default 'manual' check (kind in ('manual', 'auto')),
  aired_on    date,
  vod_url     text,
  verdict_yes integer check (verdict_yes between 0 and 100),
  verdict_no  integer check (verdict_no between 0 and 100),
  sent_at     timestamptz,
  opened_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
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

create table public.broadcast_state (
  id         integer primary key default 1 check (id = 1),
  story_id   uuid references public.stories (id) on delete set null,
  revealed   boolean not null default false,
  hidden     boolean not null default true,
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

-- ---------------------------------------------------------------------
-- 시청자에게 보여줄 상태 (접수됨 / 방송 예정 / 방송에서 읽음 / 방장만 봄 / 답장 도착)
-- 별표, 보류 같은 내부 상태는 시청자에게 보이지 않음
-- ---------------------------------------------------------------------
create or replace function public.compute_viewer_status(p_story uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.replies r where r.story_id = s.id and r.sent_at is not null) then 'replied'
    when s.visibility = 'private' then 'private'
    when s.status = 'read' then 'aired'
    when s.status in ('scheduled', 'on_air') then 'scheduled'
    else 'received'
  end
  from public.stories s
  where s.id = p_story;
$$;

create or replace function public.stories_viewer_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.viewer_status := case
    when exists (select 1 from public.replies r where r.story_id = new.id and r.sent_at is not null) then 'replied'
    when new.visibility = 'private' then 'private'
    when new.status = 'read' then 'aired'
    when new.status in ('scheduled', 'on_air') then 'scheduled'
    else 'received'
  end;
  return new;
end;
$$;

create trigger stories_viewer_status_trg
before insert or update of status, visibility on public.stories
for each row execute function public.stories_viewer_status();

create or replace function public.replies_touch_story()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid := coalesce(new.story_id, old.story_id);
begin
  update public.stories
     set viewer_status = public.compute_viewer_status(sid)
   where id = sid;
  return null;
end;
$$;

create trigger replies_touch_story_trg
after insert or update or delete on public.replies
for each row execute function public.replies_touch_story();

-- =====================================================================
-- 접근 규칙 (RLS)
-- =====================================================================
alter table public.boxes           enable row level security;
alter table public.settings        enable row level security;
alter table public.stories         enable row level security;
alter table public.follow_ups      enable row level security;
alter table public.worry_animals   enable row level security;
alter table public.replies         enable row level security;
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

-- 고민 동물: 본인 사연이고, 답장이 발송된 뒤에만 보임 (공개는 답장과 함께)
grant select (story_id, name, emoji, why, description, quote, hashtags, prev_name, prev_emoji,
              change_reason, created_at)
  on public.worry_animals to authenticated;

create policy animals_owner_read_after_reply on public.worry_animals
  for select to authenticated
  using (exists (
    select 1
      from public.stories s
      join public.replies r on r.story_id = s.id
     where s.id = worry_animals.story_id
       and s.user_id = (select auth.uid())
       and r.sent_at is not null
  ));

-- 답장: 본인 사연이고 발송된 것만. 초안(draft) 열은 제외.
grant select (story_id, body, kind, aired_on, vod_url, verdict_yes, verdict_no, sent_at, opened_at)
  on public.replies to authenticated;

create policy replies_owner_read_sent on public.replies
  for select to authenticated
  using (sent_at is not null
         and exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));

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

-- 첫 화면 정보: 사이트 이름, 테마, 접수 여부, 이번 주 사연 수 (내용은 없음)
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
    'total_replied', (select count(*) from public.replies r where r.sent_at is not null)
  )
  from public.settings st
  where st.id = 1;
$$;

grant execute on function public.home_info() to anon, authenticated;

-- 로그인 사용자가 답장을 열었을 때 표시 (빨간 점 지우기)
create or replace function public.mark_reply_opened(p_story uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.replies r
     set opened_at = coalesce(r.opened_at, now())
    from public.stories s
   where r.story_id = p_story
     and s.id = r.story_id
     and s.user_id = auth.uid()
     and r.sent_at is not null;
$$;

grant execute on function public.mark_reply_opened(uuid) to authenticated;

-- =====================================================================
-- 자동 답장 (기본 7일 동안 답장을 못 한 사연)
--  * "확인 필요" 표시가 있는 사연은 절대 자동 답장하지 않음
--  * 방장이 최근 하루 안에 초안을 만지고 있으면 건너뜀
-- =====================================================================
create or replace function public.run_auto_replies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  st public.settings;
  cheers text[] := array[
    '혼자 고민한 시간이 헛되지 않았기를 바라요. 사연 보내줘서 고마워요.',
    '이렇게 마음을 꺼내 적은 것만으로도 이미 한 걸음 나아간 거예요.',
    '지금 답이 안 보여도 괜찮아요. 천천히 가도 충분해요.',
    '당신의 고민, 잘 받았어요. 오늘은 스스로에게 조금 다정해지기로 해요.',
    '고민이 많다는 건 그만큼 잘 지내고 싶다는 뜻이래요. 응원할게요.',
    '다음에 또 이야기 들려주세요. 언제든 여기 있을게요.'
  ];
  n integer := 0;
begin
  select * into st from public.settings where id = 1;
  if not st.auto_reply_enabled then
    return 0;
  end if;

  with targets as (
    select s.id
      from public.stories s
      join public.worry_animals a on a.story_id = s.id
      left join public.replies r on r.story_id = s.id
     where s.created_at < now() - make_interval(days => st.auto_reply_days)
       and not ('care' = any (s.flags))
       and (r.story_id is null
            or (r.sent_at is null and (r.draft is null or r.updated_at < now() - interval '1 day')))
  )
  insert into public.replies (story_id, body, kind, sent_at, updated_at)
  select t.id, cheers[1 + floor(random() * array_length(cheers, 1))::int], 'auto', now(), now()
    from targets t
  on conflict (story_id) do update
     set body = excluded.body, kind = 'auto', sent_at = excluded.sent_at, draft = null,
         updated_at = now();

  get diagnostics n = row_count;
  return n;
end;
$$;

-- 매시간 7분에 자동 답장 확인, 매일 새벽 4시에 오래된 운영 기록 정리
select cron.schedule('dawoong-auto-reply', '7 * * * *', $$select public.run_auto_replies();$$);
select cron.schedule('dawoong-cleanup', '0 19 * * *', $$
  delete from public.admin_sessions where expires_at < now();
  delete from public.submit_log where created_at < now() - interval '3 days';
  delete from public.auth_attempts where created_at < now() - interval '30 days';
$$);
