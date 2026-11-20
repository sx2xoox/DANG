import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { runPendingClaims, store } from "../lib/supabase";
import { useSite } from "../lib/site";
import { Spinner, useToast } from "../components/ui";

export default function AuthCallback() {
  const { session, authReady } = useSite();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.slice(1));
    return p.get("error_description") || h.get("error_description") || "";
  });
  const done = useRef(false);

  useEffect(() => {
    if (!authReady || done.current) return;
    if (session) {
      done.current = true;
      const next = store.get<string>("dg.next", "/me", true);
      store.remove("dg.next", true);
      runPendingClaims().then((n) => {
        if (n > 0) toast(`사연 ${n}개를 내 사연함으로 옮겼어요`);
        navigate(next.startsWith("/") ? next : "/me", { replace: true });
      });
      return;
    }
    const t = window.setTimeout(() => {
      if (!done.current) setError("로그인을 끝내지 못했어요. 다시 시도해 주세요.");
    }, 10000);
    return () => window.clearTimeout(t);
  }, [authReady, session, navigate, toast]);

  if (error) {
    return (
      <div className="page-narrow">
        <div className="card stack">
          <p className="notice notice-danger" style={{ margin: 0 }}>
            {error}
          </p>
          <Link to="/login" className="btn">
            다시 로그인하기
          </Link>
        </div>
      </div>
    );
  }
  return <Spinner label="로그인하는 중" />;
}
