-- =====================================================================
-- 다웅 고민 사연함 : 홍보(릴스·쇼츠) 지원
--  * 릴스·쇼츠 사용 동의 (선택): 이 사연을 다웅의 짧은 영상에 써도 되는지
--  * 영상별 유입: 사이트주소/v/12 처럼 영상마다 다른 주소로 들어온 방문과 사연 수를 셈
-- =====================================================================

alter table public.stories
  add column consent_shorts boolean not null default false,
  add column ref            text check (ref ~ '^[a-z0-9_-]{1,30}$');

create index stories_ref_idx on public.stories (ref) where ref is not null;

-- ---------------------------------------------------------------------
-- 영상별 방문 (같은 기기는 하루에 한 번만 셈. 기기 값은 해시로만 저장)
-- ---------------------------------------------------------------------
create table public.visits (
  id          bigint generated always as identity primary key,
  ref         text not null check (ref ~ '^[a-z0-9_-]{1,30}$'),
  device_hash text not null,
  day         date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at  timestamptz not null default now(),
  unique (ref, device_hash, day)
);

create index visits_ref_idx on public.visits (ref, day);

alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;
-- 정책 없음 → 읽기/쓰기는 아래 함수와 관리자 서버 함수(service_role)만

-- 방문 기록 (브라우저에서 호출). 잘못된 값은 조용히 무시해요.
create or replace function public.log_visit(p_ref text, p_device text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_ref is null or lower(p_ref) !~ '^[a-z0-9_-]{1,30}$' then
    return;
  end if;
  if p_device is null or char_length(p_device) < 8 or char_length(p_device) > 100 then
    return;
  end if;
  insert into public.visits (ref, device_hash)
  values (lower(p_ref), md5('visit:' || p_device))
  on conflict do nothing;
end;
$$;

revoke all on function public.log_visit(text, text) from public;
grant execute on function public.log_visit(text, text) to anon, authenticated;

-- 반년 지난 방문 기록 정리 (매일 새벽 4시 10분, 한국 시간)
select cron.schedule('dawoong-visits-cleanup', '10 19 * * *', $$
  delete from public.visits where created_at < now() - interval '180 days';
$$);
