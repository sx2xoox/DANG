-- =====================================================================
-- 새 기본 디자인 "동네 고민 상담소"(lounge)
-- 나이·고민 크기 상관없이 누구나 편하게 들어와 이야기하는 분위기.
-- 기존 프리셋(다웅 우체국, 코르크 보드, 캡슐 뽑기)도 관리자 설정에서 계속 고를 수 있어요.
-- =====================================================================
alter table public.settings drop constraint if exists settings_preset_check;
alter table public.settings add constraint settings_preset_check check (preset in ('lounge', 'classic', 'cork', 'gacha'));
alter table public.settings alter column preset set default 'lounge';

-- 기본 디자인(다웅 우체국)을 쓰고 있었다면 새 기본 디자인으로 바꿔요. (코르크·캡슐을 고른 경우는 그대로)
update public.settings set preset = 'lounge' where id = 1 and preset = 'classic';
