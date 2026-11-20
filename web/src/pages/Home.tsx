import { Link } from "react-router-dom";
import { useSite } from "../lib/site";
import CorkHome from "./CorkHome";
import { ReviewWall } from "../components/ReviewWall";

/** 오늘 날짜를 소인 형식으로 (2026.11.20) */
function postmarkDate() {
  const d = new Date(Date.now() + 9 * 3600_000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

const TRACK = [
  { code: "01", title: "사연 부치기", desc: "가입 없이 1분이면 보낼 수 있어요" },
  { code: "02", title: "고민 동물 결과", desc: "보내자마자 사연을 읽고 나만의 고민 동물을 알려줘요" },
  { code: "03", title: "검토", desc: "방송 전에 다웅이 한 통씩 확인해요" },
  { code: "04", title: "방송에서 개봉", desc: "도착한 순서대로 방송에서 읽고 다웅이 직접 풀어줘요. 읽힌 뒤엔 다시보기 링크가 도착해요" },
];

export default function Home() {
  const { info, session } = useSite();
  const count = info.week_count;

  if (info.preset === "cork") return <CorkHome info={info} loggedIn={!!session} />;

  return (
    <div className="post-home">
      <section className={`envelope ${info.accepting ? "" : "is-closed"}`} aria-labelledby="env-title">
        <div className="envelope-paper">
          <div className="env-top">
            <div className="env-from">
              <span className="env-label">보내는 사람</span>
              <span className="env-hand">고민 많은 시청자 여러분</span>
            </div>

            <div className="env-marks" aria-hidden="true">
              <div className="postmark">
                <svg viewBox="0 0 120 120" className="postmark-ring">
                  <defs>
                    <path id="pm-arc" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
                  </defs>
                  <circle cx="60" cy="60" r="56" />
                  <circle cx="60" cy="60" r="34" />
                  <text>
                    <textPath href="#pm-arc" startOffset="0">
                      다웅 우체국 · 이번 주 도착 · {postmarkDate()} ·
                    </textPath>
                  </text>
                </svg>
                <span className="postmark-num">{count}</span>
                <span className="postmark-unit">통</span>
              </div>
              <div className="stamp-big">
                <span className="stamp-big-k">이번 주 테마</span>
                <span className="stamp-big-t">{info.week_theme || "무엇이든"}</span>
                <span className="stamp-big-v">KOREA · 다웅</span>
              </div>
              <div className="cancel-lines" />
            </div>
          </div>

          <div className="env-body">
            <div className="airmail-tag">
              <span>PAR AVION</span>
              <span>항공 사연</span>
            </div>
            <div className="env-to">
              <span className="env-label">받는 사람</span>
              <h1 id="env-title" className="env-name">
                {info.site_name}
              </h1>
              <p className="env-addr">{info.tagline}</p>
              <p className="env-addr env-addr-2">치지직 · 다웅 채널 내 상담소</p>
            </div>
          </div>

          <div className="env-actions">
            {info.accepting ? (
              <Link to="/write" className="post-btn post-btn-main">
                사연 부치기
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
                </svg>
              </Link>
            ) : (
              <p className="closed-note" role="status">
                지금은 사연을 받지 않아요. 이미 보낸 사연은 언제든 조회할 수 있어요.
              </p>
            )}
            <Link to="/check" className="post-btn post-btn-sub">
              내 사연 조회
            </Link>
            <Link to={session ? "/me" : "/login"} className="post-link">
              {session ? "내 사연함" : "로그인하고 사연 모아두기"}
            </Link>
          </div>

          {!info.accepting && (
            <div className="closed-stamp" aria-hidden="true">
              접수 중단
            </div>
          )}
        </div>
      </section>

      <section className="tracking" aria-labelledby="track-title">
        <h2 id="track-title" className="tracking-title">
          사연 배송 조회 <span>방송에서 열리기까지</span>
        </h2>
        <ol className="track">
          {TRACK.map((t) => (
            <li key={t.code}>
              <span className="track-code">{t.code}</span>
              <span className="track-dot" aria-hidden="true" />
              <strong>{t.title}</strong>
              <p>{t.desc}</p>
            </li>
          ))}
        </ol>
        <p className="tracking-foot">
          지금 방송을 기다리는 사연 <b>{info.queue_count}</b>통 · 지금까지 방송에서 연 사연 <b>{info.total_aired}</b>통
        </p>
      </section>

      <ReviewWall />
    </div>
  );
}
