import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { reactionEmoji, reactionLabel } from "@shared/results.ts";
import { errMsg, useAdmin, type Status } from "./api";
import { FlagChips, StatusChip } from "./parts";
import { Spinner, StampSticker } from "../components/ui";
import { formatDate } from "../lib/format";
import { store } from "../lib/supabase";

type Item = {
  id: string;
  receipt_no: number;
  broadcast_name: string;
  summary: string;
  body: string;
  stamp: string;
  status: Status;
  flags: string[];
  created_at: string;
  aired_at: string | null;
  animal: { name: string; emoji: string } | null;
  follow_ups: { id: string; body: string; flags: string[]; created_at: string }[];
  review: { reaction: string; comment: string; share: boolean; status: string; flags: string[] } | null;
  last_at: string;
};

/** 그 후 이야기: 후속 보고나 후기가 들어온 사연만 모아서. "지난 사연자분들 근황" 코너용 (읽기 모드 지원) */
export default function After() {
  const { call } = useAdmin();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [onlyFollow, setOnlyFollow] = useState(false);
  const [reading, setReading] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await call<{ items: Item[] }>("after_list")).items);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!items) return <Spinner />;
  const shown = onlyFollow ? items.filter((i) => i.follow_ups.length > 0) : items;

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">그 후 이야기</h1>
          <p className="adm-dim">후속 보고나 상담 후기가 들어온 사연만 모았어요. 방송에서 "지난 사연자분들 근황" 코너로 읽기 좋게 최근 소식 순이에요.</p>
        </div>
        <div className="row">
          <label className="adm-check">
            <input type="checkbox" checked={onlyFollow} onChange={(e) => setOnlyFollow(e.target.checked)} />
            <span>후속 보고 있는 사연만</span>
          </label>
          <button className="btn btn-primary" disabled={!shown.length} onClick={() => setReading(0)}>
            읽기 모드로 보기
          </button>
        </div>
      </header>

      {shown.length === 0 ? (
        <p className="adm-panel adm-dim">아직 들어온 근황이 없어요.</p>
      ) : (
        <ul className="adm-after-list">
          {shown.map((it, i) => (
            <li key={it.id} className="adm-panel">
              <div className="adm-after-head">
                <StampSticker stamp={it.stamp} size="sm" />
                <div>
                  <p className="adm-dim adm-small">
                    <Link to={`/admin/stories/${it.id}`} className="adm-no">
                      #{it.receipt_no}
                    </Link>{" "}
                    · {it.broadcast_name}
                    {it.animal ? ` · ${it.animal.emoji} ${it.animal.name}` : ""}
                    {it.aired_at ? ` · ${formatDate(it.aired_at)} 방송` : ""}
                  </p>
                  <h2 className="adm-summary">{it.summary}</h2>
                </div>
                <StatusChip status={it.status} />
              </div>
              {it.follow_ups.map((f) => (
                <div key={f.id} className="adm-after-fu">
                  <span className="adm-label">
                    후속 보고 · {formatDate(f.created_at, true)} <FlagChips flags={f.flags} />
                  </span>
                  <p>{f.body}</p>
                </div>
              ))}
              {it.review && (
                <p className="adm-review-line">
                  <span className="adm-label">상담 후기</span>{" "}
                  <b>
                    {reactionEmoji(it.review.reaction)} {reactionLabel(it.review.reaction)}
                  </b>
                  {it.review.comment && <q>{it.review.comment}</q>}
                </p>
              )}
              <button className="btn btn-sm" onClick={() => setReading(i)}>
                이 사연부터 읽기 모드
              </button>
            </li>
          ))}
        </ul>
      )}

      {reading !== null && shown[reading] && (
        <AfterReader items={shown} index={reading} onIndex={setReading} onClose={() => setReading(null)} />
      )}
    </div>
  );
}

/** 근황 읽기 모드: 큰 글씨, 이전/다음 (방향키) */
function AfterReader({ items, index, onIndex, onClose }: { items: Item[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const it = items[index];
  const [font, setFont] = useState<number>(() => store.get("dg.admin.readFont", 30));
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, items.length, onClose, onIndex]);

  const changeFont = (d: number) => {
    const next = Math.min(56, Math.max(18, font + d));
    setFont(next);
    store.set("dg.admin.readFont", next);
  };

  return (
    <div className="adm-read" role="dialog" aria-modal="true" aria-label="그 후 이야기 읽기 모드">
      <div className="adm-read-bar">
        <span className="adm-title-sm">
          그 후 이야기 <span className="adm-mono adm-dim">{index + 1} / {items.length}</span>
        </span>
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
      <div className="adm-read-body">
        <div className="adm-read-head">
          <StampSticker stamp={it.stamp} size="lg" />
          <div>
            <p className="adm-read-who">
              #{it.receipt_no} · {it.broadcast_name}
              {it.animal ? ` · ${it.animal.emoji} ${it.animal.name}` : ""}
              {it.aired_at ? ` · ${formatDate(it.aired_at)} 방송` : ""}
            </p>
            <h2 className="adm-read-summary">{it.summary}</h2>
          </div>
        </div>
        <details className="adm-after-orig">
          <summary>원래 사연 다시 보기</summary>
          <p style={{ fontSize: Math.round(font * 0.7) }}>{it.body}</p>
        </details>
        {it.follow_ups.map((f) => (
          <div key={f.id} className="adm-read-follow">
            <h3>그 후 이야기 · {formatDate(f.created_at)}</h3>
            <p style={{ fontSize: font }}>{f.body}</p>
          </div>
        ))}
        {it.review && (
          <div className="adm-read-follow">
            <h3>방송에서 들은 답은?</h3>
            <p style={{ fontSize: Math.round(font * 0.9) }}>
              {reactionEmoji(it.review.reaction)} {reactionLabel(it.review.reaction)}
              {it.review.comment ? ` · “${it.review.comment}”` : ""}
            </p>
          </div>
        )}
      </div>
      <div className="adm-read-actions">
        <button className="btn" disabled={index === 0} onClick={() => onIndex(index - 1)}>
          ← 이전 사연
        </button>
        <button className="btn btn-primary" disabled={index >= items.length - 1} onClick={() => onIndex(index + 1)}>
          다음 사연 →
        </button>
      </div>
    </div>
  );
}
