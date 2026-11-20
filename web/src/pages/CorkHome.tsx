import { Link } from "react-router-dom";
import type { HomeInfo } from "../lib/site";
import { ReviewWall } from "../components/ReviewWall";

const STEPS = [
  { n: "1", title: "사연 붙이기", desc: "가입 없이 1분이면 끝" },
  { n: "2", title: "고민 동물 결과", desc: "붙이자마자 나만의 고민 동물이 나와요" },
  { n: "3", title: "검토", desc: "방송 전에 다웅이 한 장씩 확인해요" },
  { n: "4", title: "방송에서 개봉", desc: "붙은 순서대로 떼어 읽고 다웅이 직접 풀어줘요. 다시보기 링크도 와요" },
];

const NOTE_COLORS = ["#ffe58a", "#ffc2d1", "#bfe3f5", "#cdedb4", "#dccbf3"];

/** 코르크 보드 프리셋 첫 화면: 사연 모집 전단지 + 포스트잇 + 실로 이은 인덱스 카드 */
export default function CorkHome({ info, loggedIn }: { info: HomeInfo; loggedIn: boolean }) {
  const count = info.week_count;
  const fives = Math.min(6, Math.floor(count / 5));
  const notes = Math.min(Math.max(count, 3), 10);

  return (
    <div className="cork-home">
      <div className="cork-top">
        {/* 사연 모집 전단지 */}
        <section className={`flyer ${info.accepting ? "" : "is-closed"}`} aria-labelledby="flyer-title">
          <span className="tape tape-l" aria-hidden="true" />
          <span className="tape tape-r" aria-hidden="true" />
          <div className="flyer-body">
            <p className="flyer-kicker">고민 사연 모집</p>
            <h1 id="flyer-title" className="flyer-title">
              {info.site_name}
            </h1>
            <p className="flyer-tagline">{info.tagline}</p>
            <ul className="flyer-points">
              <li>방송에서 다웅이 직접 읽어드려요</li>
              <li>보내자마자 나만의 고민 동물 결과가 나와요</li>
              <li>가입 없이 1분이면 끝</li>
            </ul>
            {info.accepting ? (
              <Link to="/write" className="flyer-cta">
                사연 붙이러 가기
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
                </svg>
              </Link>
            ) : (
              <p className="flyer-closed-note" role="status">
                지금은 사연을 받지 않아요. 보낸 사연은 아래에서 조회할 수 있어요.
              </p>
            )}
          </div>

          {/* 뜯어 가는 쪽지 */}
          <nav className="tabs-tear" aria-label="내 사연 조회">
            {Array.from({ length: 7 }).map((_, i) =>
              i === 2 ? (
                <span key={i} className="tear torn" aria-hidden="true" />
              ) : (
                <Link key={i} to="/check" className="tear" aria-label={i === 0 ? "내 사연 조회하기" : undefined} tabIndex={i === 0 ? 0 : -1} aria-hidden={i === 0 ? undefined : true}>
                  <span>사연 조회</span>
                  <small>접수번호+코드</small>
                </Link>
              ),
            )}
          </nav>

          {!info.accepting && (
            <div className="flyer-stamp" aria-hidden="true">
              모집 마감
            </div>
          )}
        </section>

        <aside className="cork-side" aria-label="이번 주 게시판">
          <div className="note note-theme pin">
            <span className="note-k">이번 주 테마</span>
            <strong>{info.week_theme || "아무 고민이나 환영"}</strong>
          </div>

          <div className="index-card pin">
            <span className="note-k">이번 주 붙은 사연</span>
            <div className="tally" aria-hidden="true">
              {"正".repeat(fives)}
            </div>
            <strong className="index-num">
              {count}
              <small>장</small>
            </strong>
          </div>

          <div className="mini-notes" aria-hidden="true">
            {Array.from({ length: notes }).map((_, i) => (
              <span
                key={i}
                className="mini-note"
                style={{
                  background: NOTE_COLORS[i % NOTE_COLORS.length],
                  left: `${(i * 37) % 72}%`,
                  top: `${(i * 23) % 58}%`,
                  transform: `rotate(${((i * 47) % 15) - 7}deg)`,
                }}
              />
            ))}
          </div>

          <Link to={loggedIn ? "/me" : "/login"} className="note note-small pin">
            {loggedIn ? "내 사연함 보러 가기 →" : "로그인하면 사연을 모아둘 수 있어요 →"}
          </Link>
        </aside>
      </div>

      {/* 빨간 실로 이은 진행 순서 */}
      <section className="string-board" aria-labelledby="sb-title">
        <h2 id="sb-title" className="sb-title">
          사연이 방송에 나가기까지
        </h2>
        <ol className="sb-cards">
          <svg className="sb-yarn" viewBox="0 0 1000 50" preserveAspectRatio="none" aria-hidden="true">
            <path d="M125,26 Q250,52 375,26 Q500,52 625,26 Q750,52 875,26" />
          </svg>
          {STEPS.map((s, i) => (
            <li key={s.n} className="sb-card" style={{ transform: `rotate(${[-2, 1.5, -1, 2][i]}deg)` }}>
              <span className="sb-pin" aria-hidden="true" />
              <span className="sb-n">{s.n}</span>
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </li>
          ))}
        </ol>
        <p className="sb-foot">
          방송을 기다리는 사연 <b>{info.queue_count}</b>장 · 방송에서 뗀 사연 <b>{info.total_aired}</b>장
        </p>
      </section>

      <ReviewWall />
    </div>
  );
}
