import { useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import "../styles/admin.css";
import { AdminProvider, errMsg, useAdmin } from "./api";
import { useSite } from "../lib/site";
import Stories from "./Stories";
import Waiting from "./Waiting";
import Picker from "./Picker";
import ObsControl from "./ObsControl";
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
      <form className="adm-login adm-panel" onSubmit={submit}>
        <p className="adm-eyebrow">{info.site_name}</p>
        <h1 className="display">관리자 입장</h1>
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
        <p className="faint">로그인하면 12시간 동안 유지돼요. 5번 연속 틀리면 10분 동안 잠겨요.</p>
      </form>
    </div>
  );
}

const NAV = [
  { to: "/admin", label: "사연함", end: true },
  { to: "/admin/waiting", label: "답장 대기" },
  { to: "/admin/pick", label: "사연 뽑기" },
  { to: "/admin/obs", label: "OBS 카드" },
  { to: "/admin/stats", label: "통계", owner: true },
  { to: "/admin/settings", label: "설정", owner: true },
];

function AdminLayout() {
  const { role, isOwner, logout } = useAdmin();
  const { info } = useSite();
  return (
    <div className="adm">
      <a href="#adm-main" className="sr-only">
        본문으로 건너뛰기
      </a>
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="display">{info.site_name}</span>
          <span className={`adm-role ${role}`}>{role === "owner" ? "방장" : "매니저"}</span>
        </div>
        <nav className="adm-nav" aria-label="관리자 메뉴">
          {NAV.filter((n) => isOwner || !n.owner).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="adm-side-foot">
          <Link to="/" className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer">
            사이트 보기
          </Link>
          <button className="btn btn-sm" onClick={logout}>
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
          <Route index element={<Stories />} />
          <Route path="s/:id" element={<Stories />} />
          <Route path="waiting" element={<Waiting />} />
          <Route path="pick" element={<Picker />} />
          <Route path="obs" element={<ObsControl />} />
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
