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
  by_status: { pending: number; approved: number; read: number; rejected: number };
  approval_rate: number;
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

  const cat = GOMIN.categories.map((c) => ({ label: c.label, value: d.week_by_category[c.id] ?? 0 }));
  const stamps = GOMIN.stamps.map((s) => ({ label: s.label, value: d.week_by_stamp[s.id] ?? 0, color: s.color }));
  const ages = AGE_ORDER.filter((a) => d.week_by_age[a]).map((a) => ({ label: a, value: d.week_by_age[a] }));

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">통계</h1>
          <p className="adm-dim">이번 주는 월요일부터 세요 (한국 시간).</p>
        </div>
      </header>
      <div className="adm-kpis">
        <Kpi label="이번 주 사연" value={d.week_count} unit="개" />
        <Kpi label="전체 사연" value={d.total} unit="개" />
        <Kpi label="검토 대기" value={d.by_status.pending} unit="개" />
        <Kpi label="방송 대기" value={d.by_status.approved} unit="개" />
        <Kpi label="방송에서 읽음" value={d.by_status.read} unit="개" />
        <Kpi label="반려" value={d.by_status.rejected} unit="개" />
        <Kpi label="승인률" value={d.approval_rate} unit="%" sub="검토한 사연 중 승인한 비율" />
        <Kpi label="AI 호출 오늘" value={d.ai.today} unit="번" sub={d.ai.failed_today ? `실패 ${d.ai.failed_today}번` : "실패 없음"} />
        <Kpi label="AI 호출 이번 달" value={d.ai.month} unit="번" sub={d.ai.enabled ? d.ai.model : "AI 키 없음 (기본 동물만)"} />
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

function Kpi({ label, value, unit, sub }: { label: string; value: number; unit: string; sub?: string }) {
  return (
    <div className="adm-kpi">
      <span className="adm-label">{label}</span>
      <strong>
        <span className="adm-mono">{value}</span>
        <small>{unit}</small>
      </strong>
      {sub && <span className="adm-dim adm-small">{sub}</span>}
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
              <b className="adm-mono">{r.value}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-dim">{empty}</p>
      )}
    </section>
  );
}
