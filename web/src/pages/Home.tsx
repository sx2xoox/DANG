import { Link } from "react-router-dom";
import { useSite } from "../lib/site";
import { MailIcon } from "../components/ui";

export default function Home() {
  const { info, session } = useSite();
  return (
    <div className="page home">
      <section className="home-hero card pinned">
        <div className="home-hero-text">
          {info.week_theme && (
            <p className="home-theme">
              <span className="chip chip-red">이번 주 테마</span>
              <strong>{info.week_theme}</strong>
            </p>
          )}
          <h1 className="display home-title">{info.site_name}</h1>
          <p className="home-tagline">{info.tagline}</p>

          {info.accepting ? (
            <Link to="/write" className="btn btn-primary btn-lg home-cta">
              <MailIcon size={24} />
              사연 보내기
            </Link>
          ) : (
            <div className="notice notice-yellow home-closed" role="status">
              <strong>지금은 사연을 받지 않아요.</strong>
              <br />
              다음 접수 때 다시 와주세요. 이미 보낸 사연의 답장은 언제든 확인할 수 있어요.
            </div>
          )}

          <div className="home-sub-actions">
            <Link to="/check" className="btn">
              답장 확인하기
            </Link>
            {session ? (
              <Link to="/me" className="btn btn-ghost">
                내 사연함
              </Link>
            ) : (
              <Link to="/login" className="btn btn-ghost">
                로그인하고 사연 모아보기
              </Link>
            )}
          </div>
        </div>

        <div className="home-art" aria-hidden="true">
          <HomeArt count={info.week_count} />
        </div>
      </section>

      <section className="home-stats" aria-label="대기 현황">
        <div className="card stat">
          <span className="faint">이번 주 들어온 사연</span>
          <strong className="display">{info.week_count}개</strong>
        </div>
        <div className="card stat">
          <span className="faint">지금까지 보낸 답장</span>
          <strong className="display">{info.total_replied}통</strong>
        </div>
      </section>

      <section className="home-how card">
        <h2 className="display">이렇게 진행돼요</h2>
        <ol className="how-steps">
          <li>
            <span className="how-n">1</span>
            <div>
              <strong>사연 보내기</strong>
              <p className="muted">가입 없이도 1분이면 보낼 수 있어요.</p>
            </div>
          </li>
          <li>
            <span className="how-n">2</span>
            <div>
              <strong>방송에서 다웅이 읽어요</strong>
              <p className="muted">원하면 방송에서 읽지 않고 답장만 받을 수도 있어요.</p>
            </div>
          </li>
          <li>
            <span className="how-n">3</span>
            <div>
              <strong>답장과 고민 동물 도착</strong>
              <p className="muted">다웅의 답장과 함께 나만의 고민 동물 카드가 공개돼요.</p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}

/** 첫 화면 그림: 프리셋마다 모양이 바뀝니다 (봉투/포스트잇/캡슐) */
function HomeArt({ count }: { count: number }) {
  const shown = Math.min(Math.max(count, 3), 9);
  return (
    <div className="home-pile">
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          className="pile-item"
          style={{
            ["--i" as string]: i,
            ["--r" as string]: `${((i * 47) % 13) - 6}deg`,
            // 코르크/캡슐 프리셋에서 흩어 놓을 위치 (%)
            ["--x" as string]: (i * 37) % 70,
            ["--y" as string]: (i * 23) % 60,
            ["--gx" as string]: (i * 29) % 64,
            ["--gy" as string]: (i * 17) % 40,
          }}
        />
      ))}
    </div>
  );
}
