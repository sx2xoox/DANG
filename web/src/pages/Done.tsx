import { forwardRef, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { addPendingClaim, store } from "../lib/supabase";
import { useSite, type Preset } from "../lib/site";
import { copyText, saveNodeAsImage } from "../lib/image";
import { formatDate } from "../lib/format";
import { HelpLines, StampSticker, useToast } from "../components/ui";
import { ResultView, StatusTrack } from "../components/ResultCard";
import type { Animal } from "../components/AnimalCard";
import { ChannelButtons } from "../components/Channels";

export type Receipt = {
  story_id: string;
  receipt_no: number;
  code: string;
  display_name: string;
  stamp: string;
  summary: string;
  badge: string;
  visibility: string;
  created_at: string;
  care: boolean;
  logged_in: boolean;
  /** 만 14세 미만일 수 있는 사연: 로그인 계정과 연결하지 않아요 */
  under14?: boolean;
  animal: Animal;
  // 결과 화면용 (제출할 때 고른 값)
  category: string;
  wish: string;
  temperature: number;
};

export default function Done() {
  const loc = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { info, session } = useSite();
  const receipt: Receipt | null = (loc.state as { receipt?: Receipt } | null)?.receipt ?? store.get<Receipt | null>("dg.lastReceipt", null, true);
  const fresh = !!(loc.state as { fresh?: boolean } | null)?.fresh;
  const [phase, setPhase] = useState<"sending" | "done">(fresh ? "sending" : "done");
  const [busy, setBusy] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "sending") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setPhase("done"), reduce ? 200 : 2000);
    // 새로고침 시 애니메이션이 다시 나오지 않도록
    navigate(loc.pathname, { replace: true, state: { receipt } });
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!receipt || !receipt.animal) return <Navigate to="/check" replace />;

  const saveReceipt = async () => {
    if (!receiptRef.current) return;
    setBusy(true);
    try {
      await saveNodeAsImage(receiptRef.current, `사연접수증-${receipt.receipt_no}.png`);
      toast("접수증을 저장했어요. 비밀 코드가 들어 있으니 남에게 보여주지 마세요!");
    } catch {
      toast("이미지를 만들지 못했어요. 코드를 복사해 두세요.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    const ok = await copyText(`${info.site_name} 접수번호 #${receipt.receipt_no} / 비밀 코드 ${receipt.code}`);
    toast(ok ? "접수번호와 비밀 코드를 복사했어요" : "복사하지 못했어요. 직접 적어두세요.");
  };

  const goLogin = () => {
    addPendingClaim({ receipt_no: receipt.receipt_no, code: receipt.code });
    navigate("/login?next=/me");
  };

  if (phase === "sending") {
    return (
      <div className="page-narrow">
        <SendingAnimation preset={info.preset} />
      </div>
    );
  }

  return (
    <div className="result-page">
      {receipt.care && (
        <div className="result-help">
          <HelpLines />
        </div>
      )}

      <ResultView
        story={{
          id: receipt.story_id,
          receipt_no: receipt.receipt_no,
          summary: receipt.summary,
          display_name: receipt.display_name,
          stamp: receipt.stamp,
          wish: receipt.wish,
          category: receipt.category,
          temperature: receipt.temperature,
          created_at: receipt.created_at,
        }}
        animal={receipt.animal}
        siteName={info.site_name}
      />

      <div className="result-after">
        <StatusTrack status="reviewing" createdAt={receipt.created_at} />

        <section className="code-slip" aria-labelledby="code-title">
          <div className="code-slip-head">
            <h2 id="code-title">사연 조회 코드</h2>
            <p>이 코드로 내 결과와 방송 결과를 다시 보고, 후기와 상담 그 후 이야기를 남기거나 사연을 지울 수 있어요. 잃어버리면 다시 찾을 수 없어요.</p>
          </div>
          <div className="code-slip-pair">
            <div>
              <span>접수번호</span>
              <strong>#{receipt.receipt_no}</strong>
            </div>
            <div>
              <span>비밀 코드</span>
              <strong className="code-mono">{receipt.code}</strong>
            </div>
          </div>
          <div className="code-slip-actions">
            <button type="button" className="post-btn post-btn-main" onClick={copy}>
              코드 복사
            </button>
            <button type="button" className="post-btn post-btn-sub" onClick={saveReceipt} disabled={busy}>
              접수증 이미지로 저장
            </button>
          </div>
          {receipt.under14 ? (
            <p className="code-slip-note">
              만 14세 미만일 수 있는 사연은 로그인 계정과 연결하지 않아요. <b>접수번호와 비밀 코드를 꼭 저장해 두세요.</b> 이 코드로 결과와 방송 여부를 볼 수 있어요.
            </p>
          ) : session && receipt.logged_in ? (
            <p className="code-slip-note">
              로그인되어 있어서 <Link to="/me">내 사연함</Link>에도 담겼어요.
            </p>
          ) : (
            <div className="code-slip-login">
              <p>로그인하면 코드 없이도 내 사연함에서 결과를 모아 보고, 방송에서 읽힌 사연의 고민 동물을 도감에 모을 수 있어요. 방금 낸 사연도 옮겨드려요.</p>
              <button type="button" className="post-btn post-btn-sub" onClick={goLogin}>
                로그인하고 모아두기
              </button>
            </div>
          )}
        </section>

        <ChannelButtons className="ch-card" lead="내 사연이 읽히는 순간, 방송에서 같이 봐요" />

        {/* 저장용 접수증 (화면 밖에서 이미지로만 씀) */}
        <div className="receipt-offscreen" aria-hidden="true">
          <ReceiptCard ref={receiptRef} receipt={receipt} siteName={info.site_name} />
        </div>

        <p className="result-links">
          <Link to="/">첫 화면으로</Link>
          <Link to="/write">사연 하나 더 쓰기</Link>
        </p>
      </div>
    </div>
  );
}

export const ReceiptCard = forwardRef<HTMLDivElement, { receipt: Receipt; siteName: string }>(function ReceiptCard({ receipt, siteName }, ref) {
  return (
    <div ref={ref} className="receipt">
      <div className="receipt-head">
        <span className="receipt-site">{siteName}</span>
        <span className="receipt-kind">사연 접수증</span>
      </div>
      <div className="receipt-no">#{receipt.receipt_no}</div>
      <div className="receipt-grid">
        <div className="receipt-info">
          <dl>
            <div>
              <dt>보낸 사람</dt>
              <dd>{receipt.display_name}</dd>
            </div>
            <div>
              <dt>접수일</dt>
              <dd>{formatDate(receipt.created_at)}</dd>
            </div>
            <div>
              <dt>한 줄 요약</dt>
              <dd className="receipt-summary">“{receipt.summary}”</dd>
            </div>
          </dl>
          <span className="receipt-badge">{receipt.badge}</span>
        </div>
        <StampSticker stamp={receipt.stamp} size="lg" />
      </div>
      <div className="receipt-mystery">
        <div className="mystery-silhouette" aria-hidden="true">
          {receipt.animal.emoji}
        </div>
        <div>
          <strong>{receipt.animal.name}</strong>
          <p>나의 고민 동물</p>
        </div>
      </div>
      <div className="receipt-secret">
        <span>비밀 코드</span>
        <strong>{receipt.code}</strong>
      </div>
      <div className="receipt-tear" aria-hidden="true" />
    </div>
  );
});

/** 편지가 접혀 들어가는 짧은 연출 (프리셋마다 다름) */
function SendingAnimation({ preset }: { preset: Preset }) {
  const label =
    preset === "cork" ? "게시판에 붙이는 중…" : preset === "gacha" ? "캡슐에 담는 중…" : preset === "lounge" ? "사연함에 살며시 넣는 중…" : "우체통에 넣는 중…";
  return (
    <div className={`send-anim send-${preset}`} role="status" aria-live="polite">
      <div className="send-stage" aria-hidden="true">
        {(preset === "classic" || preset === "lounge") && (
          <>
            <div className="mailbox">
              <div className="mailbox-slot" />
              <div className="mailbox-flag" />
            </div>
            <div className="letter">
              <div className="letter-paper" />
              <div className="letter-flap" />
            </div>
          </>
        )}
        {preset === "cork" && (
          <div className="cork-strip">
            <div className="postit-fly">
              <span className="postit-pin" />
            </div>
          </div>
        )}
        {preset === "gacha" && (
          <div className="capsule-stage">
            <div className="capsule-paper" />
            <div className="capsule capsule-top" />
            <div className="capsule capsule-bottom" />
          </div>
        )}
      </div>
      <p className="display send-label">{label}</p>
    </div>
  );
}
