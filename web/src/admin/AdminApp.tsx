import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import "../styles/admin.css";
import { AdminProvider, errMsg, useAdmin } from "./api";
import { useSite } from "../lib/site";
import Review from "./Review";
import Broadcast from "./Broadcast";
import Stories from "./Stories";
import Stats from "./Stats";
import Settings from "./Settings";
import Wrapup from "./Wrapup";
import Reviews from "./Reviews";
import After from "./After";
import Golden from "./Golden";
import Mascots from "./Mascots";
import { formatDate } from "../lib/format";
import { HELP_LINES } from "@shared/boxes.ts";

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

type NavItem = { to: string; label: string; end?: boolean; owner?: boolean; badge?: "pending" | "reviews" | "golden" };

const NAV: NavItem[] = [
  { to: "/admin", label: "검토 대기", end: true, badge: "pending" },
  { to: "/admin/broadcast", label: "방송" },
  { to: "/admin/wrapup", label: "오늘 방송 정리", owner: true },
  { to: "/admin/stories", label: "사연함" },
  { to: "/admin/reviews", label: "상담 후기", badge: "reviews" },
  { to: "/admin/after", label: "그 후 이야기" },
  { to: "/admin/golden", label: "황금 동물", owner: true, badge: "golden" },
  { to: "/admin/mascots", label: "캐릭터" },
  { to: "/admin/stats", label: "통계", owner: true },
  { to: "/admin/settings", label: "설정", owner: true },
];

function AdminLayout() {
  const { role, isOwner, logout, call, alerts, refreshAlerts } = useAdmin();
  const [careAll, setCareAll] = useState(false);
  const { info } = useSite();

  // 메뉴 배지와 알림: 들어올 때와 1분마다
  useEffect(() => {
    refreshAlerts();
    const t = window.setInterval(refreshAlerts, 60_000);
    return () => window.clearInterval(t);
  }, [refreshAlerts]);

  // 휴대폰에서는 메뉴가 가로로 넘어가니, 지금 메뉴가 보이도록 옮겨둡니다.
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector(".adm-nav .is-active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  const badge = (b?: NavItem["badge"]) =>
    b === "pending" ? alerts.pending_count : b === "reviews" ? alerts.new_reviews : b === "golden" ? alerts.golden_waiting : 0;

  const checkFollowUp = async (id: string) => {
    try {
      await call("followup_check", { id });
    } finally {
      await refreshAlerts();
    }
  };

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
          {NAV.filter((n) => isOwner || !n.owner).map((n) => {
            const c = badge(n.badge);
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
                <span>{n.label}</span>
                {c > 0 && (
                  <span className="adm-nav-count" aria-label={`${c}개`}>
                    {c}
                  </span>
                )}
              </NavLink>
            );
          })}
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
        {alerts.care_followups.length > 0 && (
          <section className="adm-alert-care" role="alert" aria-label="확인 필요 후속 보고">
            <p className="adm-alert-title">
              <b>확인 필요</b> 후속 보고에 자해·자살·학대·폭력 관련 표현이 있어요 ({alerts.care_followups.length}개). 사연자에게는 상담 연락처를 안내했어요.
            </p>
            <ul>
              {(careAll ? alerts.care_followups : alerts.care_followups.slice(0, 3)).map((f) => (
                <li key={f.id}>
                  <Link to={`/admin/stories/${f.story_id}`} className="adm-no">
                    #{f.receipt_no}
                  </Link>
                  <span className="adm-alert-body">{f.body}</span>
                  <span className="adm-dim adm-small">{formatDate(f.created_at, true)}</span>
                  {isOwner && (
                    <button className="btn btn-sm" onClick={() => checkFollowUp(f.id)}>
                      확인했어요
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {alerts.care_followups.length > 3 && (
              <button type="button" className="btn btn-sm adm-alert-more" onClick={() => setCareAll((v) => !v)} aria-expanded={careAll}>
                {careAll ? "접기 ▲" : `나머지 ${alerts.care_followups.length - 3}개 더 보기 ▼`}
              </button>
            )}
            <p className="adm-dim adm-small">{HELP_LINES.map((h) => `${h.name} ${h.tel}`).join(" · ")}</p>
          </section>
        )}
        {!info.accepting && (
          <p className="adm-banner" role="status">
            지금 사연 접수가 멈춰 있어요. {isOwner && <Link to="/admin/settings">설정에서 다시 열기</Link>}
          </p>
        )}
        <Routes>
          <Route index element={<Review />} />
          <Route path="broadcast" element={<Broadcast />} />
          <Route path="wrapup" element={isOwner ? <Wrapup /> : <OwnerOnly />} />
          <Route path="stories" element={<Stories />} />
          <Route path="stories/:id" element={<Stories />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="after" element={<After />} />
          <Route path="golden" element={isOwner ? <Golden /> : <OwnerOnly />} />
          <Route path="mascots" element={<Mascots />} />
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
