import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GOMIN, optionEmoji, optionLabel } from "@shared/boxes.ts";
import { dayLabel, errMsg, useAdmin, useWide, type BroadcastState, type ListItem, type StoryBundle } from "./api";
import { AnimalMini, CareNote, Facts, FlagChips, RiskNote, StatusChip, Who } from "./parts";
import type { RouletteCandidate } from "../components/Roulette";
import { Dialog, StampSticker, Spinner, useToast } from "../components/ui";
import { personLabel } from "../lib/format";
import { copyText } from "../lib/image";
import { store } from "../lib/supabase";
import ReadMode from "./ReadMode";
import { NoteBox } from "./NoteBox";
import { BroadcastSessionBar, readStartMessage } from "./BroadcastSession";

type RouletteData = { id: string; duration_ms: number; result_index: number; candidates: RouletteCandidate[]; day?: string; same_day_count?: number; pool_count?: number };
type PickRes = {
  result: { id: string; receipt_no: number; summary: string; broadcast_name: string };
  roulette: RouletteData | null;
  day: string;
  same_day_count: number;
  queue_count: number;
  from_scheduled: boolean;
};

/** 방송 콘솔: 대기열 → 다음 사연 뽑기 → OBS 로 열어서 읽기 → 읽음 처리 */
export default function Broadcast() {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const wide = useWide(1100);
  const [queue, setQueue] = useState<ListItem[] | null>(null);
  const [bs, setBs] = useState<BroadcastState | null>(null);
  const [story, setStory] = useState<StoryBundle | null>(null);
  const [done, setDone] = useState<ListItem[]>([]);
  const [tab, setTab] = useState<"wait" | "done">("wait");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [font, setFont] = useState<number>(() => store.get("dg.admin.consoleFont", 24));
  const [error, setError] = useState("");
  const [sessionTick, setSessionTick] = useState(0);
  const storyIdRef = useRef<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const [q, d] = await Promise.all([
        call<{ items: ListItem[] }>("queue"),
        call<{ items: ListItem[] }>("list", { filters: { status: "read" }, sort: "newest", page: 0 }),
      ]);
      setQueue(q.items);
      setDone([...d.items].sort((a, b) => (b.read_started_at ?? "").localeCompare(a.read_started_at ?? "")));
    } catch (e) {
      setError(errMsg(e));
    }
  }, [call]);

  const loadState = useCallback(async () => {
    try {
      const st = await call<BroadcastState>("broadcast_state");
      setBs(st);
      if (st.story_id && st.story_id !== storyIdRef.current) {
        storyIdRef.current = st.story_id;
        setStory(await call<StoryBundle>("get", { id: st.story_id }));
      } else if (!st.story_id) {
        storyIdRef.current = null;
        setStory(null);
      }
    } catch {
      /* 다음 주기에 다시 */
    }
  }, [call]);

  const refresh = useCallback(async () => {
    await Promise.all([loadQueue(), loadState()]);
  }, [loadQueue, loadState]);

  useEffect(() => {
    refresh();
    const a = window.setInterval(loadState, 4000);
    const b = window.setInterval(loadQueue, 20000);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, [refresh, loadState, loadQueue]);

  const groups = useMemo(() => {
    const m = new Map<string, ListItem[]>();
    for (const s of queue ?? []) {
      const arr = m.get(s.created_day) ?? [];
      arr.push(s);
      m.set(s.created_day, arr);
    }
    return [...m.entries()];
  }, [queue]);

  const approvedAll = (queue ?? []).filter((s) => s.status === "approved");
  const scheduledWaiting = approvedAll.filter((s) => s.scheduled);
  const waiting = scheduledWaiting.length ? scheduledWaiting : approvedAll;
  const nextDay = waiting[0]?.created_day;
  const nextDayCount = waiting.filter((s) => s.created_day === nextDay).length;

  // 다음 사연 뽑기: 먼저 관리자 화면에서만 내용을 보여줘요. 방송 화면(OBS)에는 아직 안 나가요.
  const [cand, setCand] = useState<StoryBundle | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [candDel, setCandDel] = useState(false);
  const pickNext = async (again = false) => {
    setBusy(true);
    try {
      const exclude = again && cand ? [...skipped, cand.story.id] : [];
      const res = await call<PickRes>("pick_next", { preview: true, exclude });
      const b = await call<StoryBundle>("get", { id: res.result.id });
      setSkipped(exclude);
      setCand(b);
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  // 대기 목록에서 "띄우기": 오른쪽 미리 보기에만 띄워요. 방송 화면에는 "방송에 띄우기"를 눌러야 나가요.
  const loadCand = async (id: string) => {
    setBusy(true);
    try {
      const b = peek[id] ?? (await call<StoryBundle>("get", { id }));
      setSkipped([]);
      setCand(b);
      setCandDel(false);
      requestAnimationFrame(() => document.querySelector(".adm-cand")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const closeCand = () => {
    setCand(null);
    setSkipped([]);
    setCandDel(false);
  };
  // 확인한 사연을 방송 화면에 띄워요. 방금 뽑은 것처럼 쪽지 뽑기 연출이 나온 뒤 이 사연이 나와요.
  const showDrawn = async (id: string) => {
    setBusy(true);
    try {
      const res = await call<PickRes>("pick_next", { id });
      toast(`#${res.result.receipt_no} 사연을 띄웠어요 · 방송 화면에서 쪽지 뽑기가 나와요`);
      closeCand();
      setOpenId(null);
      storyIdRef.current = null;
      await refresh();
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const dropCand = async (how: "reject" | "delete") => {
    if (!cand) return;
    const st = cand.story;
    try {
      if (how === "reject") await call("set_status", { ids: [st.id], status: "rejected" });
      else await call("delete", { id: st.id });
      closeCand();
      toast(how === "reject" ? `#${st.receipt_no} 사연을 반려했어요` : `#${st.receipt_no} 사연을 삭제했어요`);
      await refresh();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const op = async (body: Record<string, unknown>, msg?: string) => {
    try {
      const st = await call<BroadcastState>("broadcast", body);
      setBs(st);
      if (body.op === "show") {
        storyIdRef.current = null;
        await refresh();
      }
      if (msg) toast(msg);
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const readStart = async () => {
    if (!story) return;
    try {
      const res = await call<{ offset_sec: number; auto_started: boolean; receipt_no: number }>("read_start", { id: story.story.id });
      toast(readStartMessage(res));
      storyIdRef.current = null;
      setSessionTick((t) => t + 1);
      await refresh();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  // 다 읽었어요: (아직이면 읽음 기록) → 방송 화면 카드 내리기 → 사연 처리 완료 탭으로
  const finish = async () => {
    if (!story) return;
    const st = story.story;
    try {
      if (st.status !== "read") {
        await call("read_start", { id: st.id });
        setSessionTick((t) => t + 1);
      }
      setBs(await call<BroadcastState>("broadcast", { op: "clear" }));
      storyIdRef.current = null;
      setStory(null);
      toast(`#${st.receipt_no} 사연을 처리 완료로 옮겼어요`);
      await refresh();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  // 방송 중에 이상한 사연을 발견했을 때: 반려(사연자에게 "이번엔 소개 안 됨") 또는 삭제
  const [confirmDel, setConfirmDel] = useState(false);
  const dropCurrent = async (how: "reject" | "delete") => {
    if (!story) return;
    const st = story.story;
    try {
      if (how === "reject") await call("set_status", { ids: [st.id], status: "rejected" });
      else await call("delete", { id: st.id });
      setBs(await call<BroadcastState>("broadcast", { op: "clear" }));
      storyIdRef.current = null;
      setStory(null);
      setConfirmDel(false);
      toast(how === "reject" ? `#${st.receipt_no} 사연을 반려했어요` : `#${st.receipt_no} 사연을 삭제했어요`);
      await refresh();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  // 방송 대기 목록에서 사연 내용 미리 보기 (검토 대기와 같은 정보 + 띄우기·별표·반려·삭제)
  const [openId, setOpenId] = useState<string | null>(null);
  const [peek, setPeek] = useState<Record<string, StoryBundle>>({});
  const [delTarget, setDelTarget] = useState<ListItem | null>(null);
  const togglePeek = async (r: ListItem) => {
    if (openId === r.id) {
      setOpenId(null);
      return;
    }
    setOpenId(r.id);
    if (!peek[r.id]) {
      try {
        const b = await call<StoryBundle>("get", { id: r.id });
        setPeek((m) => ({ ...m, [r.id]: b }));
      } catch (e) {
        toast(errMsg(e));
      }
    }
  };
  const starPeek = async (r: ListItem) => {
    try {
      const res = await call<{ starred: boolean }>("toggle_star", { id: r.id });
      setQueue((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, starred: res.starred } : x)));
    } catch (e) {
      toast(errMsg(e));
    }
  };
  const dropQueued = async (r: ListItem, how: "reject" | "delete") => {
    try {
      if (how === "reject") await call("set_status", { ids: [r.id], status: "rejected" });
      else await call("delete", { id: r.id });
      if (bs?.story_id === r.id) setBs(await call<BroadcastState>("broadcast", { op: "clear" }));
      setOpenId(null);
      setDelTarget(null);
      toast(how === "reject" ? `#${r.receipt_no} 사연을 반려했어요` : `#${r.receipt_no} 사연을 삭제했어요`);
      await refresh();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const changeFont = (d: number) => {
    const next = Math.min(44, Math.max(16, font + d));
    setFont(next);
    store.set("dg.admin.consoleFont", next);
  };

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!queue || !bs) return <Spinner />;

  const s = story?.story;
  const live = !!(s && bs.story_id === s.id);
  const onAir = live && !bs.hidden;

  const pickBar = (
    <section className="adm-pickbar" aria-label="다음 사연 뽑기">
      <button className="btn btn-primary btn-xl" onClick={() => pickNext()} disabled={busy || waiting.length === 0 || !!cand}>
        {busy && !cand ? "뽑는 중…" : "다음 사연 뽑기"}
      </button>
      <p className="adm-pickbar-info">
        {waiting.length === 0 ? (
          <>
            방송 대기 목록이 비었어요. <Link to="/admin">검토 대기</Link>에서 사연을 승인해 주세요.
          </>
        ) : (
          <>
            대기 <b className="adm-mono">{approvedAll.length}</b>개
            {scheduledWaiting.length > 0 && (
              <>
                {" "}
                · <b>방송 예정</b> {scheduledWaiting.length}개를 먼저 뽑아요
              </>
            )}{" "}
            · 다음 차례는 <b>{dayLabel(nextDay!)}</b> 사연
            {nextDayCount > 1 ? (
              <>
                {" "}
                <b className="adm-mono">{nextDayCount}</b>개 중에서 하나를 뽑아요
              </>
            ) : (
              " 1개"
            )}
            {" "}· 뽑으면 먼저 여기서 내용을 보여줘요
          </>
        )}
      </p>
    </section>
  );

  const candRow = cand ? queue.find((q) => q.id === cand.story.id) : undefined;
  const candPanel = cand && (
    <section className="adm-cand" aria-label="뽑은 사연 미리 보기">
      <div className="adm-cand-head">
        <span className="adm-tag warn">아직 방송 화면에 안 나갔어요</span>
        <span className="adm-dim adm-small">내용을 확인하고 "방송에 띄우기"를 누르세요. 그 전까지 시청자에게는 안 보여요.</span>
      </div>
      {cand.story.flags.includes("care") && <CareNote />}
      <RiskNote flags={cand.story.flags} />
      <div className="adm-console-who">
        <StampSticker stamp={cand.story.stamp} size="md" />
        <div>
          <p className="adm-dim">
            <span className="adm-no">#{cand.story.receipt_no}</span> · {candRow ? <Who s={candRow} /> : cand.story.broadcast_name}
          </p>
          <h2 className="adm-summary">{cand.story.summary}</h2>
        </div>
      </div>
      <div className="adm-console-text" style={{ fontSize: Math.min(font, 22) }}>
        {cand.story.body}
      </div>
      {candRow && <Facts s={candRow} />}
      {cand.follow_ups.length > 0 && (
        <div className="adm-console-follow">
          <p className="adm-label">상담 그 후 이야기</p>
          {cand.follow_ups.map((f) => (
            <p key={f.id}>{f.body}</p>
          ))}
        </div>
      )}
      <details className="adm-console-animal">
        <summary>시청자가 받은 고민 동물</summary>
        <AnimalMini a={cand.animal} state={cand.story.animal_state} />
      </details>
      <div className="adm-q-actions">
        <button className="btn btn-primary" onClick={() => showDrawn(cand.story.id)} disabled={busy}>
          방송에 띄우기
        </button>
        <button className="btn" onClick={() => pickNext(true)} disabled={busy}>
          다른 사연 뽑기
        </button>
        <button className="btn btn-ghost" onClick={closeCand} disabled={busy}>
          취소
        </button>
        {isOwner && (
          <>
            <span className="spacer" />
            <button className="btn btn-reject" onClick={() => dropCand("reject")} disabled={busy} title="사연자에게는 '이번엔 소개되지 않아요'로 보여요.">
              반려
            </button>
            <button className="btn btn-reject" onClick={() => setCandDel(true)} disabled={busy}>
              삭제
            </button>
          </>
        )}
      </div>
      {candDel && (
        <Dialog title="이 사연을 삭제할까요?" onClose={() => setCandDel(false)}>
          <p style={{ margin: 0 }}>
            #{cand.story.receipt_no} "{cand.story.summary}" 사연을 완전히 지워요. 되돌릴 수 없어요.
          </p>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn" onClick={() => setCandDel(false)}>
              취소
            </button>
            <button className="btn btn-reject" onClick={() => dropCand("delete")}>
              삭제하기
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );

  const console_ = (
    <section className="adm-console" aria-label="지금 방송 화면">
      <div className="adm-console-bar">
        <span className={`adm-onair ${onAir ? "is-on" : ""}`}>{onAir ? "ON AIR" : live ? "카드 숨김" : "대기 중"}</span>
        {live && bs.revealed && <span className="adm-tag">고민 동물 공개됨</span>}
        {live && <span className="adm-dim adm-mono">넘김 {bs.scroll}</span>}
        <span className="spacer" />
        {s && (
          <div className="adm-fontctl" role="group" aria-label="글자 크기">
            <button className="btn btn-sm" onClick={() => changeFont(-2)} aria-label="글자 작게">
              가−
            </button>
            <button className="btn btn-sm" onClick={() => changeFont(2)} aria-label="글자 크게">
              가+
            </button>
          </div>
        )}
      </div>

      {!s && (
        <div className="adm-empty">
          <p className="adm-title-sm">방송 화면에 띄운 사연이 없어요</p>
          <p className="adm-dim">"다음 사연 뽑기"로 사연을 뽑아 내용을 확인한 뒤 띄우세요. 대기 목록에서 사연을 눌러 골라도 돼요.</p>
        </div>
      )}

      {s && story && (
        <>
          {s.flags.includes("care") && <CareNote />}
          <RiskNote flags={s.flags} />
          <div className="adm-cues">
            <div>
              <span className="adm-label">읽어줄 목소리</span>
              <strong>
                <span aria-hidden="true">{optionEmoji(GOMIN.voices, s.voice)}</span> {optionLabel(GOMIN.voices, s.voice)}
              </strong>
              <small className="adm-dim">{GOMIN.voices.find((v) => v.id === s.voice)?.desc}</small>
            </div>
            <div>
              <span className="adm-label">듣고 싶은 말</span>
              <strong>
                <span aria-hidden="true">{optionEmoji(GOMIN.wishes, s.wish)}</span> {optionLabel(GOMIN.wishes, s.wish)}
              </strong>
            </div>
          </div>
          <div className="adm-console-who">
            <StampSticker stamp={s.stamp} size="md" />
            <div>
              <p className="adm-dim">
                <span className="adm-no">#{s.receipt_no}</span> · {s.broadcast_name}
                {personLabel(s) ? ` · ${personLabel(s)}` : ""} · {optionLabel(GOMIN.categories, s.category)} · 온도{" "}
                <span className="adm-mono">{s.temperature}°</span>
              </p>
              <h2 className="adm-summary">{s.summary}</h2>
            </div>
            <StatusChip status={s.status} />
          </div>
          {s.read_started_at && (
            <p className="adm-readstamp">
              읽기 시작 {new Date(s.read_started_at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })} 기록됨
            </p>
          )}
          <div className="adm-console-text" style={{ fontSize: font }}>
            {s.body}
          </div>
          <NoteBox id={story.story.id} initial={story.story.host_note} compact onSaved={(note) => setDone((ds) => ds.map((x) => (x.id === story.story.id ? { ...x, host_note: note } : x)))} />
          {story.follow_ups.length > 0 && (
            <div className="adm-console-follow">
              <p className="adm-label">상담 그 후 이야기</p>
              {story.follow_ups.map((f) => (
                <p key={f.id}>{f.body}</p>
              ))}
            </div>
          )}
          <details className="adm-console-animal">
            <summary>이 사연의 고민 동물 미리 보기</summary>
            <AnimalMini a={story.animal} state={s.animal_state} />
          </details>
        </>
      )}

      {s && (
        <div className="adm-controls" role="group" aria-label="방송 화면 조작">
          <div className="adm-controls-row">
            {bs.hidden || !live ? (
              <button className="btn btn-primary" onClick={() => op({ op: "show", id: s.id }, "카드를 띄웠어요")}>
                카드 보이기
              </button>
            ) : (
              <button className="btn" onClick={() => op({ op: "hide" }, "카드를 숨겼어요")}>
                카드 숨기기
              </button>
            )}
            <button className="btn btn-blue" disabled={!onAir} onClick={() => op({ op: bs.revealed ? "unreveal" : "reveal" }, bs.revealed ? "공개를 취소했어요" : "고민 동물을 공개했어요")}>
              {bs.revealed ? "동물 공개 취소" : "고민 동물 공개"}
            </button>
            <span className="adm-scrollctl" role="group" aria-label="본문 넘기기">
              <button className="btn" disabled={!onAir || bs.scroll === 0} onClick={() => op({ op: "scroll", delta: -1 })} aria-label="본문 이전으로">
                ▲ 이전
              </button>
              <button className="btn" disabled={!onAir} onClick={() => op({ op: "scroll", delta: 1 })} aria-label="본문 다음으로">
                ▼ 다음
              </button>
              <button className="btn btn-ghost" disabled={!onAir || bs.scroll === 0} onClick={() => op({ op: "scroll", reset: true })}>
                처음으로
              </button>
            </span>
          </div>
          <div className="adm-controls-row">
            <button className="btn" onClick={() => setReading(true)}>
              크게 읽기 모드
            </button>
            <span className="spacer" />
            {s.status !== "read" ? (
              <button className="btn btn-done" onClick={readStart} title="지금 시각을 기록하고 읽음으로 바꿔요.">
                ▶ 읽기 시작
              </button>
            ) : (
              <span className="adm-tag ok">읽음</span>
            )}
            <button className="btn btn-primary" onClick={finish} title="방송 화면 카드를 내리고 이 사연을 '사연 처리 완료'로 옮겨요.">
              ✓ 다 읽었어요
            </button>
          </div>
          {isOwner && (
            <div className="adm-controls-row adm-controls-danger">
              <span className="adm-dim adm-small">이상한 사연이면</span>
              <span className="spacer" />
              <button className="btn btn-reject" onClick={() => dropCurrent("reject")} title="방송 화면에서 내리고 반려해요. 사연자에게는 '이번엔 소개되지 않아요'로 보여요.">
                반려
              </button>
              <button className="btn btn-reject" onClick={() => setConfirmDel(true)} title="방송 화면에서 내리고 사연을 완전히 지워요.">
                삭제
              </button>
            </div>
          )}
          {confirmDel && story && (
            <Dialog title="이 사연을 삭제할까요?" onClose={() => setConfirmDel(false)}>
              <p style={{ margin: 0 }}>
                #{story.story.receipt_no} "{story.story.summary}" 사연을 방송 화면에서 내리고 완전히 지워요. 되돌릴 수 없어요.
              </p>
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                <button className="btn" onClick={() => setConfirmDel(false)}>
                  취소
                </button>
                <button className="btn btn-reject" onClick={() => dropCurrent("delete")}>
                  삭제하기
                </button>
              </div>
            </Dialog>
          )}
        </div>
      )}
    </section>
  );

  const queuePanel = (
    <section className="adm-queue" aria-label="방송 대기 목록">
      <div className="adm-tabs" role="tablist" aria-label="사연 목록">
        <button type="button" role="tab" aria-selected={tab === "wait"} className={`adm-tab ${tab === "wait" ? "is-on" : ""}`} onClick={() => setTab("wait")}>
          방송 대기 <span className="adm-mono">{queue.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "done"} className={`adm-tab ${tab === "done" ? "is-on" : ""}`} onClick={() => setTab("done")}>
          사연 처리 완료 <span className="adm-mono">{done.length}</span>
        </button>
      </div>
      {tab === "done" && (
        <div className="adm-donelist">
          {done.length === 0 ? (
            <p className="adm-dim">아직 처리한 사연이 없어요. 방송에서 다 읽고 "✓ 다 읽었어요"를 누르면 여기로 와요.</p>
          ) : (
            <ul>
              {done.map((r) => (
                <li key={r.id}>
                  <span className="adm-mono adm-dim">
                    {r.read_started_at ? new Date(r.read_started_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  <Link to={`/admin/stories/${r.id}`} className="adm-no">
                    #{r.receipt_no}
                  </Link>
                  <span className="adm-q-sum">
                    <b>{r.summary}</b>
                    <span className="adm-dim">{r.broadcast_name}</span>
                  </span>
                  {r.host_note ? <span className="adm-tag ok">한마디 완료</span> : <span className="adm-tag">한마디 없음</span>}
                  {r.result_published_at ? <span className="adm-tag blue">결과 공개됨</span> : <span className="adm-tag warn">결과 미공개</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {tab === "wait" && (
        <>
      <p className="adm-dim adm-small">오래 기다린 순서예요. 같은 날짜 사연이 여럿이면 그중에서 하나를 뽑아요. "방송 예정" 사연은 먼저 뽑아요. 사연을 누르면 내용을 볼 수 있고, "띄우기"를 누르면 오른쪽에 먼저 떠요.</p>
      {groups.length === 0 && <p className="adm-dim">방송 대기 목록이 비어 있어요.</p>}
      {groups.map(([day, rows], gi) => (
        <div key={day} className="adm-qgroup">
          <p className="adm-qday">
            <b>{dayLabel(day)}</b>
            <span className="adm-mono">{rows.length}개</span>
            {gi === 0 && rows.filter((r) => r.status === "approved").length > 1 && <span className="adm-tag">다음 차례</span>}
          </p>
          <ul>
            {rows.map((r) => {
              const isOpen = openId === r.id;
              const d = peek[r.id];
              return (
                <li key={r.id} className={`${r.id === bs.story_id && !bs.hidden ? "is-live" : ""} ${isOpen ? "is-open" : ""}`}>
                  <button type="button" className="adm-q-toggle" aria-expanded={isOpen} onClick={() => togglePeek(r)}>
                    <span className="adm-no">#{r.receipt_no}</span>
                    <span className="adm-q-sum">
                      <b>{r.summary}</b>
                      <span className="adm-dim">
                        {r.broadcast_name}
                        {r.starred ? " · ★" : ""} · {r.waited_days}일째 기다림
                      </span>
                    </span>
                    <span className="adm-q-open" aria-hidden="true">
                      {isOpen ? "접기 ▲" : "내용 보기 ▼"}
                    </span>
                  </button>
                  <span className="adm-q-side">
                    {r.scheduled && <span className="adm-tag blue">방송 예정</span>}
                    <FlagChips flags={r.flags.filter((f) => !f.startsWith("ai:"))} />
                    {r.status === "on_air" ? (
                      <span className="adm-st st-on_air">방송 중</span>
                    ) : cand?.story.id === r.id ? (
                      <span className="adm-tag warn">미리 보는 중</span>
                    ) : (
                      <button className="btn btn-sm" disabled={busy} onClick={() => loadCand(r.id)}>
                        띄우기
                      </button>
                    )}
                  </span>
                  {isOpen && (
                    <div className="adm-q-peek">
                      {r.flags.includes("care") && <CareNote />}
                      <RiskNote flags={r.flags} />
                      <p className="adm-rv-meta">
                        <Who s={r} />
                      </p>
                      {d ? <div className="adm-body">{d.story.body}</div> : <p className="adm-dim">본문 불러오는 중…</p>}
                      <Facts s={r} />
                      <details className="adm-console-animal">
                        <summary>시청자가 받은 고민 동물</summary>
                        {d ? <AnimalMini a={d.animal} state={r.animal_state} /> : <p className="adm-dim">불러오는 중…</p>}
                      </details>
                      <div className="adm-q-actions">
                        {r.status !== "on_air" && (
                          <button className="btn btn-primary" disabled={busy} onClick={() => loadCand(r.id)}>
                            띄우기
                          </button>
                        )}
                        <button className="btn" onClick={() => starPeek(r)} aria-pressed={r.starred}>
                          {r.starred ? "★ 별표 떼기" : "☆ 별표"}
                        </button>
                        {isOwner && (
                          <>
                            <span className="spacer" />
                            <button className="btn btn-reject" onClick={() => dropQueued(r, "reject")}>
                              반려
                            </button>
                            <button className="btn btn-reject" onClick={() => setDelTarget(r)}>
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
        </>
      )}
      {delTarget && (
        <Dialog title="이 사연을 삭제할까요?" onClose={() => setDelTarget(null)}>
          <p style={{ margin: 0 }}>
            #{delTarget.receipt_no} "{delTarget.summary}" 사연을 완전히 지워요. 되돌릴 수 없어요.
          </p>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn" onClick={() => setDelTarget(null)}>
              취소
            </button>
            <button className="btn btn-reject" onClick={() => dropQueued(delTarget, "delete")}>
              삭제하기
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">방송</h1>
          <p className="adm-dim">방송을 켜면 "방송 시작"부터 누르세요. 사연을 뽑아 내용을 확인하고 OBS에 띄운 뒤, 읽기 시작할 때 "읽기 시작"을 누르세요.</p>
        </div>
      </header>
      <BroadcastSessionBar key={sessionTick} />
      {pickBar}
      <div className={wide ? "adm-bc-grid" : "stack"}>
        {wide ? (
          <>
            {queuePanel}
            <div className="stack">
              {candPanel}
              {console_}
            </div>
          </>
        ) : (
          <>
            {candPanel}
            {console_}
            {queuePanel}
          </>
        )}
      </div>
      {isOwner ? <ObsSetup /> : <p className="adm-dim adm-small">OBS 주소는 방장만 볼 수 있어요.</p>}
      {reading && s && (
        <ReadMode
          id={s.id}
          onClose={() => setReading(false)}
          onChanged={async () => {
            setSessionTick((t) => t + 1);
            storyIdRef.current = null;
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/** OBS 주소 복사 / 새 키 / 미리보기 */
function ObsSetup() {
  const { call } = useAdmin();
  const toast = useToast();
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [show, setShow] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    call<{ obs_key: string | null }>("settings_get")
      .then((s) => setKey(s.obs_key))
      .catch(() => setKey(null));
  }, [call]);

  const rotate = async () => {
    try {
      const res = await call<{ obs_key: string }>("obs_rotate");
      setKey(res.obs_key);
      setShow(true);
      toast("새 OBS 주소를 만들었어요. OBS에도 새 주소를 넣어주세요");
    } catch (e) {
      toast(errMsg(e));
    }
    setConfirm(false);
  };

  const url = key ? `${location.origin}/obs?key=${key}` : "";
  return (
    <details className="adm-panel adm-obs">
      <summary className="adm-h3">OBS 방송 화면 주소</summary>
      {key === undefined ? (
        <p className="adm-dim">불러오는 중…</p>
      ) : key ? (
        <>
          <div className="adm-url">
            <code>{show ? url : `${location.origin}/obs?key=${key.slice(0, 4)}••••••••`}</code>
            <button className="btn btn-sm" onClick={() => setShow((v) => !v)}>
              {show ? "가리기" : "보기"}
            </button>
            <button className="btn btn-sm btn-primary" onClick={async () => toast((await copyText(url)) ? "주소를 복사했어요" : "복사하지 못했어요")}>
              복사
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirm(true)}>
              새 주소 만들기
            </button>
          </div>
          <ol className="adm-howto">
            <li>OBS 소스 목록의 + → "브라우저"를 고르세요.</li>
            <li>URL에 위 주소를 붙여넣고 너비 1920, 높이 1080으로 정하세요. 배경은 투명해요.</li>
            <li>카드가 안 보이면 소스를 오른쪽 클릭 → "새로 고침".</li>
            <li>화면 공유 중에 주소가 보였다면 "새 주소 만들기"를 누르세요. 예전 주소는 바로 막혀요.</li>
          </ol>
          <div className="adm-obs-preview" aria-label="방송 화면 미리보기">
            <iframe title="OBS 방송 화면 미리보기" src={url} loading="lazy" />
          </div>
        </>
      ) : (
        <button className="btn btn-primary" onClick={rotate}>
          OBS 주소 만들기
        </button>
      )}
      {confirm && (
        <Dialog title="새 OBS 주소를 만들까요?" onClose={() => setConfirm(false)}>
          <p>지금 OBS에 넣어둔 주소는 바로 동작하지 않게 돼요. 새 주소를 OBS 브라우저 소스에 다시 넣어주세요.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirm(false)}>
              취소
            </button>
            <button className="btn btn-danger" onClick={rotate}>
              새 주소 만들기
            </button>
          </div>
        </Dialog>
      )}
    </details>
  );
}
