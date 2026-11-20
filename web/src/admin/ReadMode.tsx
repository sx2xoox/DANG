import { useCallback, useEffect, useRef, useState } from "react";
import { GOMIN, optionEmoji, optionLabel, temperatureLabel } from "@shared/boxes.ts";
import { errMsg, useAdmin, type StoryBundle } from "./api";
import { StampSticker, Spinner, temperatureColor, useToast } from "../components/ui";
import { ageGender } from "../lib/format";
import { CareNote } from "./parts";
import { store } from "../lib/supabase";
import { readStartMessage } from "./BroadcastSession";
import { reactionEmoji, reactionLabel } from "@shared/results.ts";

/** 방송에서 사연을 읽을 때 쓰는 큰 글씨 화면 */
export default function ReadMode({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const { call } = useAdmin();
  const toast = useToast();
  const [data, setData] = useState<StoryBundle | null>(null);
  const [font, setFont] = useState<number>(() => store.get("dg.admin.readFont", 30));
  const [revealed, setRevealed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await call<StoryBundle>("get", { id }));
    } catch (e) {
      toast(errMsg(e));
    }
  }, [call, id, toast]);

  useEffect(() => {
    load();
    call<{ story_id: string | null; revealed: boolean }>("broadcast_state")
      .then((b) => setRevealed(b.story_id === id && b.revealed))
      .catch(() => {});
  }, [load, call, id]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  const changeFont = (d: number) => {
    const next = Math.min(56, Math.max(18, font + d));
    setFont(next);
    store.set("dg.admin.readFont", next);
  };

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast(msg);
      await load();
      onChanged?.();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const s = data?.story;
  return (
    <div className="adm-read" role="dialog" aria-modal="true" aria-label="읽기 모드">
      <div className="adm-read-bar">
        <span className="adm-title-sm">읽기 모드</span>
        <span className="spacer" />
        <div className="row" role="group" aria-label="글자 크기">
          <button className="btn btn-sm" onClick={() => changeFont(-2)} aria-label="글자 작게">
            가-
          </button>
          <button className="btn btn-sm" onClick={() => changeFont(2)} aria-label="글자 크게">
            가+
          </button>
        </div>
        <button className="btn btn-sm" ref={closeRef} onClick={onClose}>
          닫기 (Esc)
        </button>
      </div>
      {!s ? (
        <Spinner />
      ) : (
        <div className="adm-read-body">
          <div className="adm-read-cues">
            <div className="adm-cue">
              <span>읽어줄 목소리</span>
              <strong>
                <span aria-hidden="true">{optionEmoji(GOMIN.voices, s.voice)}</span> {optionLabel(GOMIN.voices, s.voice)}
              </strong>
              <small>{GOMIN.voices.find((v) => v.id === s.voice)?.desc}</small>
            </div>
            <div className="adm-cue">
              <span>듣고 싶은 말</span>
              <strong>
                <span aria-hidden="true">{optionEmoji(GOMIN.wishes, s.wish)}</span> {optionLabel(GOMIN.wishes, s.wish)}
              </strong>
            </div>
          </div>
          {s.flags.includes("care") && <CareNote />}
          <div className="adm-read-head">
            <StampSticker stamp={s.stamp} size="lg" />
            <div>
              <p className="adm-read-who">
                #{s.receipt_no} · {s.broadcast_name}
                {ageGender(s.age, s.gender) ? ` · ${ageGender(s.age, s.gender)}` : ""} · {optionLabel(GOMIN.categories, s.category)}
              </p>
              <h2 className="adm-read-summary">{s.summary}</h2>
              <p className="adm-read-temp" style={{ ["--t" as string]: temperatureColor(s.temperature) }}>
                고민 온도 <b>{s.temperature}°</b> · {temperatureLabel(s.temperature)}
              </p>
            </div>
          </div>
          <div className="adm-read-text" style={{ fontSize: font }}>
            {s.body}
          </div>
          {data!.follow_ups.length > 0 && (
            <div className="adm-read-follow">
              <h3>후속 보고</h3>
              {data!.follow_ups.map((f) => (
                <p key={f.id} style={{ fontSize: Math.round(font * 0.8) }}>
                  {f.body}
                </p>
              ))}
            </div>
          )}
          {data!.review && (
            <div className="adm-read-follow">
              <h3>상담 후기</h3>
              <p style={{ fontSize: Math.round(font * 0.8) }}>
                {reactionEmoji(data!.review.reaction)} {reactionLabel(data!.review.reaction)}
                {data!.review.comment ? ` · “${data!.review.comment}”` : ""}
              </p>
            </div>
          )}
        </div>
      )}
      {s && (
        <div className="adm-read-actions">
          <button
            className="btn"
            disabled={s.status === "pending" || s.status === "rejected"}
            onClick={() => act(() => call("broadcast", { op: "show", id: s.id }), "방송 화면에 띄웠어요")}
          >
            방송 화면에 띄우기
          </button>
          <button
            className="btn btn-blue"
            disabled={s.status === "pending" || s.status === "rejected"}
            onClick={() =>
              act(async () => {
                if (!revealed) {
                  // 지금 OBS에 이 사연이 떠 있지 않으면 먼저 띄웁니다.
                  const st = await call<{ story_id: string | null; hidden: boolean }>("broadcast_state");
                  if (st.story_id !== s.id || st.hidden) await call("broadcast", { op: "show", id: s.id });
                }
                await call("broadcast", { op: revealed ? "unreveal" : "reveal" });
                setRevealed(!revealed);
              }, revealed ? "공개를 취소했어요" : "OBS에서 고민 동물을 공개했어요")
            }
          >
            {revealed ? "동물 공개 취소" : "고민 동물 공개"}
          </button>
          <button
            className="btn btn-primary"
            disabled={s.status === "read" || s.status === "pending" || s.status === "rejected"}
            title="지금 시각을 기록하고 읽음으로 바꿔요. 다시보기 시간이 자동으로 계산돼요."
            onClick={async () => {
              try {
                const res = await call<{ offset_sec: number; auto_started: boolean; receipt_no: number }>("read_start", { id: s.id });
                toast(readStartMessage(res));
                await load();
                onChanged?.();
              } catch (e) {
                toast(errMsg(e));
              }
            }}
          >
            {s.status === "read" ? "읽기 시작 기록됨" : "▶ 읽기 시작"}
          </button>
        </div>
      )}
    </div>
  );
}
