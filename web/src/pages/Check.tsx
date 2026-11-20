import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, callFn, store } from "../lib/supabase";

export const CREDS_KEY = "dg.creds";
export type Creds = { receipt_no: number; code: string };

export default function Check() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [no, setNo] = useState(params.get("no") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const receipt = Number(no.replace(/[^\d]/g, ""));
    if (!receipt || code.replace(/[^A-Za-z0-9]/g, "").length < 6) {
      setError("접수번호와 비밀 코드를 모두 넣어주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await callFn("public", { action: "lookup", receipt_no: receipt, code });
      store.set(CREDS_KEY, { receipt_no: receipt, code }, true);
      navigate(`/story/${receipt}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "확인하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-narrow">
      <form className="card pinned stack check-form" onSubmit={submit} noValidate>
        <h1 className="display" style={{ fontSize: 30 }}>
          내 사연 조회
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          사연을 보낼 때 받은 접수번호와 비밀 코드를 넣으면 내 고민 동물 결과와 방송 여부를 볼 수 있어요.
        </p>
        <div className="field">
          <label htmlFor="no">접수번호</label>
          <input
            id="no"
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="예) 127"
            value={no}
            onChange={(e) => setNo(e.target.value)}
            autoFocus={!params.get("no")}
          />
        </div>
        <div className="field">
          <label htmlFor="code">비밀 코드</label>
          <input
            id="code"
            className="input code-input"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="예) 7K2P-9XQM"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus={!!params.get("no")}
          />
        </div>
        {error && (
          <p className="notice notice-danger" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "확인하는 중…" : "조회하기"}
        </button>
        <p className="faint" style={{ margin: 0 }}>
          로그인해서 보낸 사연은 <a href="/me">내 사연함</a>에서 바로 볼 수 있어요.
        </p>
      </form>
    </div>
  );
}
