import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GOMIN, optionEmoji, optionLabel } from "@shared/boxes.ts";
import { dayLabel, errMsg, useAdmin, useWide, type BroadcastState, type ListItem, type StoryBundle } from "./api";
import { AnimalMini, CareNote, FlagChips, StatusChip } from "./parts";
import { Roulette, type RouletteCandidate } from "../components/Roulette";
import { Dialog, StampSticker, Spinner, useToast } from "../components/ui";
import { personLabel } from "../lib/format";
import { useSite } from "../lib/site";
import { copyText } from "../lib/image";
import { store } from "../lib/supabase";
import ReadMode from "./ReadMode";
import { BroadcastSessionBar, readStartMessage } from "./BroadcastSession";

type RouletteData = { id: string; duration_ms: number; result_index: number; candidates: RouletteCandidate[]; day?: string };
type PickRes = {
  result: { id: string; receipt_no: number; summary: string; broadcast_name: string };
  roulette: RouletteData | null;
  day: string;
  same_day_count: number;
  queue_count: number;
  from_scheduled: boolean;
};
type Pick = { picked_at: string; id: string; receipt_no: number; summary: string; broadcast_name: string; status: string };

/** 방송 콘솔: 대기열 → 다음 사연 뽑기 → OBS 로 열어서 읽기 → 읽음 처리 */
export default function Broadcast() {
  const { call, isOwner } = useAdmin();
  const { info } = useSite();
  const toast = useToast();
  const wide = useWide(1100);
  const [queue, setQueue] = useState<ListItem[] | null>(null);
  const [bs, setBs] = useState<BroadcastState | null>(null);
  const [story, setStory] = useState<StoryBundle | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [spin, setSpin] = useState<(RouletteData & { startedAt: number; resultNo: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [font, setFont] = useState<number>(() => store.get("dg.admin.consoleFont", 24));
  const [error, setError] = useState("");
  const [sessionTick, setSessionTick] = useState(0);
  const storyIdRef = useRef<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const [q, p] = await Promise.all([call<{ items: ListItem[] }>("queue"), call<{ items: Pick[] }>("today_picks")]);
      setQueue(q.items);
      setPicks(p.items);
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

  const pickNext = async () => {
    setBusy(true);
    try {
      const res = await call<PickRes>("pick_next");
      if (res.roulette) {
        setSpin({ ...res.roulette, startedAt: Date.now(), resultNo: res.result.receipt_no });
      } else {
        toast(`#${res.result.receipt_no} 사연을 띄웠어요`);
        await refresh();
      }
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
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
      <button className="btn btn-primary btn-xl" onClick={pickNext} disabled={busy || !!spin || waiting.length === 0}>
        {busy ? "뽑는 중…" : "다음 사연 뽑기"}
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
                <b className="adm-mono">{nextDayCount}</b>개 중 룰렛으로 하나를 골라요
              </>
            ) : (
              " 1개라 바로 띄워요"
            )}
          </>
        )}
      </p>
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

      {spin && (
        <div className="adm-spin">
          <p className="adm-label">{spin.day ? `${dayLabel(spin.day)} 사연 ${spin.candidates.length}개 중에서` : "룰렛"}</p>
          <Roulette
            candidates={spin.candidates}
            resultIndex={spin.result_index}
            startedAt={spin.startedAt}
            durationMs={spin.duration_ms}
            preset={info.preset}
            onDone={() => {
              window.setTimeout(async () => {
                toast(`#${spin.resultNo} 사연이 뽑혔어요`);
                setSpin(null);
                storyIdRef.current = null;
                await refresh();
              }, 1400);
            }}
          />
        </div>
      )}

      {!spin && !s && (
        <div className="adm-empty">
          <p className="adm-title-sm">방송 화면에 띄운 사연이 없어요</p>
          <p className="adm-dim">"다음 사연 뽑기"를 누르거나 대기열에서 사연을 골라 띄우세요.</p>
        </div>
      )}

      {!spin && s && story && (
        <>
          {s.flags.includes("care") && <CareNote />}
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
          {story.follow_ups.length > 0 && (
            <div className="adm-console-follow">
              <p className="adm-label">후속 보고</p>
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

      {!spin && s && (
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
              <button className="btn btn-done" onClick={readStart} title="지금 시각을 기록하고 읽음으로 바꿔요. 다시보기 시간이 자동으로 계산돼요.">
                ▶ 읽기 시작
              </button>
            ) : (
              <span className="adm-tag ok">읽음</span>
            )}
          </div>
        </div>
      )}
    </section>
  );

  const queuePanel = (
    <section className="adm-queue" aria-label="방송 대기 목록">
      <h2 className="adm-h2">
        방송 대기 목록 <span className="adm-mono adm-dim">{queue.length}</span>
      </h2>
      <p className="adm-dim adm-small">오래 기다린 순서예요. 같은 날짜 사연이 여럿이면 그중에서 룰렛을 돌려요. "방송 예정" 사연은 먼저 뽑아요.</p>
      {groups.length === 0 && <p className="adm-dim">방송 대기 목록이 비어 있어요.</p>}
      {groups.map(([day, rows], gi) => (
        <div key={day} className="adm-qgroup">
          <p className="adm-qday">
            <b>{dayLabel(day)}</b>
            <span className="adm-mono">{rows.length}개</span>
            {gi === 0 && rows.filter((r) => r.status === "approved").length > 1 && <span className="adm-tag">다음 룰렛</span>}
          </p>
          <ul>
            {rows.map((r) => (
              <li key={r.id} className={r.id === bs.story_id && !bs.hidden ? "is-live" : ""}>
                <span className="adm-no">#{r.receipt_no}</span>
                <span className="adm-q-sum">
                  <b>{r.summary}</b>
                  <span className="adm-dim">
                    {r.broadcast_name}
                    {r.starred ? " · ★" : ""} · {r.waited_days}일째 기다림
                  </span>
                </span>
                {r.scheduled && <span className="adm-tag blue">방송 예정</span>}
                <FlagChips flags={r.flags.filter((f) => f === "care")} />
                {r.status === "on_air" ? (
                  <span className="adm-st st-on_air">방송 중</span>
                ) : (
                  <button className="btn btn-sm" onClick={() => op({ op: "show", id: r.id }, `#${r.receipt_no} 사연을 띄웠어요`)}>
                    띄우기
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {picks.length > 0 && (
        <div className="adm-picks">
          <h3 className="adm-h3">오늘 뽑은 사연</h3>
          <ul>
            {picks.map((p, i) => (
              <li key={i}>
                <span className="adm-mono adm-dim">{new Date(p.picked_at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="adm-no">#{p.receipt_no}</span>
                <span className="adm-q-sum">{p.summary}</span>
                <StatusChip status={p.status as ListItem["status"]} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">방송</h1>
          <p className="adm-dim">방송을 켜면 "방송 시작"부터 누르세요. 사연을 뽑아 OBS에 띄우고, 읽기 시작할 때 "읽기 시작"을 누르면 다시보기 시간이 자동으로 기록돼요.</p>
        </div>
      </header>
      <BroadcastSessionBar key={sessionTick} />
      {pickBar}
      <div className={wide ? "adm-bc-grid" : "stack"}>
        {wide ? (
          <>
            {queuePanel}
            {console_}
          </>
        ) : (
          <>
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
