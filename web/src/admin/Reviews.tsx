import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reactionEmoji, reactionLabel } from "@shared/results.ts";
import { errMsg, REVIEW_STATUS_LABEL, useAdmin } from "./api";
import { FlagChips } from "./parts";
import { Spinner, useToast } from "../components/ui";
import { formatDate } from "../lib/format";

type Item = {
  story_id: string;
  reaction: string;
  comment: string;
  share: boolean;
  status: "new" | "approved" | "hidden";
  flags: string[];
  updated_at: string;
  receipt_no: number;
  summary: string;
  broadcast_name: string;
  animal: { name: string; emoji: string } | null;
};

const TABS = ["new", "approved", "hidden"] as const;

/** 상담 후기: 새 후기 / 승인됨 / 숨김. 승인하면 (공개 동의한 후기만) 첫 화면 후기 벽에 올라가요. */
export default function Reviews() {
  const { call, isOwner, refreshAlerts } = useAdmin();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("new");
  const [items, setItems] = useState<Item[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await call<{ items: Item[]; counts: Record<string, number> }>("reviews_list", { status: tab });
      setItems(r.items);
      setCounts(r.counts);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [call, tab]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  const set = async (id: string, status: string) => {
    try {
      await call("review_set_status", { story_id: id, status });
      toast(status === "approved" ? "승인했어요" : status === "hidden" ? "숨겼어요" : "새 후기로 되돌렸어요");
      await load();
      refreshAlerts();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">상담 후기</h1>
          <p className="adm-dim">
            승인한 후기 중 사연자가 공개에 동의한 것만 첫 화면 후기 벽에 올라가요. 후기 벽에는 고민 동물, 반응, 한 줄 후기만 보여요. 언제든 숨길 수 있어요.
            {!isOwner && " 후기 승인은 방장만 할 수 있어요."}
          </p>
        </div>
      </header>

      <div className="adm-tabs" role="tablist" aria-label="후기 상태">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
            {REVIEW_STATUS_LABEL[t]} <span className="adm-mono">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="adm-panel adm-dim">{tab === "new" ? "새 후기가 없어요." : "후기가 없어요."}</p>
      ) : (
        <ul className="adm-review-list">
          {items.map((r) => {
            const flagged = r.flags.length > 0;
            return (
              <li key={r.story_id} className={`adm-panel ${flagged ? "is-flagged" : ""}`}>
                <div className="adm-review-top">
                  <span className="adm-review-animal">
                    <span aria-hidden="true">{r.animal?.emoji}</span> {r.animal?.name}
                  </span>
                  <b>
                    {reactionEmoji(r.reaction)} {reactionLabel(r.reaction)}
                  </b>
                  <span className={`adm-tag ${r.share ? "ok" : ""}`}>{r.share ? "공개 동의" : "공개 안 함"}</span>
                  {flagged && <span className="adm-flag is-care">확인 필요</span>}
                  <FlagChips flags={r.flags} />
                </div>
                {r.comment ? <p className="adm-review-comment">“{r.comment}”</p> : <p className="adm-dim adm-small">한 줄 후기 없음</p>}
                <p className="adm-dim adm-small">
                  <Link to={`/admin/stories/${r.story_id}`} className="adm-no">
                    #{r.receipt_no}
                  </Link>{" "}
                  {r.summary} · {r.broadcast_name} · {formatDate(r.updated_at, true)}
                </p>
                {isOwner && (
                  <div className="row">
                    {r.status !== "approved" && (
                      <button className="btn btn-sm btn-primary" onClick={() => set(r.story_id, "approved")}>
                        {r.share ? "승인 (후기 벽에 올리기)" : "승인"}
                      </button>
                    )}
                    {r.status === "approved" && r.share && (
                      <button className="btn btn-sm" onClick={() => set(r.story_id, "hidden")}>
                        후기 벽에서 내리기
                      </button>
                    )}
                    {r.status !== "hidden" && !(r.status === "approved" && r.share) && (
                      <button className="btn btn-sm" onClick={() => set(r.story_id, "hidden")}>
                        숨기기
                      </button>
                    )}
                    {r.status !== "new" && (
                      <button className="btn btn-sm btn-ghost" onClick={() => set(r.story_id, "new")}>
                        새 후기로 되돌리기
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
