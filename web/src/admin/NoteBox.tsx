import { useEffect, useState } from "react";
import { HOST_NOTE_MAX } from "@shared/results.ts";
import { errMsg, useAdmin } from "./api";
import { useToast } from "../components/ui";

/**
 * 사연 한마디(코멘트): 읽으면서 짧게 남겨요. 결과를 공개하면 사연자 화면에 "방송에서 남긴 한마디"로 보여요.
 * 한마디가 있는 사연은 목록에서 "완료"로 표시돼요.
 */
export function NoteBox({ id, initial, onSaved, compact = false }: { id: string; initial: string | null; onSaved?: (note: string | null) => void; compact?: boolean }) {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const [text, setText] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText(initial ?? "");
    setSaved(initial ?? "");
  }, [id, initial]);

  if (!isOwner) return null;
  const dirty = text.trim() !== saved.trim();
  const save = async () => {
    setBusy(true);
    try {
      const res = await call<{ host_note: string | null }>("note_save", { id, host_note: text.trim() });
      setSaved(res.host_note ?? "");
      setText(res.host_note ?? "");
      onSaved?.(res.host_note);
      toast(res.host_note ? "한마디를 남겼어요 · 완료로 표시돼요" : "한마디를 지웠어요");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`adm-note ${compact ? "is-compact" : ""} ${saved ? "is-done" : ""}`} aria-label="한마디">
      <div className="adm-note-head">
        <label htmlFor={`note-${id}`} className="adm-label">
          한마디 {saved && <span className="adm-tag ok">완료</span>}
        </label>
        <span className="adm-small adm-dim">결과 공개 때 사연자에게 보여요 · {[...text].length}/{HOST_NOTE_MAX}</span>
      </div>
      <div className="adm-note-row">
        <textarea
          id={`note-${id}`}
          className="input"
          rows={compact ? 2 : 3}
          maxLength={HOST_NOTE_MAX}
          placeholder="예) 먼저 연락하는 사람이 지는 게 아니에요. 응원할게요!"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && dirty && !busy) save();
          }}
        />
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !dirty}>
          {busy ? "저장 중…" : "저장"}
        </button>
      </div>
    </section>
  );
}
