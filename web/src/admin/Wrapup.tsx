import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { clockToOffset, formatOffset, HOST_NOTE_MAX, offsetToClock, validVodUrl, vodLink } from "@shared/results.ts";
import { errMsg, useAdmin, type Broadcast } from "./api";
import { FlagChips } from "./parts";
import { toLocalInput, timeLabel } from "./BroadcastSession";
import { Dialog, Spinner, StampSticker, useToast } from "../components/ui";
import { formatDate } from "../lib/format";

type Item = {
  id: string;
  receipt_no: number;
  summary: string;
  broadcast_name: string;
  stamp: string;
  flags: string[];
  logged_in: boolean;
  read_started_at: string | null;
  vod_offset_sec: number | null;
  vod_url: string | null;
  host_note: string | null;
  result_published_at: string | null;
  animal: { name: string; emoji: string } | null;
};

type Data = { broadcast: Broadcast | null; recent: Broadcast[]; items: Item[]; vod_time_param: string };
type Edit = { clock: string; note: string };

/**
 * 오늘 방송 정리
 *  1) 오늘 읽은 사연을 읽은 순서대로
 *  2) 다시보기 주소를 한 번 붙여넣으면 모든 사연에 시간이 붙은 링크
 *  3) 사연마다 시간·한마디 고치기
 *  4) "결과 공개" 한 번으로 사연자 결과 카드를 한꺼번에 공개
 */
