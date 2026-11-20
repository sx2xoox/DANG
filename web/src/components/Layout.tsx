import { Link, NavLink, Outlet } from "react-router-dom";
import { useSite } from "../lib/site";
import { MailIcon } from "./ui";

export function Layout() {
  const { info, session } = useSite();
  return (
    <>
      <a href="#main" className="sr-only">
        본문으로 건너뛰기
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand" aria-label={`${info.site_name} 첫 화면`}>
            <span className="brand-mark">
              <MailIcon />
            </span>
            <span>{info.site_name}</span>
          </Link>
          <nav className="header-nav" aria-label="주요 메뉴">
            <NavLink to="/check" className="btn btn-ghost btn-sm hide-xs">
              답장 확인
            </NavLink>
            {session ? (
              <NavLink to="/me" className="btn btn-sm">
                내 사연함
              </NavLink>
            ) : (
              <NavLink to="/login" className="btn btn-sm">
                로그인
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
    </>
  );
}
