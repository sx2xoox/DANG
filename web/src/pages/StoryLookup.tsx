import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { addPendingClaim, ApiError, callFn, store } from "../lib/supabase";
import { useSite } from "../lib/site";
import { ResultView, StatusTrack, type ResultStory } from "../components/ResultCard";
import type { Animal } from "../components/AnimalCard";
import { Dialog, Spinner, useToast } from "../components/ui";
import { CREDS_KEY, type Creds } from "./Check";

type LookupData = {
  story: ResultStory & { viewer_status: string; claimed: boolean; body: string };
  animal: Animal | null;
  follow_ups: { id: string; body: string; created_at: string }[];
};

/** 접수번호 + 비밀 코드로 보는 내 사연 (고민 동물 결과 + 방송 진행 상황) */
export default function StoryLookup() {
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
    <div className="result-page">
      {data.animal && <ResultView story={data.story} animal={data.animal} siteName={info.site_name} />}
      <div className="result-after">
        <StatusTrack status={data.story.viewer_status} createdAt={data.story.created_at} />

        <details className="my-letter">
          <summary>내가 보낸 사연 다시 보기</summary>
          <p className="story-body">{data.story.body}</p>
        </details>

        <section className="lookup-manage" aria-label="이 사연 관리">
          {!data.story.claimed && (
            <div className="lookup-row">
              <p>
                <strong>내 사연함에 모아두기</strong>
                <br />
                로그인하면 코드 없이도 결과를 모아 보고, 후속 보고도 쓸 수 있어요.
              </p>
              <button type="button" className="post-btn post-btn-sub" onClick={moveToAccount}>
                {session ? "내 사연함으로 옮기기" : "로그인하고 옮기기"}
              </button>
            </div>
          )}
          <div className="lookup-row">
            <p>이 사연을 더 이상 남기고 싶지 않다면 지울 수 있어요. 아직 방송 전이라면 방송에서도 빠져요.</p>
            <button type="button" className="post-link danger-text" onClick={() => setConfirmDelete(true)}>
              사연 지우기
            </button>
          </div>
        </section>
      </div>

      {confirmDelete && (
        <Dialog title="사연을 지울까요?" onClose={() => setConfirmDelete(false)}>
          <p style={{ margin: 0 }}>사연과 고민 동물 결과가 모두 지워지고 되돌릴 수 없어요.</p>
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
