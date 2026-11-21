import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase, store, PENDING_CLAIMS, type PendingClaim } from "../lib/supabase";
import { useSite } from "../lib/site";

type Provider = "kakao" | "google";

export default function Login() {
  const { session } = useSite();
  const [params] = useSearchParams();
  const next = params.get("next") || "/me";
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const pending = store.get<PendingClaim[]>(PENDING_CLAIMS, []);

  if (session) return <Navigate to={next} replace />;

  const login = async (provider: Provider) => {
    setBusy(provider);
    setError("");
    store.set("dg.next", next, true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(null);
      setError("로그인 창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div className="page-narrow">
      <div className="card pinned stack login-card">
        <h1 className="display" style={{ fontSize: 30 }}>
          로그인
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          로그인하면 내가 보낸 사연과 고민 동물 도감, 방송 진행 상황을 어디서든 볼 수 있어요. 휴대폰과 PC 어느 쪽에서 봐도 같은 내 사연함이 보여요.
        </p>
        {pending.length > 0 && (
          <p className="notice notice-yellow" style={{ margin: 0 }}>
            로그인하면 방금 보낸 사연 {pending.length}개를 내 사연함으로 옮겨드려요.
          </p>
        )}
        <button type="button" className="btn btn-lg btn-block btn-kakao" onClick={() => login("kakao")} disabled={!!busy}>
          <KakaoIcon /> {busy === "kakao" ? "카카오로 이동 중…" : "카카오로 시작하기"}
        </button>
        <button type="button" className="btn btn-lg btn-block btn-google" onClick={() => login("google")} disabled={!!busy}>
          <GoogleIcon /> {busy === "google" ? "구글로 이동 중…" : "구글로 시작하기"}
        </button>
        {error && (
          <p className="notice notice-danger" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <p className="faint" style={{ margin: 0 }}>
          사이트에는 이메일을 따로 저장하지 않아요. 로그인 없이도 사연은 보낼 수 있어요.
          <br />
          로그인은 만 14세 이상만 할 수 있어요. 만 14세 미만이라면 로그인 없이 보내고, 접수번호와 비밀 코드로 확인해 주세요.
          <br />
          <Link to="/privacy">개인정보처리방침</Link>
        </p>
      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#191919" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
