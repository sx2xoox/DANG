import { useState, type FormEvent } from "react";
import { CLAIM_NAME_MAX } from "@shared/results.ts";
import { ApiError, callFn } from "../lib/supabase";
import { copyText } from "../lib/image";
import { formatDate } from "../lib/format";
import type { DexInfo } from "../lib/mystory";
import { useToast } from "./ui";

/** 황금 동물: 인증 코드 + 구독권 받을 치지직 닉네임 */
export function GoldenBox({ storyId, dex, onChange }: { storyId: string; dex: DexInfo; onChange: (d: DexInfo) => void }) {
  const toast = useToast();
  const [name, setName] = useState(dex.claim_name ?? "");
  const [editing, setEditing] = useState(!dex.claimed_at);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await callFn<{ dex: DexInfo }>("public", { action: "golden_claim", story_id: storyId, claim_name: name.trim() });
      onChange(res.dex);
      setEditing(false);
      toast("구독권 받을 닉네임을 남겼어요!");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "저장하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="golden-box" aria-labelledby="gold-title">
      <p className="golden-kicker">특별한 행운</p>
      <h2 id="gold-title">황금 고민 동물 발견!</h2>
      <p className="golden-desc">
        <b>인증하면 다웅이 치지직 구독권을 드려요.</b> 아래 인증 코드와 구독권 받을 치지직 닉네임을 남겨주세요. 다웅이 확인한 뒤 지급해요.
      </p>
      <div className="golden-code">
        <span>인증 코드</span>
        <strong>{dex.golden_code}</strong>
        <button
          type="button"
          className="post-btn post-btn-sub"
          onClick={async () => toast((await copyText(dex.golden_code ?? "")) ? "인증 코드를 복사했어요" : "복사하지 못했어요")}
        >
          복사
        </button>
      </div>
      {dex.paid_at ? (
        <p className="golden-state is-paid">구독권 지급 완료 ({formatDate(dex.paid_at)}) 축하해요!</p>
      ) : editing ? (
        <form className="golden-form" onSubmit={submit}>
          <label htmlFor="gold-name">구독권 받을 치지직 닉네임</label>
          <div className="golden-form-row">
            <input id="gold-name" className="input" value={name} maxLength={CLAIM_NAME_MAX} onChange={(e) => setName(e.target.value)} required />
            <button type="submit" className="post-btn post-btn-main" disabled={busy || !name.trim()}>
              {busy ? "보내는 중…" : "인증 신청"}
            </button>
          </div>
        </form>
      ) : (
        <p className="golden-state">
          <b>{dex.claim_name}</b> 닉네임으로 인증 신청했어요. 다웅이 확인하면 구독권을 보내드려요.{" "}
          <button type="button" className="post-link" onClick={() => setEditing(true)}>
            닉네임 고치기
          </button>
        </p>
      )}
    </section>
  );
}
