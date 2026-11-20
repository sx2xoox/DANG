import { forwardRef, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { addPendingClaim, store } from "../lib/supabase";
import { useSite, type Preset } from "../lib/site";
import { copyText, saveNodeAsImage, shareNodeAsImage } from "../lib/image";
import { formatDate } from "../lib/format";
import { HelpLines, StampSticker, useToast } from "../components/ui";

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
};

export default function Done() {
  const loc = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { info, session } = useSite();
  const receipt: Receipt | null = (loc.state as { receipt?: Receipt } | null)?.receipt ?? store.get<Receipt | null>("dg.lastReceipt", null, true);
  const fresh = !!(loc.state as { fresh?: boolean } | null)?.fresh;
  const [phase, setPhase] = useState<"sending" | "done">(fresh ? "sending" : "done");
  const [hideSecret, setHideSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "sending") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setPhase("done"), reduce ? 200 : 2300);
    // 새로고침 시 애니메이션이 다시 나오지 않도록
    navigate(loc.pathname, { replace: true, state: { receipt } });
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!receipt) return <Navigate to="/check" replace />;

  const fileBase = `사연접수증-${receipt.receipt_no}`;

  const saveForMe = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      await saveNodeAsImage(cardRef.current, `${fileBase}-보관용.png`);
      toast("접수증을 저장했어요. 비밀 코드가 들어 있으니 남에게 보여주지 마세요!");
    } catch {
      toast("이미지를 만들지 못했어요. 코드를 복사해 두세요.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setHideSecret(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const r = await shareNodeAsImage(cardRef.current, `${fileBase}.png`, `${info.site_name}에 사연을 보냈어요! 내 고민 동물은 뭘까?`);
      if (r === "saved") toast("공유용 이미지를 저장했어요. (비밀 코드는 빠져 있어요)");
    } catch {
      toast("이미지를 만들지 못했어요.");
    } finally {
      setHideSecret(false);
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
    <div className="page-narrow done">
      <div className="stack">
        <h1 className="display done-title">사연이 잘 도착했어요!</h1>

        {receipt.care && <HelpLines />}

        <ReceiptCard ref={cardRef} receipt={receipt} siteName={info.site_name} hideSecret={hideSecret} />

        <section className="card code-box" aria-labelledby="code-title">
          <h2 id="code-title" className="display">
            🔑 이 코드가 있어야 답장을 볼 수 있어요
          </h2>
          <div className="code-pair">
            <div>
              <span className="faint">접수번호</span>
              <strong className="code-big">#{receipt.receipt_no}</strong>
            </div>
            <div>
              <span className="faint">비밀 코드</span>
              <strong className="code-big code-mono">{receipt.code}</strong>
            </div>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {session
              ? "로그인되어 있어서 내 사연함에도 저장됐어요. 그래도 코드를 보관해 두면 로그인 없이도 확인할 수 있어요."
              : "코드를 잃어버리면 답장을 볼 수 없어요. 꼭 복사하거나 접수증을 저장해 두세요."}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={copy}>
              📋 코드 복사
            </button>
            <button type="button" className="btn" onClick={saveForMe} disabled={busy}>
              🧾 접수증 저장 (코드 포함)
            </button>
            <button type="button" className="btn btn-ghost" onClick={share} disabled={busy}>
              공유하기 (코드 빼고)
            </button>
          </div>
        </section>

        {session ? (
          <div className="notice notice-yellow">
            내 사연함에 담았어요. 답장이 오면 빨간 점으로 알려드릴게요.{" "}
            <Link to="/me">내 사연함 보기 →</Link>
          </div>
        ) : (
          <section className="card login-nudge">
            <div>
              <h2 className="display">로그인하면 더 편해요</h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                답장 알림을 받고 내 사연함에 모아둘 수 있어요. 방금 낸 사연도 계정으로 옮겨드려요.
              </p>
            </div>
            <button type="button" className="btn btn-blue" onClick={goLogin}>
              로그인하고 모아두기
            </button>
          </section>
        )}

        <div className="row" style={{ justifyContent: "center" }}>
          <Link to="/" className="btn btn-ghost">
            첫 화면으로
          </Link>
          <Link to={`/check?no=${receipt.receipt_no}`} className="btn btn-ghost">
            답장 확인 화면
          </Link>
        </div>
      </div>
    </div>
  );
}

export const ReceiptCard = forwardRef<HTMLDivElement, { receipt: Receipt; siteName: string; hideSecret?: boolean }>(
  function ReceiptCard({ receipt, siteName, hideSecret }, ref) {
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
            <span className="receipt-badge">🏅 {receipt.badge}</span>
          </div>
          <StampSticker stamp={receipt.stamp} size="lg" />
        </div>
        <div className="receipt-mystery">
          <div className="mystery-silhouette" aria-hidden="true">
            ?
          </div>
          <div>
            <strong>당신의 고민 동물은?</strong>
            <p>답장과 함께 공개돼요</p>
          </div>
        </div>
        {!hideSecret && (
          <div className="receipt-secret">
            <span>비밀 코드</span>
            <strong>{receipt.code}</strong>
          </div>
        )}
        <div className="receipt-tear" aria-hidden="true" />
      </div>
    );
  },
);

/** 편지가 접혀 들어가는 짧은 연출 (프리셋마다 다름) */
function SendingAnimation({ preset }: { preset: Preset }) {
  const label = preset === "cork" ? "게시판에 붙이는 중…" : preset === "gacha" ? "캡슐에 담는 중…" : "우체통에 넣는 중…";
  return (
    <div className={`send-anim send-${preset}`} role="status" aria-live="polite">
      <div className="send-stage" aria-hidden="true">
        {preset === "classic" && (
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
