import { Link } from "react-router-dom";
import type { HomeInfo } from "../lib/site";
import { AnimalCard } from "../components/AnimalCard";
import { ReviewWall } from "../components/ReviewWall";
import { ChannelButtons } from "../components/Channels";

/** 누구나 부담 없이 붙일 수 있다는 걸 보여주는 예시 쪽지 (실제 사연 아님) */
const NOTES = [
  "시험 망했는데\n엄마한테 뭐라 하지",
  "단톡방에서\n나만 빼고 약속 잡음",
  "썸인지 아닌지\n모르겠어요ㅠ",
  "하고 싶은 게\n없어서 불안해",
  "반 바뀌고\n친구가 없어요",
  "그냥 다\n귀찮은 요즘",
];

const STEPS = [
  { n: "1", title: "쪽지 붙이기", desc: "1분이면 끝, 이름 없이 OK" },
  { n: "2", title: "고민 동물 사진", desc: "붙이자마자 내 고민 동물이 나와요" },
  { n: "3", title: "방송에서 같이 이야기", desc: "다웅이 읽고 채팅이랑 함께 풀어요" },
];

const SAMPLE = {
  name: "곱씹는 라쿤",
  emoji: "🦝",
  why: "같은 장면을 머릿속에서 계속 씻고 또 씻는 중이라서",
  description: "그만큼 신중하고 책임감이 강하다는 뜻이기도 해요.",
  quote: "근데 그때 내가 이렇게 말했으면…?",
  hashtags: ["#생각많음", "#곱씹기장인", "#새벽재생"],
};

/** 코르크 보드 첫 화면 (기본 디자인): 교실 뒤 게시판에 붙인 고민 모집 포스터 + 포스트잇 쪽지 + 폴라로이드 */
export default function CorkHome({ info, loggedIn }: { info: HomeInfo; loggedIn: boolean }) {
  return (
    <div className="cb-home">
      <div className="cb-top">
        <section className="cb-poster" aria-labelledby="cb-title">
          <span className="cb-tape cb-tape-l" aria-hidden="true" />
          <span className="cb-tape cb-tape-r" aria-hidden="true" />
          <p className="cb-kicker">{info.accepting ? "고민 모집 중 · 익명 OK" : "지금은 잠깐 쉬는 중"}</p>
          <h1 id="cb-title">
            시험, 친구, 썸, 진로…
            <br />
            <mark>뭐든 붙이고 가요</mark>
          </h1>
          <p className="cb-lead">학교에서 말 못 한 거, 여기선 이름 없이 괜찮아요. 다웅이 방송에서 읽고 같이 고민해 줄게요.</p>
          <p className="cb-sign">— 오늘도 고생했어</p>
          {info.week_theme && (
            <p className="cb-theme">
              <span>이번 주 테마</span> {info.week_theme}
            </p>
          )}
          <div className="cb-cta">
            {info.accepting ? (
              <Link to="/write" className="cb-btn cb-btn-main">
                <span>고민 쪽지 붙이기</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <p className="cb-closed" role="status">
                지금은 쪽지를 받지 않아요. 붙인 쪽지는 언제든 볼 수 있어요.
              </p>
            )}
            <Link to="/check" className="cb-btn cb-btn-sub">
              <span>내 쪽지 어떻게 됐을까</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ChannelButtons className="cb-channels" lead={info.on_air ? "지금 방송에서 쪽지 읽는 중!" : "쪽지는 방송에서 읽어요"} />
          <p className="cb-login">
            <Link to={loggedIn ? "/me" : "/login"}>{loggedIn ? "내 사연함 보기" : "만 14세 이상은 로그인하면 붙인 쪽지를 한곳에 모아둘 수 있어요"}</Link>
          </p>
        </section>

        <aside className="cb-sample" aria-label="쪽지를 붙이면 받는 고민 동물 카드 예시">
          <div className="cb-polaroid" aria-hidden="true">
            <AnimalCard animal={SAMPLE} revealed serial={34} stamp="worry" siteName={info.site_name} date="예시" />
          </div>
          <p className="cb-sample-cap">쪽지를 붙이면 내 고민 동물 사진이 바로 나와요</p>
        </aside>
      </div>

      <section className="cb-notes-wrap" aria-labelledby="cb-notes-title">
        <h2 id="cb-notes-title" className="cb-label">
          이런 고민도 다 붙어 있어요
        </h2>
        <ul className="cb-notes">
          {NOTES.map((n, i) => (
            <li key={n} className={`cb-note cb-note-${i % 6}`}>
              {n}
            </li>
          ))}
        </ul>
      </section>

      <ol className="cb-steps" aria-label="쪽지가 방송까지 가는 길">
        {STEPS.map((s) => (
          <li key={s.n}>
            <span className="cb-pin" aria-hidden="true" />
            <b>{s.n}</b>
            <strong>{s.title}</strong>
            <span>{s.desc}</span>
          </li>
        ))}
      </ol>

      <p className="cb-count">
        이번 주 붙은 쪽지 <b>{info.week_count}</b>장 · 방송에서 같이 읽은 쪽지 <b>{info.total_aired}</b>장
      </p>

      <ReviewWall />
    </div>
  );
}
