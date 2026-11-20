import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errMsg, useAdmin, type ListItem } from "./api";
import { Spinner, StampSticker } from "../components/ui";
import { ADMIN_STATUS, daysSince, shortDate } from "../lib/format";

export default function Waiting() {
  const { call } = useAdmin();
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    call<{ items: ListItem[] }>("waiting")
      .then((r) => setItems(r.items))
      .catch((e) => setError(errMsg(e)));
  }, [call]);

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!items) return <Spinner />;

  const care = items.filter((s) => s.flags.includes("care")).length;
  return (
    <div className="stack">
      <header className="adm-page-head">
        <h1 className="display">답장 대기</h1>
        <p className="muted">
          답장을 기다리는 사연 {items.length}개 · 오래 기다린 순서예요. {care > 0 && <b className="adm-red">확인 필요 {care}개는 맨 위에 있어요.</b>}
        </p>
      </header>
      <ul className="adm-rows">
        {items.map((s) => {
          const d = daysSince(s.created_at);
          return (
            <li key={s.id}>
              <Link to={`/admin/s/${s.id}`} className={`adm-row ${s.flags.includes("care") ? "is-care" : ""}`}>
                <div className="adm-row-top">
                  <span className="adm-no">#{s.receipt_no}</span>
                  {s.flags.includes("care") && <span className="chip chip-red">확인 필요</span>}
                  <span className={`chip adm-status st-${s.status}`}>{ADMIN_STATUS[s.status]}</span>
                  {s.has_draft && <span className="chip">초안 있음</span>}
                  <span className="spacer" />
                  <span className={`adm-days ${d >= 5 ? "is-late" : ""}`}>{d === 0 ? "오늘" : `${d}일째 기다리는 중`}</span>
                </div>
                <div className="adm-row-main">
                  <StampSticker stamp={s.stamp} size="sm" />
                  <div className="adm-row-text">
                    <strong>{s.summary}</strong>
                    <span className="faint">
                      {s.broadcast_name} · {shortDate(s.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {!items.length && <li className="adm-empty">모든 사연에 답장했어요. 수고했어요!</li>}
      </ul>
    </div>
  );
}
