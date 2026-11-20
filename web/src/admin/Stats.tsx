import { useEffect, useState } from "react";
import { GOMIN } from "@shared/boxes.ts";
import { errMsg, useAdmin } from "./api";
import { Spinner, useToast } from "../components/ui";
import { copyText } from "../lib/image";
import { normalizeRef, videoLink } from "../lib/growth";

type StatsData = {
  week_count: number;
  week_by_category: Record<string, number>;
  week_by_age: Record<string, number>;
  week_by_stamp: Record<string, number>;
  total: number;
  by_status: { pending: number; approved: number; read: number; rejected: number };
  approval_rate: number;
  adoption_rate: number;
  review_count: number;
  review_rate: number;
  published_count: number;
  reactions: { id: string; label: string; count: number; percent: number }[];
  top_animals: [string, number][];
  ai: { today: number; month: number; failed_today: number; enabled: boolean; model: string };
};

const AGE_ORDER = [...GOMIN.ageGroups.map((g) => g.label), "모름"];

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
        <Kpi label="방송 채택률" value={d.adoption_rate} unit="%" sub="들어온 사연 중 방송에서 읽은 비율" />
        <Kpi label="후기 작성률" value={d.review_rate} unit="%" sub={`결과 공개 ${d.published_count}개 중 후기 ${d.review_count}개`} />
        <Kpi label="AI 호출 오늘" value={d.ai.today} unit="번" sub={d.ai.failed_today ? `실패 ${d.ai.failed_today}번` : "실패 없음"} />
        <Kpi label="AI 호출 이번 달" value={d.ai.month} unit="번" sub={d.ai.enabled ? d.ai.model : "AI 키 없음 (기본 동물만)"} />
      </div>
      <RefStats />

      <div className="adm-stat-grid">
        <Bars
          title="후기 반응"
          rows={d.reactions.map((r) => ({ label: `${r.label} ${r.percent}%`, value: r.count }))}
          empty="아직 후기가 없어요."
        />
        <Bars title="이번 주 종류별" rows={cat} />
        <Bars title="이번 주 감정 우표" rows={stamps} />
        <Bars title="이번 주 학년대" rows={ages} empty="이번 주 사연이 아직 없어요." />
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

type RefRow = { ref: string; visits: number; people: number; stories: number; aired: number; rate: number };

/** 릴스·쇼츠 영상별 유입: 영상마다 다른 주소(사이트주소/v/12)를 쓰면 어떤 영상이 사람을 데려왔는지 보여요 */
function RefStats() {
  const { call } = useAdmin();
  const toast = useToast();
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<RefRow[] | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    setRows(null);
    call<{ items: RefRow[] }>("ref_stats", { days })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, [call, days]);

  const ref = normalizeRef(name);
  const link = ref ? videoLink(ref) : "";

  return (
    <section className="adm-panel adm-refs" aria-label="릴스·쇼츠 영상별 유입">
      <div className="row">
        <h2 className="adm-h3">릴스·쇼츠 영상별 유입</h2>
        <span className="spacer" />
        <label className="sr-only" htmlFor="ref-days">
          기간
        </label>
        <select id="ref-days" className="select adm-select-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
          <option value={90}>최근 90일</option>
        </select>
      </div>

      <div className="adm-ref-maker">
        <div className="field">
          <label htmlFor="ref-name">영상 이름으로 링크 만들기 (영어 소문자·숫자·-·_, 30자)</label>
          <input id="ref-name" className="input adm-mono" placeholder="예) 12 또는 love-01" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {name && !ref && <p className="adm-error">영어 소문자, 숫자, -, _ 만 쓸 수 있어요.</p>}
        {link && (
          <p className="adm-ref-link">
            <code>{link}</code>
            <button className="btn btn-sm btn-primary" onClick={async () => toast((await copyText(link)) ? "링크를 복사했어요" : "복사하지 못했어요")}>
              복사
            </button>
          </p>
        )}
        <p className="adm-dim adm-small">
          영상마다 다른 이름을 쓰세요. 이 주소로 들어온 사람이 7일 안에 사연을 보내면 그 영상에서 온 사연으로 세어요. 영상 설명·고정 댓글·프로필 링크·자동 DM에 넣으면 돼요.
        </p>
      </div>

      {!rows ? (
        <p className="adm-dim adm-small">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="adm-dim">아직 영상 링크로 들어온 방문이 없어요.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">영상</th>
                <th scope="col">방문한 사람</th>
                <th scope="col">사연</th>
                <th scope="col">사연 비율</th>
                <th scope="col">방송에서 읽음</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ref}>
                  <th scope="row" className="adm-mono">
                    {r.ref}
                  </th>
                  <td className="adm-mono">{r.people}</td>
                  <td className="adm-mono">{r.stories}</td>
                  <td className="adm-mono">{r.rate}%</td>
                  <td className="adm-mono">{r.aired}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
