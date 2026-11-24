import { useState } from "react";
import { Link } from "react-router-dom";
import { PRIVATE_MESSAGE_MAX, reactionEmoji, reactionLabel } from "@shared/results.ts";
import { errMsg, REVIEW_STATUS_LABEL, useAdmin, type StoryBundle } from "./api";
import { FlagChips } from "./parts";
import { useToast } from "../components/ui";
import { formatDate } from "../lib/format";

/** 방송 결과 (읽은 사연): 방송 회차, 한마디, 공개 여부 */
export function ResultPanel({ data, onChanged }: { data: StoryBundle; onChanged: () => Promise<void> }) {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const s = data.story;
  if (s.status !== "read") return null;
  const published = !!s.result_published_at;

  const publish = async () => {
    try {
      const r = await call<{ published: number; golden: number }>("results_publish", { ids: [s.id] });
      toast(r.golden ? "결과를 공개했어요. 황금 동물이 나왔어요!" : "결과를 공개했어요");
      await onChanged();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  return (
    <section className="adm-panel" aria-label="방송 결과">
      <div className="row">
        <h3 className="adm-h3">방송 결과</h3>
        <span className={`adm-tag ${published ? "ok" : "warn"}`}>{published ? `공개됨 · ${formatDate(s.result_published_at, true)}` : "아직 비공개"}</span>
      </div>
      <dl className="adm-facts">
        <div>
          <dt>방송</dt>
          <dd>{data.broadcast ? `${formatDate(data.broadcast.started_at, true)} 시작` : "방송 회차 없음"}</dd>
        </div>
        <div>
          <dt>읽기 시작</dt>
          <dd>{s.read_started_at ? formatDate(s.read_started_at, true) : "기록 없음"}</dd>
        </div>
        <div className="adm-facts-wide">
          <dt>다웅의 한마디</dt>
          <dd>{s.host_note || <span className="adm-dim">없음</span>}</dd>
        </div>
      </dl>
      {isOwner && (
        <div className="row">
          {s.broadcast_id && (
            <Link className="btn btn-sm" to={`/admin/wrapup?b=${s.broadcast_id}`}>
              오늘 방송 정리에서 고치기
            </Link>
          )}
          {!published && (
            <button className="btn btn-sm btn-primary" onClick={publish}>
              이 사연만 결과 공개
            </button>
          )}
        </div>
      )}
      {data.dex && (
        <p className="adm-small">
          도감에 모음 ({formatDate(data.dex.collected_at)})
          {data.dex.golden && (
            <>
              {" "}
              · <b className="adm-gold">황금 동물</b> {data.dex.golden_code}
              {data.dex.paid_at ? " · 구독권 지급 완료" : data.dex.claimed_at ? ` · 신청: ${data.dex.claim_name}` : " · 아직 신청 안 함"}
            </>
          )}
        </p>
      )}
    </section>
  );
}

/** 이 사연의 상담 후기 */
export function ReviewPanel({ data, onChanged }: { data: StoryBundle; onChanged: () => Promise<void> }) {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const r = data.review;
  if (!r) return null;
  const set = async (status: string) => {
    try {
      await call("review_set_status", { story_id: r.story_id, status });
      toast(status === "approved" ? "후기를 승인했어요" : status === "hidden" ? "후기를 숨겼어요" : "새 후기로 되돌렸어요");
      await onChanged();
    } catch (e) {
      toast(errMsg(e));
    }
  };
  return (
    <section className="adm-panel" aria-label="상담 후기">
      <div className="row">
        <h3 className="adm-h3">상담 후기</h3>
        <span className={`adm-tag ${r.status === "approved" ? "ok" : r.status === "hidden" ? "" : "blue"}`}>{REVIEW_STATUS_LABEL[r.status]}</span>
        <span className="adm-tag">{r.share ? "후기 벽 공개 동의" : "공개 안 함"}</span>
        <FlagChips flags={r.flags} />
      </div>
      <p className="adm-review-line">
        <b>
          {reactionEmoji(r.reaction)} {reactionLabel(r.reaction)}
        </b>
        {r.comment && <q>{r.comment}</q>}
      </p>
      <p className="adm-dim adm-small">{formatDate(r.updated_at, true)}</p>
      {isOwner && (
        <div className="row">
          {r.status !== "approved" && (
            <button className="btn btn-sm btn-primary" onClick={() => set("approved")}>
              승인
            </button>
          )}
          {r.status !== "hidden" && (
            <button className="btn btn-sm" onClick={() => set("hidden")}>
              숨기기
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** "확인 필요" 사연에 한해 결과 카드로 보내는 짧은 개인 메시지 (방장만) */
export function PrivateMessagePanel({ data, onChanged }: { data: StoryBundle; onChanged: () => Promise<void> }) {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const s = data.story;
  const [text, setText] = useState(s.private_message ?? "");
  const [busy, setBusy] = useState(false);
  if (!isOwner || !s.flags.includes("care")) return null;
  const save = async () => {
    setBusy(true);
    try {
      await call("private_message", { id: s.id, text });
      toast(text.trim() ? "개인 메시지를 보냈어요. 사연자 결과 카드에 보여요" : "개인 메시지를 지웠어요");
      await onChanged();
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="adm-panel adm-form" aria-label="개인 메시지">
      <h3 className="adm-h3">개인 메시지 (확인 필요 사연)</h3>
      <p className="adm-dim adm-small">
        위험 신호가 있는 사연이라 자동 안내는 하지 않아요. 원하면 짧은 메시지를 보내세요. 사연자의 결과 카드 맨 위에 바로 보여요. (방송 여부와 관계없이)
      </p>
      <div className="field">
        <label htmlFor="pm-text">메시지 ({PRIVATE_MESSAGE_MAX}자 이내)</label>
        <textarea id="pm-text" className="textarea" maxLength={PRIVATE_MESSAGE_MAX} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 90 }} />
      </div>
      <div className="row">
        <button className="btn btn-primary btn-sm" disabled={busy || text === (s.private_message ?? "")} onClick={save}>
          {s.private_message ? "메시지 고치기" : "메시지 보내기"}
        </button>
      </div>
    </section>
  );
}
