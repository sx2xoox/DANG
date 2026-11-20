import { useEffect, useState } from "react";
import { GOMIN } from "@shared/boxes.ts";
import { errMsg, useAdmin } from "./api";
import { Spinner } from "../components/ui";

type StatsData = {
  week_count: number;
  week_by_category: Record<string, number>;
  week_by_age: Record<string, number>;
  week_by_stamp: Record<string, number>;
  total: number;
  replied: number;
  auto_replied: number;
  reply_rate: number;
  top_animals: [string, number][];
  ai: { today: number; month: number; failed_today: number; enabled: boolean; model: string };
};

const AGE_ORDER = ["13세 이하", "14~19세", "20~24세", "25~29세", "30대", "40세 이상", "모름"];

export default function Stats() {
  const { call } = useAdmin();
  const [d, setD] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    call<StatsData>("stats").then(setD).catch((e) => setError(errMsg(e)));
  }, [call]);

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!d) return <Spinner />;

  const cat = GOMIN.categories.map((c) => ({ label: `${c.emoji} ${c.label}`, value: d.week_by_category[c.id] ?? 0 }));
  const stamps = GOMIN.stamps.map((s) => ({ label: `${s.emoji} ${s.label}`, value: d.week_by_stamp[s.id] ?? 0, color: s.color }));
  const ages = AGE_ORDER.filter((a) => d.week_by_age[a]).map((a) => ({ label: a, value: d.week_by_age[a] }));

  return (
    <div className="stack">
      <header className="adm-page-head">
        <h1 className="display">통계</h1>
        <p className="muted">이번 주는 월요일부터 세요 (한국 시간).</p>
      </header>
      <div className="adm-kpis">
        <Kpi label="이번 주 사연" value={`${d.week_count}개`} />
        <Kpi label="전체 사연" value={`${d.total}개`} />
        <Kpi label="답장 완료율" value={`${d.reply_rate}%`} sub={`${d.replied}개 답장 (자동 ${d.auto_replied})`} />
        <Kpi label="AI 호출 오늘" value={`${d.ai.today}번`} sub={d.ai.failed_today ? `실패 ${d.ai.failed_today}번` : "실패 없음"} />
        <Kpi label="AI 호출 이번 달" value={`${d.ai.month}번`} sub={d.ai.enabled ? d.ai.model : "AI 키 없음 (기본 동물만)"} />
      </div>
      <div className="adm-stat-grid">
        <Bars title="이번 주 종류별" rows={cat} />
        <Bars title="이번 주 감정 우표" rows={stamps} />
        <Bars title="이번 주 나이대" rows={ages} empty="이번 주 사연이 아직 없어요." />
        <Bars
          title="많이 나온 고민 동물"
          rows={d.top_animals.map(([label, value]) => ({ label, value }))}
          empty="아직 고민 동물이 없어요."
        />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="adm-kpi">
      <span className="faint">{label}</span>
      <strong className="display">{value}</strong>
      {sub && <span className="faint">{sub}</span>}
    </div>
  );
}

function Bars({ title, rows, empty }: { title: string; rows: { label: string; value: number; color?: string }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const visible = rows.filter((r) => r.value > 0 || !empty);
  return (
    <section className="adm-panel">
      <h2 className="adm-h3">{title}</h2>
      {visible.length ? (
        <ul className="adm-bars">
          {visible.map((r) => (
            <li key={r.label}>
              <span className="adm-bar-label">{r.label}</span>
              <span className="adm-bar" aria-hidden="true">
                <span style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
              </span>
              <b>{r.value}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="faint">{empty}</p>
      )}
    </section>
  );
}
