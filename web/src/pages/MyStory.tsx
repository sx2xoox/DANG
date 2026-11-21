import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ApiError, callFn, supabase } from "../lib/supabase";
import { useSite } from "../lib/site";
import type { StoryBundle } from "../lib/mystory";
import { MyStoryView } from "../components/MyStoryView";
import { Dialog, Spinner, useToast } from "../components/ui";

/** 내 사연함 > 사연 하나 (로그인) */
export default function MyStory() {
  const { id } = useParams();
  const { session, authReady } = useSite();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<StoryBundle | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setData(await callFn<StoryBundle>("public", { action: "my_story", story_id: id }));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setData(null);
      else toast(e instanceof ApiError ? e.message : "불러오지 못했어요");
    }
  }, [id, toast]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (authReady && !session) return <Navigate to={`/login?next=/me/story/${id}`} replace />;
  if (data === undefined) return <Spinner />;
  if (data === null)
    return (
      <div className="page-narrow stack">
        <p className="notice">이 사연을 찾을 수 없어요.</p>
        <Link to="/me" className="btn">
          내 사연함으로
        </Link>
      </div>
    );

  const remove = async () => {
    const { error } = await supabase.from("stories").delete().eq("id", data.story.id);
    if (error) {
      toast("지우지 못했어요");
      return;
    }
    toast("사연을 지웠어요");
    navigate("/me", { replace: true });
  };

  return (
    <>
      <p className="result-back result-back-top">
        <Link to="/me" className="post-link">
          ← 내 사연함
        </Link>
      </p>
      <MyStoryView data={data} auth={{ story_id: data.story.id }} onChange={setData} canClaimGolden>
        <p className="result-links">
          <button type="button" className="post-link danger-text" onClick={() => setConfirmDelete(true)}>
            이 사연 지우기
          </button>
        </p>
      </MyStoryView>

      {confirmDelete && (
        <Dialog title="사연을 지울까요?" onClose={() => setConfirmDelete(false)}>
          <p style={{ margin: 0 }}>사연, 고민 동물, 도감 카드, 후기, 상담 그 후 이야기가 모두 지워지고 되돌릴 수 없어요.</p>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={remove}>
              지우기
            </button>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