export default function Wrapup() {
  const { call } = useAdmin();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [vod, setVod] = useState("");
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [editStart, setEditStart] = useState<string | null>(null);
  const [done, setDone] = useState<{ published: number; collected: number; golden: number } | null>(null);

  const apply = (d: Data) => {
    setData(d);
    setVod(d.broadcast?.vod_url ?? "");
    setEdits(Object.fromEntries(d.items.map((i) => [i.id, { clock: offsetToClock(i.vod_offset_sec), note: i.host_note ?? "" }])));
    setDirty(false);
  };

  const load = useCallback(
    async (id?: string) => {
      try {
        apply(await call<Data>("wrapup_get", { broadcast_id: id ?? params.get("b") ?? "" }));
        setError("");
      } catch (e) {
        setError(errMsg(e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [call],
  );

  useEffect(() => {
    load();
  }, [load]);

  const vodOk = !vod.trim() || validVodUrl(vod.trim());
  const rows = useMemo(
    () =>
      (data?.items ?? []).map((it) => {
        const e = edits[it.id] ?? { clock: "", note: "" };
        const off = clockToOffset(e.clock);
        const bad = e.clock.trim() !== "" && off === null;
        return { it, e, off, bad, link: vodOk && vod.trim() ? vodLink(vod.trim(), off, data?.vod_time_param) : null };
      }),
    [data, edits, vod, vodOk],
  );

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!data) return <Spinner />;

  const bc = data.broadcast;
  const unpublished = data.items.filter((i) => !i.result_published_at).length;
  const anyBad = rows.some((r) => r.bad) || rows.some((r) => [...r.e.note].length > HOST_NOTE_MAX);

  const setEdit = (id: string, patch: Partial<Edit>) => {
    setEdits((m) => ({ ...m, [id]: { ...(m[id] ?? { clock: "", note: "" }), ...patch } }));
    setDirty(true);
  };

  const save = async (quiet = false) => {
    if (!bc) return false;
    if (!vodOk) {
      toast("다시보기 주소는 https:// 로 시작하는 주소로 넣어주세요");
      return false;
    }
    if (anyBad) {
      toast("시간이나 한마디를 확인해 주세요");
      return false;
    }
    setBusy(true);
    try {
      apply(
        await call<Data>("wrapup_save", {
          broadcast_id: bc.id,
          vod_url: vod.trim(),
          items: rows.map((r) => ({ id: r.it.id, offset_sec: r.off, host_note: r.e.note.trim() })),
        }),
      );
      if (!quiet) toast("저장했어요");
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setConfirm(false);
    if (!bc) return;
    if (!(await save(true))) return;
    setBusy(true);
    try {
      const r = await call<{ published: number; collected: number; golden: number }>("results_publish", { broadcast_id: bc.id });
      setDone(r);
      toast(`결과 ${r.published}개를 공개했어요`);
      await load(bc.id);
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveStart = async () => {
    if (!bc || !editStart) return;
    try {
      await call("broadcast_update", { id: bc.id, started_at: new Date(editStart).toISOString() });
      setEditStart(null);
      toast("방송 시작 시각을 고치고 다시보기 시간을 다시 계산했어요");
      await load(bc.id);
    } catch (e) {
      toast(errMsg(e));
    }
  };

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">오늘 방송 정리</h1>
          <p className="adm-dim">
            방송이 끝나고 치지직에 다시보기가 올라오면, 주소를 한 번만 붙여넣으세요. 사연마다 읽기 시작한 시간이 붙은 링크가 들어가요. 확인하고 "결과 공개"를 누르면 끝! (다음 날 해도 돼요)
          </p>
        </div>
        {data.recent.length > 1 && (
          <div className="field">
            <label htmlFor="wu-bc" className="adm-label">
              방송 회차
            </label>
            <select
              id="wu-bc"
              className="select adm-select-sm"
              value={bc?.id ?? ""}
              onChange={(e) => {
                setParams({ b: e.target.value }, { replace: true });
                setDone(null);
                load(e.target.value);
              }}
            >
              {data.recent.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatDate(b.started_at, true)}
                  {b.published_at ? " (공개함)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {!bc ? (
        <div className="adm-panel adm-empty">
          <p className="adm-title-sm">아직 방송 기록이 없어요</p>
          <p className="adm-dim">
            <Link to="/admin/broadcast">방송</Link> 화면에서 "방송 시작"을 누르고, 사연을 읽을 때 "읽기 시작"을 눌러주세요.
          </p>
        </div>
      ) : (
        <>
          <section className="adm-panel adm-wu-head" aria-label="방송 정보">
            <div className="adm-wu-start">
              <span className="adm-label">방송 시작</span>
              {editStart !== null ? (
                <span className="row">
                  <label htmlFor="wu-start" className="sr-only">
                    방송 시작 시각
                  </label>
                  <input id="wu-start" className="input" type="datetime-local" step={1} value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                  <button className="btn btn-sm btn-primary" onClick={saveStart}>
                    저장
                  </button>
                  <button className="btn btn-sm" onClick={() => setEditStart(null)}>
                    취소
                  </button>
                </span>
              ) : (
                <span className="row">
                  <b>{formatDate(bc.started_at, true)}</b>
                  <button className="btn btn-sm" onClick={() => setEditStart(toLocalInput(bc.started_at))}>
                    고치기
                  </button>
                </span>
              )}
              <span className="adm-dim adm-small">시작 시각을 고치면 사연별 시간도 다시 계산돼요.</span>
            </div>
            <div className="field adm-wu-vod">
              <label htmlFor="wu-vod">다시보기 주소 (다시보기가 올라온 뒤 한 번만 붙여넣기)</label>
              <input
                id="wu-vod"
                className="input"
                inputMode="url"
                placeholder="https://chzzk.naver.com/video/..."
                value={vod}
                onChange={(e) => {
                  setVod(e.target.value);
                  setDirty(true);
                }}
              />
              {!vodOk && <span className="adm-error">https:// 로 시작하는 주소를 넣어주세요.</span>}
              <span className="adm-dim adm-small">
                주소 끝에 {data.vod_time_param === "t" ? "t=초" : "currentTime=초"}가 붙어요. (유튜브 주소는 t=초) 형식은 설정에서 바꿀 수 있어요. 결과를 먼저 공개했어도, 나중에 주소를 넣고 저장하면 사연자 화면에 링크가 자동으로 붙어요.
              </span>
            </div>
          </section>

          {done && (
            <p className="adm-done" role="status">
              결과 {done.published}개 공개 완료 · 도감에 모인 고민 동물 {done.collected}마리
              {done.golden > 0 && (
                <>
                  {" "}
                  · <b className="adm-gold">황금 동물 {done.golden}마리!</b> <Link to="/admin/golden">황금 동물 보기</Link>
                </>
              )}
            </p>
          )}

          <section className="adm-panel" aria-label="오늘 읽은 사연">
            <h2 className="adm-h3">
              읽은 사연 <span className="adm-mono adm-dim">{data.items.length}</span>
              {unpublished > 0 && <span className="adm-tag warn">미공개 {unpublished}</span>}
            </h2>
            {data.items.length === 0 && <p className="adm-dim">이 방송에서 읽은 사연이 없어요.</p>}
            <ol className="adm-wu-list">
              {rows.map(({ it, e, off, bad, link }, i) => (
                <li key={it.id} className={it.result_published_at ? "is-published" : ""}>
                  <div className="adm-wu-who">
                    <span className="adm-wu-n">{i + 1}</span>
                    <StampSticker stamp={it.stamp} size="sm" />
                    <div className="adm-wu-sum">
                      <Link to={`/admin/stories/${it.id}`} className="adm-no">
                        #{it.receipt_no}
                      </Link>{" "}
                      <b>{it.summary}</b>
                      <span className="adm-dim adm-small">
                        {it.broadcast_name}
                        {it.animal ? ` · ${it.animal.emoji} ${it.animal.name}` : ""}
                        {it.read_started_at ? ` · ${timeLabel(it.read_started_at)} 읽기 시작` : " · 읽기 시작 기록 없음"}
                        {it.logged_in ? " · 로그인(도감)" : ""}
                      </span>
                      <span>
                        <FlagChips flags={it.flags.filter((f) => f === "care")} />
                        {it.result_published_at && <span className="adm-tag ok">공개됨</span>}
                      </span>
                    </div>
                  </div>
                  <div className="adm-wu-fields">
                    <div className="field">
                      <label htmlFor={`wu-t-${it.id}`}>다시보기 시간</label>
                      <input
                        id={`wu-t-${it.id}`}
                        className={`input adm-mono ${bad ? "is-bad" : ""}`}
                        placeholder="1:12:00"
                        value={e.clock}
                        onChange={(ev) => setEdit(it.id, { clock: ev.target.value })}
                        aria-invalid={bad}
                      />
                      <span className={bad ? "adm-error" : "adm-dim adm-small"}>{bad ? "예) 1:12:00 또는 72:00" : off !== null ? formatOffset(off) : "비워두면 처음부터"}</span>
                    </div>
                    <div className="field adm-wu-note">
                      <label htmlFor={`wu-n-${it.id}`}>다웅의 한마디 (선택, {HOST_NOTE_MAX}자)</label>
                      <input
                        id={`wu-n-${it.id}`}
                        className="input"
                        maxLength={HOST_NOTE_MAX}
                        placeholder="예) 용기 낸 거 진짜 멋있어요!"
                        value={e.note}
                        onChange={(ev) => setEdit(it.id, { note: ev.target.value })}
                      />
                    </div>
                  </div>
                  {link && (
                    <a className="adm-wu-link adm-small" href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <div className="adm-wu-bar">
            <button className="btn" disabled={busy || !dirty} onClick={() => save()}>
              {busy ? "저장 중…" : dirty ? (unpublished === 0 && data.items.length ? "저장 (공개된 결과에도 반영)" : "저장") : "저장됨"}
            </button>
            <button className="btn btn-primary btn-lg" disabled={busy || unpublished === 0} onClick={() => setConfirm(true)}>
              결과 공개 {unpublished > 0 ? `(${unpublished}개)` : ""}
            </button>
          </div>
        </>
      )}

      {confirm && bc && (
        <Dialog title="결과를 공개할까요?" onClose={() => setConfirm(false)}>
          <p>
            이 방송에서 읽은 사연 {unpublished}개의 결과 카드가 사연자에게 열려요. 다시보기 링크와 한마디가 함께 보이고, 로그인한 사연자의 고민 동물은 도감에 모여요.
            {!vod.trim() && <b> 다시보기 주소가 아직 비어 있어요. 지금 공개해도 되고, 다시보기가 올라온 뒤 주소를 넣고 저장하면 링크가 자동으로 붙어요.</b>}
          </p>
          <div className="row">
            <button className="btn" onClick={() => setConfirm(false)}>
              취소
            </button>
            <button className="btn btn-primary" onClick={publish}>
              저장하고 공개하기
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
