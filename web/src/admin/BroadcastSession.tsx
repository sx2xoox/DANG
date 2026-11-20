import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatOffset } from "@shared/results.ts";
import { errMsg, useAdmin, type Broadcast } from "./api";
import { Dialog, useToast } from "../components/ui";

/** "읽기 시작" 결과 안내 문구 */
export function readStartMessage(res: { offset_sec: number; auto_started: boolean; receipt_no: number }): string {
  if (res.auto_started) return `#${res.receipt_no} 읽기 시작! 방송 시작이 없어서 지금을 방송 시작으로 기록했어요. 오늘 방송 정리에서 고칠 수 있어요`;
  return `#${res.receipt_no} 읽기 시작 · 다시보기 ${formatOffset(res.offset_sec)} 지점으로 기록했어요`;
}

/** datetime-local 입력칸 값 (이 기기 시간대 기준) */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
}

/** 방송 시작 시각 기록: 버튼 한 번. 시각은 직접 고칠 수도 있어요. */
export function BroadcastSessionBar() {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const [current, setCurrent] = useState<Broadcast | null | undefined>(undefined);
  const [readCount, setReadCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await call<{ current: Broadcast | null; read_count: number }>("broadcast_current");
      setCurrent(r.current);
      setReadCount(r.read_count);
    } catch {
      setCurrent(null);
    }
  }, [call]);

  useEffect(() => {
    load();
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [load]);

  const start = async (newSession = false) => {
    try {
      const r = await call<{ broadcast: Broadcast; created: boolean }>("broadcast_start", { new_session: newSession });
      setCurrent(r.broadcast);
      toast(r.created ? "방송 시작 시각을 기록했어요" : "이미 기록된 방송이 있어요");
      if (newSession) setReadCount(0);
    } catch (e) {
      toast(errMsg(e));
    }
    setConfirmNew(false);
  };

  const saveTime = async () => {
    if (!current || !value) return;
    try {
      const r = await call<{ broadcast: Broadcast; recalculated: number }>("broadcast_update", { id: current.id, started_at: new Date(value).toISOString() });
      setCurrent(r.broadcast);
      setEditing(false);
      toast(r.recalculated ? `시작 시각을 고치고 사연 ${r.recalculated}개의 다시보기 시간을 다시 계산했어요` : "방송 시작 시각을 고쳤어요");
    } catch (e) {
      toast(errMsg(e));
    }
  };

  if (current === undefined) return null;

  if (!current)
    return (
      <section className="adm-session is-off" aria-label="방송 시작">
        <div>
          <p className="adm-session-title">아직 방송 시작을 기록하지 않았어요</p>
          <p className="adm-dim adm-small">방송을 켤 때 눌러두면, 사연마다 "읽기 시작"을 누를 때 다시보기 시간(예: 1시간 12분)이 자동으로 계산돼요.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => start(false)}>
          ● 방송 시작
        </button>
      </section>
    );

  const elapsed = Math.max(0, Math.round((now - new Date(current.started_at).getTime()) / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const sec = elapsed % 60;

  return (
    <section className="adm-session is-on" aria-label="지금 방송">
      <div className="adm-session-main">
        <span className="adm-onair is-on">방송 중</span>
        <p className="adm-session-title">
          {timeLabel(current.started_at)} 시작 ·{" "}
          <span className="adm-mono">
            {h}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
          </span>{" "}
          경과
        </p>
        <span className="adm-dim adm-small">이번 방송에서 읽은 사연 {readCount}개</span>
      </div>
      {editing ? (
        <div className="adm-session-edit">
          <label htmlFor="bc-start" className="adm-label">
            방송 시작 시각
          </label>
          <input id="bc-start" className="input" type="datetime-local" step={1} value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="btn btn-sm btn-primary" onClick={saveTime}>
            저장
          </button>
          <button className="btn btn-sm" onClick={() => setEditing(false)}>
            취소
          </button>
        </div>
      ) : (
        <div className="row">
          <button
            className="btn btn-sm"
            onClick={() => {
              setValue(toLocalInput(current.started_at));
              setEditing(true);
            }}
          >
            시작 시각 고치기
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmNew(true)}>
            새 방송으로 시작
          </button>
          {isOwner && (
            <Link className="btn btn-sm" to="/admin/wrapup">
              오늘 방송 정리 →
            </Link>
          )}
        </div>
      )}
      {confirmNew && (
        <Dialog title="새 방송으로 시작할까요?" onClose={() => setConfirmNew(false)}>
          <p>지금 방송 기록은 그대로 두고, 지금 시각으로 새 방송을 시작해요. 하루에 방송을 두 번 켰을 때만 쓰세요.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirmNew(false)}>
              취소
            </button>
            <button className="btn btn-primary" onClick={() => start(true)}>
              새 방송 시작
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
