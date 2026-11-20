import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { GOMIN, optionLabel } from "@shared/boxes.ts";
import { supabase } from "../lib/supabase";
import { useSite } from "../lib/site";
import { formatDate } from "../lib/format";
import { ResultView, StatusTrack, type ResultStory } from "../components/ResultCard";
import type { Animal } from "../components/AnimalCard";
import { Dialog, Spinner, useToast } from "../components/ui";

type FullStory = ResultStory & {
  body: string;
  voice: string;
  visibility: string;
  viewer_status: string;
};

type FollowUp = { id: string; body: string; created_at: string };

export default function MyStory() {
  const { id } = useParams();
  const { session, authReady, info } = useSite();
  const navigate = useNavigate();
  const toast = useToast();
  const [story, setStory] = useState<FullStory | null | undefined>(undefined);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [s, a, f] = await Promise.all([
      supabase
        .from("stories")
        .select("id, receipt_no, summary, display_name, stamp, wish, category, temperature, voice, visibility, viewer_status, created_at, body")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("worry_animals").select("name, emoji, why, description, quote, hashtags, prev_name, prev_emoji, change_reason").eq("story_id", id).maybeSingle(),
      supabase.from("follow_ups").select("id, body, created_at").eq("story_id", id).order("created_at"),
    ]);
    setStory((s.data as FullStory) ?? null);
    setAnimal(a.data as Animal | null);
    setFollowUps((f.data as FollowUp[]) ?? []);
  }, [id]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (authReady && !session) return <Navigate to={`/login?next=/me/story/${id}`} replace />;
  if (story === undefined) return <Spinner />;
  if (story === null)
    return (
      <div className="page-narrow stack">
        <p className="notice">이 사연을 찾을 수 없어요.</p>
        <Link to="/me" className="btn">
          내 사연함으로
        </Link>
      </div>
    );

  const addFollowUp = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSaving(true);
    const { error } = await supabase.from("follow_ups").insert({ story_id: story.id, body });
    setSaving(false);
    if (error) {
      toast("저장하지 못했어요");
      return;
    }
    setText("");
    toast("후속 보고를 남겼어요. 다웅도 볼 수 있어요!");
    load();
  };

  const remove = async () => {
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) {
      toast("지우지 못했어요");
      return;
    }
    toast("사연을 지웠어요");
    navigate("/me", { replace: true });
  };

  return (
    <div className="result-page">
      <p className="result-back">
        <Link to="/me" className="post-link">
          ← 내 사연함
        </Link>
      </p>
      {animal && <ResultView story={story} animal={animal} siteName={info.site_name} />}

      <div className="result-after">
        <StatusTrack status={story.viewer_status} createdAt={story.created_at} />

        <details className="my-letter">
          <summary>내가 보낸 사연 다시 보기</summary>
          <p className="faint" style={{ margin: "10px 0 0" }}>
            {optionLabel(GOMIN.voices, story.voice)} 목소리로 · {optionLabel(GOMIN.visibilities, story.visibility)}
          </p>
          <p className="story-body">{story.body}</p>
        </details>

        <section className="followup" aria-labelledby="fu-title">
          <h2 id="fu-title">후속 보고</h2>
          <p>그 뒤로 어떻게 됐는지 이어서 들려주세요. 여러 번 쓸 수 있고, 다웅도 원래 사연 아래에서 볼 수 있어요.</p>
          {followUps.length > 0 && (
            <ol className="follow-list">
              {followUps.map((f) => (
                <li key={f.id}>
                  <span className="faint">{formatDate(f.created_at, true)}</span>
                  <p>{f.body}</p>
                </li>
              ))}
            </ol>
          )}
          <form className="stack" onSubmit={addFollowUp}>
            <label htmlFor="fu" className="sr-only">
              후속 보고 쓰기
            </label>
            <textarea
              id="fu"
              className="textarea"
              maxLength={3000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예) 용기 내서 먼저 연락했더니 화해했어요!"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addFollowUp(e as unknown as FormEvent);
              }}
            />
            <button type="submit" className="post-btn post-btn-main" disabled={saving || !text.trim()} style={{ alignSelf: "flex-end" }}>
              {saving ? "남기는 중…" : "후속 보고 남기기"}
            </button>
          </form>
        </section>

        <p className="result-links">
          <button type="button" className="post-link danger-text" onClick={() => setConfirmDelete(true)}>
            이 사연 지우기
          </button>
        </p>
      </div>

      {confirmDelete && (
        <Dialog title="사연을 지울까요?" onClose={() => setConfirmDelete(false)}>
          <p style={{ margin: 0 }}>사연, 고민 동물, 후속 보고가 모두 지워지고 되돌릴 수 없어요.</p>
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
    </div>
  );
}
