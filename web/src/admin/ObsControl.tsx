import { useCallback, useEffect, useRef, useState } from "react";
import { errMsg, useAdmin } from "./api";
import { Dialog, useToast } from "../components/ui";
import { copyText } from "../lib/image";

type BState = {
  story_id: string | null;
  hidden: boolean;
  revealed: boolean;
  updated_at: string;
  stories: { receipt_no: number; summary: string; display_name: string; visibility: string } | null;
};

export default function ObsControl() {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const [key, setKey] = useState<string | null>(null);
  const [state, setState] = useState<BState | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const loadState = useCallback(async () => {
    try {
      setState(await call<BState>("broadcast_state"));
    } catch (e) {
      toast(errMsg(e));
    }
  }, [call, toast]);

  useEffect(() => {
    loadState();
    if (isOwner) call<{ obs_key: string | null }>("settings_get").then((s) => setKey(s.obs_key)).catch(() => {});
    const t = window.setInterval(loadState, 5000);
    return () => window.clearInterval(t);
  }, [call, isOwner, loadState]);

  const url = key ? `${location.origin}/obs?key=${key}` : "";
  const masked = key ? `${location.origin}/obs?key=${key.slice(0, 4)}••••••••` : "";

  const op = async (body: Record<string, unknown>, msg: string) => {
    try {
      setState(await call<BState>("broadcast", body));
      toast(msg);
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const rotate = async () => {
    try {
      const res = await call<{ obs_key: string }>("obs_rotate");
      setKey(res.obs_key);
      setShowKey(true);
      toast("새 OBS 주소를 만들었어요. OBS에도 새 주소를 넣어주세요");
    } catch (e) {
      toast(errMsg(e));
    }
    setConfirmRotate(false);
  };

  return (
    <div className="stack">
      <header className="adm-page-head">
        <h1 className="display">OBS 방송 카드</h1>
        <p className="muted">고른 사연을 방송 화면에 카드로 띄워요. 본문은 나오지 않고 이름, 나이·성별, 한 줄 요약, 우표, 목소리만 보여요.</p>
      </header>

      <section className="adm-panel" aria-label="지금 방송 카드">
        <h2 className="adm-h3">지금 화면</h2>
        {state ? (
          <>
            <p className="adm-obs-now">
              {state.story_id && state.stories && !state.hidden ? (
                <>
                  <span className="chip chip-red">방송 중</span> #{state.stories.receipt_no} {state.stories.summary}
                  {state.revealed && <span className="chip chip-yellow">동물 공개됨</span>}
                </>
              ) : (
                <span className="chip">카드 숨김</span>
              )}
            </p>
            <div className="row">
              <button className="btn" disabled={!state.story_id || !state.hidden} onClick={() => op({ op: "show", id: state.story_id }, "카드를 다시 보여줘요")}>
                카드 보이기
              </button>
              <button className="btn" disabled={state.hidden} onClick={() => op({ op: "hide" }, "카드를 숨겼어요")}>
                카드 숨기기
              </button>
              <button className="btn btn-blue" disabled={state.hidden || !state.story_id || state.revealed} onClick={() => op({ op: "reveal" }, "고민 동물을 공개했어요")}>
                고민 동물 공개
              </button>
              <button className="btn btn-ghost" disabled={!state.revealed} onClick={() => op({ op: "unreveal" }, "공개를 취소했어요")}>
                공개 취소
              </button>
            </div>
            <p className="faint">다른 사연을 띄우려면 사연함이나 사연 뽑기에서 "OBS에 띄우기"를 누르세요. 바뀐 내용은 몇 초 안에 방송 화면에 반영돼요.</p>
          </>
        ) : (
          <p className="faint">불러오는 중…</p>
        )}
      </section>

      {isOwner ? (
        <section className="adm-panel" aria-label="OBS 주소">
          <h2 className="adm-h3">OBS에 넣을 주소</h2>
          {key ? (
            <>
              <div className="adm-url">
                <code>{showKey ? url : masked}</code>
                <button className="btn btn-sm" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? "가리기" : "보기"}
                </button>
                <button className="btn btn-sm btn-primary" onClick={async () => toast((await copyText(url)) ? "주소를 복사했어요" : "복사하지 못했어요. 직접 선택해서 복사해 주세요")}>
                  복사
                </button>
              </div>
              <p className="notice notice-yellow">이 주소를 아는 사람은 방송 카드를 볼 수 있어요. 화면 공유 중에 주소가 보였다면 새 주소를 만들어 주세요.</p>
              <button className="btn btn-sm" onClick={() => setConfirmRotate(true)}>
                새 주소 만들기 (예전 주소는 바로 막혀요)
              </button>
              <div className="adm-obs-preview" aria-label="미리보기">
                <iframe title="OBS 카드 미리보기" src={url} loading="lazy" />
              </div>
            </>
          ) : (
            <>
              <p>아직 OBS 주소가 없어요.</p>
              <button className="btn btn-primary" onClick={rotate}>
                OBS 주소 만들기
              </button>
            </>
          )}
          <ObsHowTo />
        </section>
      ) : (
        <p className="faint">OBS 주소는 방장만 볼 수 있어요.</p>
      )}

      {confirmRotate && (
        <Dialog title="새 OBS 주소를 만들까요?" onClose={() => setConfirmRotate(false)}>
          <p>지금 OBS에 넣어둔 주소는 바로 동작하지 않게 돼요. 새 주소를 복사해서 OBS 브라우저 소스에 다시 넣어주세요.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirmRotate(false)}>
              취소
            </button>
            <button className="btn btn-danger" onClick={rotate}>
              새 주소 만들기
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function ObsHowTo() {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details className="adm-howto" ref={ref}>
      <summary>OBS에 넣는 방법</summary>
      <ol>
        <li>OBS에서 장면의 소스 목록 아래 + 버튼 → "브라우저"를 고르세요.</li>
        <li>URL 칸에 위에서 복사한 주소를 붙여넣으세요.</li>
        <li>너비 1920, 높이 1080으로 정하세요. 배경은 투명이라 따로 설정할 필요 없어요.</li>
        <li>"OBS에서 오디오 제어" 등 나머지는 그대로 두고 확인을 누르세요.</li>
        <li>카드가 안 보이면 소스를 오른쪽 클릭 → "새로 고침"을 눌러보세요.</li>
      </ol>
    </details>
  );
}
