import { Link } from "react-router-dom";
import type { HomeInfo } from "../lib/site";
import { AnimalCard } from "../components/AnimalCard";
import { ReviewWall } from "../components/ReviewWall";
import { ChannelButtons } from "../components/Channels";

const STEPS = [
  { n: "01", title: "1분이면 사연 접수", desc: "이름 없이 보내도 괜찮아요" },
  { n: "02", title: "바로 받는 고민 동물", desc: "내 고민이 어떤 동물을 닮았는지" },
  { n: "03", title: "방송에서 같이 이야기", desc: "다웅이 읽고, 채팅이랑 함께 풀어요" },
];

/** 누구나 부담 없이 꺼낼 수 있다는 걸 보여주는 예시 고민 */
const EXAMPLES = ["오늘 점심 뭐 먹지", "썸인지 아닌지", "진로가 막막해요", "부모님이랑 다퉜어요", "팀장님이 무서워요", "그냥 좀 지쳤어요"];

const SAMPLE = {
  name: "곱씹는 라쿤",
  emoji: "🦝",
  why: "같은 장면을 머릿속에서 계속 씻고 또 씻는 중이라서",
  description: "그만큼 신중하고 책임감이 강하다는 뜻이기도 해요.",
  quote: "근데 그때 내가 이렇게 말했으면…?",
  hashtags: ["#생각많음", "#곱씹기장인", "#새벽재생"],
};

/** 기본 디자인 "동네 고민 상담소" 첫 화면 */
export default function LoungeHome({ info, loggedIn }: { info: HomeInfo; loggedIn: boolean }) {
  return (
    <div className="lg-home">
      <div className="lg-top">
        <section className="lg-hero" aria-labelledby="lg-title">
          <div className="lg-sun" aria-hidden="true" />
          <div className="lg-pills">
            <span className={`lg-open ${info.accepting ? "" : "is-closed"}`}>
              <i aria-hidden="true" />
              {info.accepting ? "사연 받는 중" : "지금은 잠깐 쉬는 중"}
            </span>
            {info.week_theme && <span className="lg-theme">이번 주 이야기 · {info.week_theme}</span>}
          </div>
          <h1 id="lg-title">
            어떤 고민이든,
            <br />
            <u>여기 두고 가세요</u>
          </h1>
          <p className="lg-lead">
            나이도, 고민 크기도 상관없어요. 이름 없이 보내도 괜찮아요.
            <br className="lg-br" /> 다웅이 방송에서 읽고 같이 이야기해요.
          </p>
          <p className="lg-hand">— 오늘도 고생 많았어요</p>

          <div className="lg-cta">
            {info.accepting ? (
              <Link to="/write" className="lg-btn lg-btn-main">
                <span>고민 털어놓기</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <p className="lg-closed" role="status">
                지금은 사연을 받지 않아요. 보낸 사연은 언제든 볼 수 있어요.
              </p>
            )}
            <Link to="/check" className="lg-btn lg-btn-sub">
              <span>내 사연 어떻게 됐을까</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ChannelButtons className="lg-channels" lead={info.on_air ? "지금 방송에서 사연 읽는 중!" : "사연은 방송에서 읽어요"} />
          <p className="lg-login">
            <Link to={loggedIn ? "/me" : "/login"}>{loggedIn ? "내 사연함 보기" : "로그인하면 보낸 사연을 한곳에 모아둘 수 있어요"}</Link>
          </p>
        </section>

        <aside className="lg-sample" aria-label="보내면 받는 고민 동물 카드 예시">
          <p className="lg-sample-label">보내면 바로 이런 카드를 받아요</p>
          <div className="lg-sample-card" aria-hidden="true">
            <AnimalCard animal={SAMPLE} revealed serial={34} stamp="worry" siteName={info.site_name} date="예시" />
          </div>
        </aside>
      </div>

      <section className="lg-examples" aria-labelledby="lg-ex-title">
        <h2 id="lg-ex-title">이런 고민도 괜찮아요</h2>
        <ul>
          {EXAMPLES.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </section>

      <ol className="lg-steps" aria-label="사연이 방송까지 가는 길">
        {STEPS.map((s) => (
          <li key={s.n}>
            <b>{s.n}</b>
            <strong>{s.title}</strong>
            <span>{s.desc}</span>
          </li>
        ))}
      </ol>

      <p className="lg-count">
        이번 주 도착한 사연 <b>{info.week_count}</b>통 · 방송에서 함께 나눈 이야기 <b>{info.total_aired}</b>통
      </p>

      <ReviewWall />
    </div>
  );
}
