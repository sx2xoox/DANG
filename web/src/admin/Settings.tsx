import { useCallback, useEffect, useState, type FormEvent } from "react";
import { errMsg, useAdmin } from "./api";
import { Dialog, Spinner, useToast } from "../components/ui";
import { useSite, type Preset } from "../lib/site";
import { copyText } from "../lib/image";
import { formatDate } from "../lib/format";

type SettingsData = {
  site_name: string;
  tagline: string;
  week_theme: string;
  preset: Preset;
  accepting: boolean;
  auto_notice_enabled: boolean;
  auto_notice_days: number;
  vod_time_param: "currentTime" | "t";
  manager_enabled: boolean;
  obs_key: string | null;
  ai_enabled: boolean;
  ai_model: string;
};

const PRESETS: { id: Preset; name: string; desc: string }[] = [
  { id: "classic", name: "다웅 우체국", desc: "남색 책상 위 항공우편 봉투. 명조 제목과 우표, 소인." },
  { id: "cork", name: "코르크 보드", desc: "사연 모집 전단지와 포스트잇, 실로 이은 카드." },
  { id: "gacha", name: "캡슐 뽑기", desc: "또렷한 외곽선과 캡슐 뽑기 기계." },
];

export default function Settings() {
  const { call } = useAdmin();
  const { refresh, setPresetPreview } = useSite();
  const toast = useToast();
  const [s, setS] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setS(await call<SettingsData>("settings_get"));
    } catch (e) {
      setError(errMsg(e));
    }
  }, [call]);

  useEffect(() => {
    load();
    return () => setPresetPreview(null);
  }, [load, setPresetPreview]);

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!s) return <Spinner />;

  const set = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => setS((p) => (p ? { ...p, [k]: v } : p));

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const next = await call<SettingsData>("settings_update", {
        settings: {
          site_name: s.site_name,
          tagline: s.tagline,
          week_theme: s.week_theme,
          preset: s.preset,
          accepting: s.accepting,
          auto_notice_enabled: s.auto_notice_enabled,
          auto_notice_days: s.auto_notice_days,
          vod_time_param: s.vod_time_param,
        },
      });
      setS(next);
      setPresetPreview(null);
      await refresh();
      toast("설정을 저장했어요");
    } catch (err) {
      toast(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-page">
      <header className="adm-head">
        <h1 className="adm-title">설정</h1>
      </header>

      <form className="adm-panel adm-form" onSubmit={save} aria-label="사이트 설정">
        <h2 className="adm-h3">사이트</h2>
        <div className="field">
          <label htmlFor="st-name">사이트 이름</label>
          <input id="st-name" className="input" value={s.site_name} maxLength={40} onChange={(e) => set("site_name", e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="st-tag">코너 소개 한 줄</label>
          <input id="st-tag" className="input" value={s.tagline} maxLength={80} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="st-theme">이번 주 테마 (비우면 안 보여요)</label>
          <input id="st-theme" className="input" value={s.week_theme} maxLength={40} placeholder="예: 연애 흑역사" onChange={(e) => set("week_theme", e.target.value)} />
        </div>

        <label className="adm-switch">
          <input type="checkbox" checked={s.accepting} onChange={(e) => set("accepting", e.target.checked)} />
          <span>
            <b>사연 받기</b>
            <small>{s.accepting ? "지금 사연을 받고 있어요." : "멈춤: 첫 화면에 \"지금은 사연을 받지 않아요\"가 보여요."}</small>
          </span>
        </label>

        <h2 className="adm-h3">방송 결과</h2>
        <label className="adm-switch">
          <input type="checkbox" checked={s.auto_notice_enabled} onChange={(e) => set("auto_notice_enabled", e.target.checked)} />
          <span>
            <b>자동 공개</b>
            <small>
              방송에서 오래 못 읽은 사연에 "아직 방송에서 못 읽었지만 사연은 잘 받았어요. 다음 방송 후보에 남아 있어요"를 보여줘요. "확인 필요" 사연은 빼고, 방장이 직접 확인해요.
            </small>
          </span>
        </label>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="st-notice">자동 공개 기간 (일)</label>
          <input
            id="st-notice"
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={90}
            disabled={!s.auto_notice_enabled}
            value={s.auto_notice_days}
            onChange={(e) => set("auto_notice_days", Number(e.target.value))}
          />
        </div>
        <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="st-vod">다시보기 링크 시간 형식</label>
          <select id="st-vod" className="select" value={s.vod_time_param} onChange={(e) => set("vod_time_param", e.target.value as SettingsData["vod_time_param"])}>
            <option value="currentTime">?currentTime=초 (치지직 기본)</option>
            <option value="t">?t=초</option>
          </select>
          <small className="adm-dim adm-small">
            링크를 눌렀을 때 그 시간으로 바로 가지 않으면 다른 형식으로 바꿔보세요. 유튜브 주소는 자동으로 t=초를 써요. 사연자 화면에는 "1시간 12분부터"도 글자로 함께 보여요.
          </small>
        </div>

        <h2 className="adm-h3">디자인</h2>
        <div className="adm-presets" role="radiogroup" aria-label="디자인 프리셋">
          {PRESETS.map((p) => (
            <label key={p.id} className="adm-preset">
              <input
                type="radio"
                name="preset"
                value={p.id}
                checked={s.preset === p.id}
                onChange={() => {
                  set("preset", p.id);
                  setPresetPreview(p.id);
                }}
              />
              <span className={`adm-preset-thumb thumb-${p.id}`} aria-hidden="true">
                <span className="t-head" />
                <span className="t-card">
                  <span className="t-line" />
                  <span className="t-line short" />
                  <span className="t-btn" />
                </span>
              </span>
              <span className="adm-preset-name">{p.name}</span>
              <span className="adm-dim adm-small">{p.desc}</span>
            </label>
          ))}
        </div>
        <p className="adm-dim adm-small">고르면 사이트 전체 색이 바로 미리 바뀌어요. 저장해야 시청자 화면과 OBS 카드에도 적용돼요.</p>

        <div className="row">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "저장 중…" : "설정 저장"}
          </button>
        </div>
        <p className="adm-dim adm-small">AI: {s.ai_enabled ? `사용 중 (${s.ai_model})` : "AI 키가 없어 기본 동물만 쓰고 있어요"}</p>
      </form>

      <ManagerSection enabled={s.manager_enabled} onChanged={load} />
      <PasswordSection />
      <AttemptsSection />
      <ExportSection />
    </div>
  );
}

function ManagerSection({ enabled, onChanged }: { enabled: boolean; onChanged: () => Promise<void> }) {
  const { call } = useAdmin();
  const toast = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const create = async () => {
    if (enabled && !window.confirm("새 매니저 코드를 만들면 예전 코드와 매니저 로그인은 모두 끊겨요. 계속할까요?")) return;
    try {
      const res = await call<{ code: string }>("manager_code", { op: "create" });
      setCode(res.code);
      await onChanged();
    } catch (e) {
      toast(errMsg(e));
    }
  };
  return (
    <section className="adm-panel adm-form" aria-label="매니저 코드">
      <h2 className="adm-h3">매니저 코드</h2>
      <p className="adm-dim">
        매니저는 사연 보기, 별표, 다음 사연 뽑기와 방송 화면 조작, 방송 시작·읽기 시작만 할 수 있어요. 승인·반려, 후기 승인, 방송 결과 공개, 다시보기 링크 입력, 황금 동물 지급, 삭제, 설정은 방장만 해요.
      </p>
      <p>
        상태: <b>{enabled ? "켜짐" : "꺼짐"}</b>
      </p>
      {code && (
        <div className="notice notice-yellow" role="status">
          <p>
            새 매니저 코드: <code className="adm-code">{code}</code>
          </p>
          <p className="adm-dim adm-small">이 코드는 지금 한 번만 보여요. 매니저에게 전달해 주세요.</p>
          <button className="btn btn-sm" onClick={async () => toast((await copyText(code)) ? "복사했어요" : "복사하지 못했어요")}>
            복사
          </button>
        </div>
      )}
      <div className="row">
        <button className="btn" onClick={create}>
          {enabled ? "새 코드 만들기" : "매니저 코드 만들기"}
        </button>
        {enabled && (
          <button className="btn btn-ghost" onClick={() => setConfirmOff(true)}>
            매니저 코드 끄기
          </button>
        )}
      </div>
      {confirmOff && (
        <Dialog title="매니저 코드를 끌까요?" onClose={() => setConfirmOff(false)}>
          <p>로그인해 있는 매니저도 바로 로그아웃돼요.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirmOff(false)}>
              취소
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                try {
                  await call("manager_code", { op: "disable" });
                  setCode(null);
                  toast("매니저 코드를 껐어요");
                  await onChanged();
                } catch (e) {
                  toast(errMsg(e));
                }
                setConfirmOff(false);
              }}
            >
              끄기
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

function PasswordSection() {
  const { call } = useAdmin();
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (f.next.length < 8) return setError("새 비밀번호는 8자 이상으로 정해주세요.");
    if (f.next !== f.confirm) return setError("새 비밀번호 두 번이 서로 달라요.");
    setBusy(true);
    try {
      await call("change_password", f);
      setF({ current: "", next: "", confirm: "" });
      toast("비밀번호를 바꿨어요. 다른 기기의 방장 로그인은 끊겼어요");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="adm-panel adm-form" onSubmit={submit} aria-label="비밀번호 바꾸기">
      <h2 className="adm-h3">관리자 비밀번호 바꾸기</h2>
      <div className="field">
        <label htmlFor="pw-cur">지금 비밀번호</label>
        <input id="pw-cur" className="input" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required />
      </div>
      <div className="adm-form-row">
        <div className="field">
          <label htmlFor="pw-new">새 비밀번호 (8자 이상)</label>
          <input id="pw-new" className="input" type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="pw-new2">새 비밀번호 한 번 더</label>
          <input id="pw-new2" className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required />
        </div>
      </div>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "바꾸는 중…" : "비밀번호 바꾸기"}
        </button>
      </div>
    </form>
  );
}

function AttemptsSection() {
  const { call } = useAdmin();
  const [items, setItems] = useState<{ success: boolean; detail: string | null; created_at: string }[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !items) call<{ items: typeof items }>("attempts").then((r) => setItems(r.items ?? []));
  }, [open, items, call]);
  return (
    <section className="adm-panel" aria-label="로그인 기록">
      <details onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="adm-h3">관리자 로그인 기록 (최근 50개)</summary>
        {!items ? (
          <p className="adm-dim adm-small">불러오는 중…</p>
        ) : (
          <ul className="adm-attempts">
            {items.map((a, i) => (
              <li key={i}>
                <span className={`chip ${a.success ? "chip-blue" : "chip-red"}`}>{a.success ? "성공" : "실패"}</span>
                <span className="adm-dim adm-small">{formatDate(a.created_at, true)}</span>
                <span className="adm-attempt-detail">{a.detail}</span>
              </li>
            ))}
            {!items.length && <li className="adm-dim adm-small">기록이 없어요.</li>}
          </ul>
        )}
      </details>
    </section>
  );
}

function ExportSection() {
  const { call } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const text = await call<string>("export_csv");
      const blob = new Blob(["﻿" + String(text).replace(/^﻿/, "")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sayeon-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast("CSV 파일을 내려받았어요");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="adm-panel" aria-label="내보내기">
      <h2 className="adm-h3">내보내기</h2>
      <p className="adm-dim">전체 사연을 엑셀에서 열 수 있는 CSV 파일로 내려받아요. 개인정보가 담겨 있으니 보관에 주의해 주세요.</p>
      <button className="btn" onClick={download} disabled={busy}>
        {busy ? "만드는 중…" : "CSV 내려받기"}
      </button>
    </section>
  );
}
