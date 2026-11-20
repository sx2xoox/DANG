import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errMsg, useAdmin } from "./api";
import { Spinner, useToast } from "../components/ui";
import { copyText } from "../lib/image";
import { formatDate } from "../lib/format";

type Item = {
  story_id: string;
  golden_code: string;
  claim_name: string | null;
  claimed_at: string | null;
  paid_at: string | null;
  collected_at: string;
  receipt_no: number;
  summary: string;
  display_name: string;
  animal: { name: string; emoji: string } | null;
};

/** 황금 동물: 인증 코드 확인 → 구독권 지급 표시 (방장만) */
export default function Golden() {
  const { call, refreshAlerts } = useAdmin();
  const toast = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems((await call<{ items: Item[] }>("golden_list")).items);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  const mark = async (id: string, paid: boolean) => {
    try {
      await call("golden_mark_paid", { story_id: id, paid });
      toast(paid ? "구독권 지급 완료로 표시했어요" : "지급 표시를 취소했어요");
      await load();
      refreshAlerts();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!items) return <Spinner />;

  const norm = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const query = norm(q);
  const shown = query ? items.filter((i) => norm(i.golden_code).includes(query) || norm(i.claim_name ?? "").includes(query)) : items;
  const waiting = items.filter((i) => i.claimed_at && !i.paid_at);

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">황금 동물</h1>
          <p className="adm-dim">
            로그인한 사연자의 사연이 방송에서 읽혀 도감에 모일 때 1% 확률로 나와요. 사연자가 인증 코드와 치지직 닉네임을 남기면, 코드를 확인하고 구독권을 보낸 뒤 "지급 완료"를 눌러주세요.
          </p>
        </div>
      </header>

      <div className="field adm-gold-search">
        <label htmlFor="gold-q">인증 코드 또는 닉네임으로 확인</label>
        <input id="gold-q" className="input adm-mono" placeholder="GOLD-XXXX-XXXX" value={q} onChange={(e) => setQ(e.target.value)} />
        {query && <span className="adm-small">{shown.length ? `맞는 황금 동물 ${shown.length}개` : "맞는 코드가 없어요. 코드를 다시 확인해 주세요."}</span>}
      </div>

      {!query && waiting.length > 0 && <p className="adm-done">지급을 기다리는 사람 {waiting.length}명</p>}

      {shown.length === 0 && !query ? (
        <p className="adm-panel adm-dim">아직 나온 황금 동물이 없어요.</p>
      ) : (
        <ul className="adm-gold-list">
          {shown.map((g) => (
            <li key={g.story_id} className={`adm-panel ${g.paid_at ? "is-paid" : g.claimed_at ? "is-waiting" : ""}`}>
              <div className="adm-gold-top">
                <span className="adm-gold-emoji" aria-hidden="true">
                  {g.animal?.emoji}
                </span>
                <div>
                  <p className="adm-gold-name">
                    {g.animal?.name} <span className="adm-gold">황금</span>
                  </p>
                  <p className="adm-dim adm-small">
                    <Link to={`/admin/stories/${g.story_id}`} className="adm-no">
                      #{g.receipt_no}
                    </Link>{" "}
                    {g.summary} · 사연 이름 {g.display_name} · {formatDate(g.collected_at)} 획득
                  </p>
                </div>
              </div>
              <p className="adm-gold-code">
                <code>{g.golden_code}</code>
                <button className="btn btn-sm" onClick={async () => toast((await copyText(g.golden_code)) ? "복사했어요" : "복사하지 못했어요")}>
                  복사
                </button>
              </p>
              <p>
                {g.claimed_at ? (
                  <>
                    받을 치지직 닉네임: <b>{g.claim_name}</b> <span className="adm-dim adm-small">({formatDate(g.claimed_at, true)} 신청)</span>
                  </>
                ) : (
                  <span className="adm-dim">아직 신청하지 않았어요.</span>
                )}
              </p>
              <div className="row">
                {g.paid_at ? (
                  <>
                    <span className="adm-tag ok">지급 완료 · {formatDate(g.paid_at)}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => mark(g.story_id, false)}>
                      지급 취소
                    </button>
                  </>
                ) : (
                  <button className="btn btn-sm btn-primary" onClick={() => mark(g.story_id, true)}>
                    구독권 지급 완료
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
