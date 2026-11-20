import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import "../styles/admin.css";
import { AdminProvider, errMsg, useAdmin } from "./api";
import { useSite } from "../lib/site";
import Review from "./Review";
import Broadcast from "./Broadcast";
import Stories from "./Stories";
import Stats from "./Stats";
import Settings from "./Settings";

export default function AdminApp() {
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}

function AdminShell() {
  const { session } = useAdmin();
  if (!session) return <AdminLogin />;
  return <AdminLayout />;
}

function AdminLogin() {
  const { login } = useAdmin();
  const { info } = useSite();
  const [password, setPassword] = useState("");
  const [noRemember, setNoRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(password, !noRemember);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm adm-login-wrap">
      <form className="adm-login" onSubmit={submit}>
        <p className="adm-eyebrow">{info.site_name}</p>
        <h1 className="adm-title">관리자 입장</h1>
        <div className="field">
          <label htmlFor="adm-pw">관리자 비밀번호 또는 매니저 코드</label>
          <input
            id="adm-pw"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={noRemember} onChange={(e) => setNoRemember(e.target.checked)} />
          <span>
            이 기기 기억 안 함
            <small>공용 PC라면 체크하세요. 브라우저를 닫으면 로그아웃돼요.</small>
          </span>
        </label>
        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={busy || !password}>
          {busy ? "확인 중…" : "들어가기"}
        </button>
        <p className="faint">로그인은 12시간 유지돼요. 5번 연속 틀리면 10분 동안 잠겨요.</p>
      </form>
    </div>
  );
}

const NAV = [
  { to: "/admin", label: "검토 대기", end: true, badge: true },
  { to: "/admin/broadcast", label: "방송" },
  { to: "/admin/stories", label: "사연함" },
  { to: "/admin/stats", label: "통계", owner: true },
  { to: "/admin/settings", label: "설정", owner: true },
];

function AdminLayout() {
  const { role, isOwner, logout, call, pendingCount, setPendingCount } = useAdmin();
  const { info } = useSite();

  // 검토 대기 수: 들어올 때와 1분마다
  useEffect(() => {
    let alive = true;
    const load = () =>
      call<{ pending_count: number }>("queue")
        .then((r) => alive && setPendingCount(r.pending_count))
        .catch(() => {});
    load();
    const t = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [call, setPendingCount]);

  return (
    <div className="adm">
      <a href="#adm-main" className="sr-only">
        본문으로 건너뛰기
      </a>
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-brand-name">{info.site_name}</span>
          <span className="adm-role">{role === "owner" ? "방장" : "매니저"}</span>
        </div>
        <nav className="adm-nav" aria-label="관리자 메뉴">
          {NAV.filter((n) => isOwner || !n.owner).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
              <span>{n.label}</span>
              {n.badge && pendingCount > 0 && (
                <span className="adm-nav-count" aria-label={`${pendingCount}개`}>
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="adm-side-foot">
          <Link to="/" target="_blank" rel="noreferrer">
            사이트 보기
          </Link>
          <button className="adm-linkbtn" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>
      <main id="adm-main" className="adm-main">
        {!info.accepting && (
          <p className="adm-banner" role="status">
            지금 사연 접수가 멈춰 있어요. {isOwner && <Link to="/admin/settings">설정에서 다시 열기</Link>}
          </p>
        )}
        <Routes>
          <Route index element={<Review />} />
          <Route path="broadcast" element={<Broadcast />} />
          <Route path="stories" element={<Stories />} />
          <Route path="stories/:id" element={<Stories />} />
          <Route path="stats" element={isOwner ? <Stats /> : <OwnerOnly />} />
          <Route path="settings" element={isOwner ? <Settings /> : <OwnerOnly />} />
          <Route path="*" element={<OwnerOnly text="없는 메뉴예요." />} />
        </Routes>
      </main>
    </div>
  );
}

function OwnerOnly({ text = "방장만 볼 수 있는 메뉴예요." }: { text?: string }) {
  return (
    <div className="adm-panel">
      <p>{text}</p>
    </div>
  );
}
