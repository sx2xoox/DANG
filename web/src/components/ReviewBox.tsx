import { useMemo, useState, type FormEvent } from "react";
import { REACTIONS, REVIEW_MAX } from "@shared/results.ts";
import { findContacts } from "@shared/safety.ts";
import { ApiError, callFn } from "../lib/supabase";
import type { Review, StoryAuth } from "../lib/mystory";
import { Dialog, useToast } from "./ui";

/** 결과 카드 맨 아래: "방송에서 들은 답 어땠어요?" (방송에서 읽힌 사연만) */
export function ReviewBox({ auth, review, onChange }: { auth: StoryAuth; review: Review | null; onChange: (r: Review | null) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(!review);
  const [reaction, setReaction] = useState(review?.reaction ?? "");
  const [comment, setComment] = useState(review?.comment ?? "");
  const [share, setShare] = useState(review?.share ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const contacts = useMemo(() => findContacts(comment), [comment]);
  const length = [...comment].length;

  const startEdit = () => {
    setReaction(review?.reaction ?? "");
    setComment(review?.comment ?? "");
    setShare(review?.share ?? false);
    setError("");
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!reaction) return setError("반응을 하나 골라주세요.");
    if (length > REVIEW_MAX) return setError(`한 줄 후기는 ${REVIEW_MAX}자 이내로 써주세요.`);
    setBusy(true);
    setError("");
    try {
      const res = await callFn<{ review: Review; flagged: boolean }>("public", { action: "review_save", ...auth, reaction, comment, share });
      onChange(res.review);
      setEditing(false);
      toast(review ? "후기를 고쳤어요" : "후기를 남겼어요. 고마워요!");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await callFn("public", { action: "review_delete", ...auth });
      onChange(null);
      setReaction("");
      setComment("");
      setShare(false);
      setEditing(true);
      toast("후기를 지웠어요");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "지우지 못했어요");
    }
  };

  const picked = REACTIONS.find((r) => r.id === review?.reaction);
  const statusText = !review
    ? ""
    : review.status === "approved"
      ? review.share
        ? "다웅이 확인했고, 첫 화면 후기 벽에 올라갔어요."
        : "다웅이 확인했어요. (후기 벽에는 올리지 않아요)"
      : review.status === "hidden"
        ? "후기는 잘 저장됐어요. 후기 벽에는 보이지 않아요."
        : review.share
          ? "다웅이 확인하면 첫 화면 후기 벽에 올라가요."
          : "잘 남겼어요. 다웅이 읽어볼 거예요.";

  return (
    <section className="review-box" aria-labelledby="rv-title">
      <h2 id="rv-title">방송에서 들은 답 어땠어요?</h2>

      {!editing && review ? (
        <div className="review-done">
          <p className="review-done-main">
            <span className="review-chip">
              <span aria-hidden="true">{picked?.emoji}</span> {picked?.label}
            </span>
            {review.comment && <q>{review.comment}</q>}
          </p>
          <p className="review-status">{statusText}</p>
          <div className="review-actions">
            <button type="button" className="post-btn post-btn-sub" onClick={startEdit}>
              후기 고치기
            </button>
            <button type="button" className="post-link danger-text" onClick={() => setConfirmDelete(true)}>
              후기 지우기
            </button>
          </div>
        </div>
      ) : (
        <form className="review-form" onSubmit={save} noValidate>
          <div role="radiogroup" aria-label="반응 고르기" className="review-reactions">
            {REACTIONS.map((r) => (
              <label key={r.id} className={`review-reaction ${reaction === r.id ? "is-on" : ""}`}>
                <input type="radio" name="reaction" value={r.id} checked={reaction === r.id} onChange={() => setReaction(r.id)} />
                <span className="review-reaction-emoji" aria-hidden="true">
                  {r.emoji}
                </span>
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          <div className="field">
            <label htmlFor="rv-comment">
              한 줄 후기 <span className="faint">(선택)</span>
            </label>
            <input
              id="rv-comment"
              className="input"
              value={comment}
              maxLength={REVIEW_MAX + 20}
              placeholder="예) 진짜 화해했어요 다웅 최고"
              onChange={(e) => setComment(e.target.value)}
              aria-describedby="rv-count"
            />
            <span id="rv-count" className={`review-count ${length > REVIEW_MAX ? "is-over" : ""}`}>
              {length}/{REVIEW_MAX}
            </span>
          </div>
          {contacts.length > 0 && (
            <p className="notice notice-yellow" role="alert" style={{ margin: 0 }}>
              연락처나 아이디처럼 보이는 내용이 있어요: {contacts.map((c) => c.sample).join(", ")}. 개인정보는 빼고 써주세요.
            </p>
          )}
          <label className="review-share">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            <span>
              다른 사람들에게 보여줘도 돼요
              <small>체크하면 다웅이 확인한 뒤 첫 화면 후기 벽에 고민 동물, 반응, 한 줄 후기만 보여요. 사연 내용과 이름은 절대 보이지 않아요.</small>
            </span>
          </label>
          {error && (
            <p className="notice notice-danger" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <div className="review-actions">
            <button type="submit" className="post-btn post-btn-main" disabled={busy}>
              {busy ? "남기는 중…" : review ? "후기 고치기" : "후기 남기기"}
            </button>
            {review && (
              <button type="button" className="post-link" onClick={() => setEditing(false)}>
                취소
              </button>
            )}
          </div>
        </form>
      )}

      {confirmDelete && (
        <Dialog title="후기를 지울까요?" onClose={() => setConfirmDelete(false)}>
          <p style={{ margin: 0 }}>후기 벽에 올라가 있었다면 거기서도 내려가요.</p>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={remove}>
              지우기
            </button>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
