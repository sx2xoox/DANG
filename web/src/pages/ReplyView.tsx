import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { addPendingClaim, ApiError, callFn, store } from "../lib/supabase";
import { useSite } from "../lib/site";
import { ReplyCard, WaitingCard, type Reply, type ReplyStory } from "../components/ReplyCard";
import type { Animal } from "../components/AnimalCard";
import { Dialog, Spinner, useToast } from "../components/ui";
import { CREDS_KEY, type Creds } from "./Check";

type LookupData = {
  story: ReplyStory & { claimed: boolean };
  reply: Reply | null;
  animal: Animal | null;
  follow_ups: { id: string; body: string; created_at: string }[];
};

export default function ReplyView() {
  const { no } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { info, session } = useSite();
  const creds = store.get<Creds | null>(CREDS_KEY, null, true);
  const valid = creds && String(creds.receipt_no) === no;
  const [data, setData] = useState<LookupData | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // 새로고침/재방문 때도 항상 최신 상태로 불러옵니다.
    if (!valid) return;
    callFn<LookupData>("public", { action: "lookup", ...creds })
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "불러오지 못했어요."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid]);

  if (!valid) return <Navigate to={`/check?no=${no ?? ""}`} replace />;
  if (error)
    return (
      <div className="page-narrow">
        <p className="notice notice-danger">{error}</p>
      </div>
    );
  if (!data) return <Spinner />;

  const removeStory = async () => {
    try {
      await callFn("public", { action: "delete_by_code", ...creds });
      store.remove(CREDS_KEY, true);
      toast("사연을 지웠어요");
      navigate("/", { replace: true });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "지우지 못했어요");
    }
  };

  const moveToAccount = async () => {
    if (!creds) return;
    if (!session) {
      addPendingClaim(creds);
      navigate("/login?next=/me");
      return;
    }
    try {
      await callFn("public", { action: "claim", ...creds });
      toast("내 사연함으로 옮겼어요");
      navigate("/me");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "옮기지 못했어요");
    }
  };

  return (
    <div className="page-narrow">
      <div className="stack">
        {data.reply ? (
          <ReplyCard story={data.story} reply={data.reply} animal={data.animal} siteName={info.site_name} />
        ) : (
          <WaitingCard story={data.story} siteName={info.site_name} />
        )}

        <section className="card stack" aria-label="이 사연 관리">
          {!data.story.claimed && (
            <div className="row">
              <div style={{ flex: "1 1 240px" }}>
                <strong>내 사연함에 모아두기</strong>
                <p className="faint" style={{ margin: 0 }}>
                  로그인하면 이 사연과 답장을 계정에 저장하고, 후속 보고도 쓸 수 있어요.
                </p>
              </div>
              <button type="button" className="btn btn-blue" onClick={moveToAccount}>
                {session ? "내 사연함으로 옮기기" : "로그인하고 옮기기"}
              </button>
            </div>
          )}
          <div className="row">
            <span className="faint" style={{ flex: "1 1 200px" }}>
              이 사연을 더 이상 남기고 싶지 않다면 지울 수 있어요.
            </span>
            <button type="button" className="btn btn-sm btn-ghost danger-text" onClick={() => setConfirmDelete(true)}>
              사연 지우기
            </button>
          </div>
        </section>
      </div>

      {confirmDelete && (
        <Dialog title="사연을 지울까요?" onClose={() => setConfirmDelete(false)}>
          <p style={{ margin: 0 }}>사연, 답장, 고민 동물이 모두 지워지고 되돌릴 수 없어요.</p>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={removeStory}>
              지우기
            </button>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
