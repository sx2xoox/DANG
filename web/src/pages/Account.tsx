import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { randomNickname } from "@shared/boxes.ts";
import { ApiError, callFn, supabase } from "../lib/supabase";
import { useSite } from "../lib/site";
import { Dialog, Spinner, useToast } from "../components/ui";

export default function Account() {
  const { session, authReady } = useSite();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"chzzk" | "anon">("anon");
  const [loaded, setLoaded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [alsoStories, setAlsoStories] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("default_name, name_mode")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setName(data?.default_name ?? "");
        setMode((data?.name_mode as "chzzk" | "anon") ?? "anon");
        setLoaded(true);
      });
  }, [session]);

  if (authReady && !session) return <Navigate to="/login?next=/me/account" replace />;
  if (!loaded) return <Spinner />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").upsert({ user_id: session!.user.id, default_name: name.trim() || null, name_mode: mode, updated_at: new Date().toISOString() });
    toast(error ? "저장하지 못했어요" : "기본 이름을 저장했어요");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const leave = async () => {
    try {
      await callFn("public", { action: "delete_account", delete_stories: alsoStories });
      await supabase.auth.signOut();
      toast("탈퇴했어요. 그동안 고마웠어요!");
      navigate("/", { replace: true });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "탈퇴하지 못했어요");
    }
  };

  return (
    <div className="page-narrow">
      <div className="stack">
        <Link to="/me" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
          ← 내 사연함
        </Link>
        <form className="card stack" onSubmit={save}>
          <h1 className="display" style={{ fontSize: 26 }}>
            기본 이름
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            사연을 쓸 때 이 이름이 미리 채워져요.
          </p>
          <div className="row">
            <label className="check" style={{ flex: "1 1 200px" }}>
              <input type="radio" name="mode" checked={mode === "chzzk"} onChange={() => setMode("chzzk")} />
              치지직 닉네임
            </label>
            <label className="check" style={{ flex: "1 1 200px" }}>
              <input type="radio" name="mode" checked={mode === "anon"} onChange={() => setMode("anon")} />
              익명 랜덤 이름
            </label>
          </div>
          <div className="row">
            <label htmlFor="dname" className="sr-only">
              기본 이름
            </label>
            <input id="dname" className="input" style={{ flex: "1 1 220px" }} maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
            {mode === "anon" && (
              <button type="button" className="btn" onClick={() => setName(randomNickname())}>
                🎲 다시 뽑기
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            저장
          </button>
        </form>

        <section className="card stack">
          <h2 className="display" style={{ fontSize: 22 }}>
            로그인 정보
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {providerLabel(session!.user.app_metadata?.provider)} 계정으로 로그인되어 있어요.
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={logout}>
              로그아웃
            </button>
            <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirm(true)}>
              탈퇴하기
            </button>
          </div>
        </section>
      </div>

      {confirm && (
        <Dialog title="정말 탈퇴할까요?" onClose={() => setConfirm(false)}>
          <p style={{ margin: 0 }}>계정이 지워지고 되돌릴 수 없어요.</p>
          <label className="check">
            <input type="checkbox" checked={alsoStories} onChange={(e) => setAlsoStories(e.target.checked)} />
            <span>내가 보낸 사연과 고민 동물 결과도 모두 지우기</span>
          </label>
          {!alsoStories && (
            <p className="faint" style={{ margin: 0 }}>
              사연을 남겨두면 계정과의 연결만 끊기고, 접수번호와 비밀 코드로는 계속 볼 수 있어요.
            </p>
          )}
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={leave}>
              탈퇴하기
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              취소
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function providerLabel(p: unknown): string {
  if (p === "kakao") return "카카오";
  if (p === "google") return "구글";
  return "소셜";
}
