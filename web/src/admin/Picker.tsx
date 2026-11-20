import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GOMIN, optionLabel } from "@shared/boxes.ts";
import { errMsg, useAdmin } from "./api";
import { Roulette, type RouletteCandidate } from "../components/Roulette";
import { StampSticker, useToast } from "../components/ui";
import { ADMIN_STATUS, formatDate } from "../lib/format";
import { useSite } from "../lib/site";
import { store } from "../lib/supabase";
import ReadMode from "./ReadMode";

type PickResult = {
  result: { id: string; receipt_no: number; display_name: string; visibility: string; summary: string; stamp: string; category: string; status: string };
  roulette: { id: string; duration_ms: number; result_index: number; candidates: RouletteCandidate[] };
  pool_size: number;
};

type TodayPick = { picked_at: string; id: string; receipt_no: number; broadcast_name: string; summary: string; stamp: string; status: string };

type Cond = { statuses: string[]; categories: string[]; exclude_read: boolean; show_on_obs: boolean };

const PICK_STATUSES = ["new", "starred", "scheduled"];

export default function Picker() {
  const { call, isOwner } = useAdmin();
  const { info } = useSite();
  const toast = useToast();
  const [cond, setCond] = useState<Cond>(() =>
    store.get<Cond>("dg.admin.pickCond", { statuses: [], categories: [], exclude_read: true, show_on_obs: true }),
  );
  const [spin, setSpin] = useState<(PickResult & { startedAt: number }) | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState<TodayPick[]>([]);
  const [reading, setReading] = useState<string | null>(null);

  const loadToday = useCallback(async () => {
    try {
      setToday((await call<{ items: TodayPick[] }>("today_picks")).items);
    } catch {
      /* noop */
    }
  }, [call]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    store.set("dg.admin.pickCond", cond);
  }, [cond]);

  const toggle = (key: "statuses" | "categories", v: string) =>
    setCond((c) => ({ ...c, [key]: c[key].includes(v) ? c[key].filter((x) => x !== v) : [...c[key], v] }));

  const go = async () => {
    setBusy(true);
    setDone(false);
    try {
      const res = await call<PickResult>("pick", { filters: cond, show_on_obs: cond.show_on_obs });
      setSpin({ ...res, startedAt: Date.now() });
      loadToday();
    } catch (e) {
      toast(errMsg(e));
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast(msg);
      loadToday();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const r = spin?.result;

  return (
    <div className="stack">
      <header className="adm-page-head">
        <h1 className="display">사연 뽑기</h1>
        <p className="muted">조건을 고르고 룰렛을 돌려요. "방장만 보기" 사연은 뽑히지 않아요.</p>
      </header>

      <section className="adm-panel adm-pick-cond" aria-label="뽑기 조건">
        <fieldset>
          <legend>상태 (안 고르면 전부)</legend>
          <div className="adm-chips">
            {PICK_STATUSES.map((st) => (
              <label key={st} className="adm-chk">
                <input type="checkbox" checked={cond.statuses.includes(st)} onChange={() => toggle("statuses", st)} />
                <span>{ADMIN_STATUS[st]}만</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>고민 종류 (안 고르면 전부)</legend>
          <div className="adm-chips">
            {GOMIN.categories.map((c) => (
              <label key={c.id} className="adm-chk">
                <input type="checkbox" checked={cond.categories.includes(c.id)} onChange={() => toggle("categories", c.id)} />
                <span>
                  <span aria-hidden="true">{c.emoji}</span> {c.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="adm-chips">
          <label className="adm-chk">
            <input type="checkbox" checked={cond.exclude_read} onChange={(e) => setCond((c) => ({ ...c, exclude_read: e.target.checked }))} />
            <span>이미 읽은 건 제외</span>
          </label>
          <label className="adm-chk">
            <input type="checkbox" checked={cond.show_on_obs} onChange={(e) => setCond((c) => ({ ...c, show_on_obs: e.target.checked }))} />
            <span>OBS 화면에도 룰렛 보여주기</span>
          </label>
        </div>
        <button className="btn btn-primary btn-lg" onClick={go} disabled={busy && !done}>
          {spin && !done ? "돌아가는 중…" : spin ? "다시 뽑기" : "랜덤 사연 뽑기"}
        </button>
      </section>

      {spin && (
        <section className="adm-panel" aria-label="룰렛">
          <p className="faint">후보 {spin.pool_size}개 중에서 뽑는 중</p>
          <Roulette
            key={spin.roulette.id}
            candidates={spin.roulette.candidates}
            resultIndex={spin.roulette.result_index}
            startedAt={spin.startedAt}
            durationMs={spin.roulette.duration_ms}
            preset={info.preset}
            onDone={() => {
              setDone(true);
              setBusy(false);
            }}
          />
          {done && r && (
            <div className="adm-pick-result" role="status">
              <StampSticker stamp={r.stamp} size="md" />
              <div>
                <p className="faint">
                  #{r.receipt_no} · {r.visibility === "named" ? r.display_name : "익명의 사연자"} · {optionLabel(GOMIN.categories, r.category)}
                </p>
                <p className="display adm-pick-sum">{r.summary}</p>
              </div>
              <div className="row">
                <button className="btn btn-primary" onClick={() => setReading(r.id)}>
                  읽기 모드
                </button>
                {isOwner && (
                  <button className="btn" onClick={() => act(() => call("set_status", { id: r.id, status: "on_air" }), "방송 중으로 표시했어요")}>
                    방송 중으로 표시
                  </button>
                )}
                <button className="btn" onClick={go}>
                  다시 뽑기
                </button>
                <button className="btn btn-ghost" onClick={() => act(() => call("broadcast", { op: "hide" }), "OBS 카드를 숨겼어요")}>
                  카드 숨기기
                </button>
                <Link className="btn btn-ghost" to={`/admin/s/${r.id}`}>
                  자세히
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="adm-panel">
        <h2 className="adm-h3">오늘 뽑은 사연 {today.length}</h2>
        <ul className="adm-today">
          {today.map((t, i) => (
            <li key={t.id + t.picked_at + i}>
              <span className="faint">{formatDate(t.picked_at, true).split(" ").slice(-2).join(" ")}</span>
              <StampSticker stamp={t.stamp} size="sm" />
              <Link to={`/admin/s/${t.id}`}>
                #{t.receipt_no} {t.summary}
              </Link>
              <span className={`chip adm-status st-${t.status}`}>{ADMIN_STATUS[t.status]}</span>
            </li>
          ))}
          {!today.length && <li className="faint">아직 오늘 뽑은 사연이 없어요.</li>}
        </ul>
      </section>

      {reading && <ReadMode id={reading} onClose={() => setReading(null)} onChanged={loadToday} />}
    </div>
  );
}
