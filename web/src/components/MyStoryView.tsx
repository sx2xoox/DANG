import { useState, type ReactNode } from "react";
import { ApiError, callFn } from "../lib/supabase";
import { useToast } from "./ui";
import { GOMIN, optionLabel } from "@shared/boxes.ts";
import { useSite } from "../lib/site";
import type { StoryAuth, StoryBundle } from "../lib/mystory";
import { ResultView, StatusTrack } from "./ResultCard";
import { AirResultCard, PrivateMessage } from "./AirResult";
import { ReviewBox } from "./ReviewBox";
import { FollowUpBox } from "./FollowUpBox";
import { GoldenBox } from "./GoldenBox";
import { ChannelButtons } from "./Channels";

/**
 * 내 사연 화면 (접수번호+코드 조회 / 내 사연함 상세 공통)
 *  고민 동물 결과 → (다웅 메시지) → 방송 결과 → (황금 동물) → 진행 상황 → 후기 → 후속 보고 → 내 사연
 */
export function MyStoryView({
  data,
  auth,
  onChange,
  canClaimGolden,
  children,
}: {
  data: StoryBundle;
  auth: StoryAuth;
  onChange: (next: StoryBundle) => void;
  /** 로그인한 본인이면 황금 동물 구독권 신청 가능 */
  canClaimGolden: boolean;
  children?: ReactNode;
}) {
  const { info } = useSite();
  const s = data.story;
  const aired = s.viewer_status === "aired";
  const set = (patch: Partial<StoryBundle>) => onChange({ ...data, ...patch });

  return (
    <div className="result-page">
      {data.animal && (
        <ResultView story={s} animal={data.animal} siteName={info.site_name} marks={{ aired, reviewed: !!data.review, golden: !!data.dex?.golden }} />
      )}
      <div className="result-after">
        {data.private_message && <PrivateMessage text={data.private_message} />}
        {aired && data.result && <AirResultCard result={data.result} />}
        {data.dex?.golden &&
          (canClaimGolden ? (
            <GoldenBox storyId={s.id} dex={data.dex} onChange={(dex) => set({ dex })} />
          ) : (
            <section className="golden-box">
              <h2>황금 고민 동물 발견!</h2>
              <p className="golden-desc">인증하면 다웅이 치지직 구독권을 드려요. 로그인해서 내 사연함에서 신청해 주세요.</p>
            </section>
          ))}

        <StatusTrack status={s.viewer_status} createdAt={s.created_at} waitingNotice={data.waiting_notice} />
        {(s.viewer_status === "approved" || s.viewer_status === "scheduled") && (
          <ChannelButtons className="ch-card" lead={s.viewer_status === "scheduled" ? "내 사연이 나오는 순간, 놓치지 마세요" : "읽히는 순간을 놓치지 않게"} />
        )}

        {aired && <ReviewBox auth={auth} review={data.review} onChange={(review) => set({ review })} />}

        <FollowUpBox auth={auth} items={data.follow_ups} onChange={(follow_ups) => set({ follow_ups })} />

        <details className="my-letter">
          <summary>내가 보낸 사연 다시 보기</summary>
          {s.voice && (
            <p className="faint" style={{ margin: "10px 0 0" }}>
              {optionLabel(GOMIN.voices, s.voice)} 목소리로 · {optionLabel(GOMIN.visibilities, s.visibility)}
            </p>
          )}
          <p className="story-body">{s.body}</p>
        </details>

        <ShortsConsent auth={auth} on={!!s.consent_shorts} onChange={(v) => set({ story: { ...s, consent_shorts: v } })} />

        {children}
      </div>
    </div>
  );
}

/** 릴스·쇼츠 사용 동의: 사연자가 언제든 켜고 끌 수 있어요 */
function ShortsConsent({ auth, on, onChange }: { auth: StoryAuth; on: boolean; onChange: (v: boolean) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // 누르는 즉시 바뀌고, 저장에 실패하면 원래대로 돌아가요.
  const toggle = async (next: boolean) => {
    onChange(next);
    setBusy(true);
    try {
      await callFn("public", { action: "shorts_consent", ...auth, on: next });
      toast(next ? "릴스·쇼츠 사용에 동의했어요" : "릴스·쇼츠 사용 동의를 거뒀어요");
    } catch (e) {
      onChange(!next);
      toast(e instanceof ApiError ? e.message : "바꾸지 못했어요");
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className="check shorts-consent">
      <input type="checkbox" checked={on} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
      <span>
        다웅의 릴스·쇼츠 영상에 이 사연을 써도 돼요
        <small className="check-sub">이름은 빼고, 사연 내용과 고민 동물만 나와요. 이미 올라간 영상은 다웅에게 따로 말해 주세요.</small>
      </span>
    </label>
  );
}
