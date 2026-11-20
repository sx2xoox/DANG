import { useMemo, useState, type FormEvent } from "react";
import { findContacts, needsCare } from "@shared/safety.ts";
import { ApiError, callFn } from "../lib/supabase";
import { formatDate } from "../lib/format";
import type { FollowUp, StoryAuth } from "../lib/mystory";
import { HelpLines, useToast } from "./ui";

/** 후속 보고: 그 뒤로 어떻게 됐는지 (로그인 / 접수번호+비밀 코드 모두) */
export function FollowUpBox({ auth, items, onChange }: { auth: StoryAuth; items: FollowUp[]; onChange: (items: FollowUp[]) => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [care, setCare] = useState(false);
  const contacts = useMemo(() => findContacts(text), [text]);
  const typingCare = useMemo(() => needsCare(text), [text]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSaving(true);
    try {
      const res = await callFn<{ follow_up: FollowUp; care: boolean }>("public", { action: "follow_up_add", ...auth, body });
      onChange([...items, res.follow_up]);
      setText("");
      setCare(res.care);
      toast("후속 보고를 남겼어요!");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "저장하지 못했어요");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="followup" aria-labelledby="fu-title">
      <h2 id="fu-title">후속 보고</h2>
      <p>그 뒤로 어떻게 됐는지 이어서 들려주세요. 여러 번 쓸 수 있고, 방송의 "지난 사연자분들 근황" 코너에서 소개될 수도 있어요.</p>
      {care && <HelpLines />}
      {items.length > 0 && (
        <ol className="follow-list">
          {items.map((f) => (
            <li key={f.id}>
              <span className="faint">{formatDate(f.created_at, true)}</span>
              <p>{f.body}</p>
            </li>
          ))}
        </ol>
      )}
      <form className="stack" onSubmit={add}>
        <label htmlFor="fu" className="sr-only">
          후속 보고 쓰기
        </label>
        <textarea
          id="fu"
          className="textarea"
          maxLength={3000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예) 용기 내서 먼저 연락했더니 화해했어요!"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add(e as unknown as FormEvent);
          }}
        />
        {contacts.length > 0 && (
          <p className="notice notice-yellow" role="alert" style={{ margin: 0 }}>
            연락처나 아이디처럼 보이는 내용이 있어요: {contacts.map((c) => c.sample).join(", ")}. 개인정보는 빼고 써주세요.
          </p>
        )}
        {typingCare && !care && <HelpLines compact />}
        <button type="submit" className="post-btn post-btn-main" disabled={saving || !text.trim()} style={{ alignSelf: "flex-end" }}>
          {saving ? "남기는 중…" : "후속 보고 남기기"}
        </button>
      </form>
    </section>
  );
}
