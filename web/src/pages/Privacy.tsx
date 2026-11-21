import { Link } from "react-router-dom";
import { useSite } from "../lib/site";

/** 개인정보처리방침 (구글 로그인 게시에 필요한 공개 주소: /privacy) */
export default function Privacy() {
  const { info } = useSite();
  return (
    <div className="page-narrow">
      <article className="card stack privacy-doc">
        <h1 className="display" style={{ fontSize: 30, margin: 0 }}>
          개인정보처리방침
        </h1>
        <p className="faint" style={{ margin: 0 }}>
          시행일: 2026년 11월 21일
        </p>
        <p style={{ margin: 0 }}>
          {info.site_name}(이하 "사연함")은 치지직 스트리머 다웅이 운영하는 고민 사연 접수 사이트예요. 사연함은 꼭 필요한 정보만 받고, 받은 정보는 아래 목적에만 써요.
        </p>

        <section>
          <h2>1. 받는 정보</h2>
          <ul>
            <li>
              <b>사연을 보낼 때:</b> 보내는 이름(치지직 닉네임 또는 익명 이름), 고민 내용(한 줄 요약, 본문), 고민 종류·온도·감정 우표 같은 선택 항목, 학년대, 원하는 경우 나이와 성별, 릴스·쇼츠 사용 동의 여부
            </li>
            <li>
              <b>카카오·구글로 로그인할 때:</b> 로그인 서비스가 주는 계정 식별값과 이메일(제공에 동의한 경우), 닉네임·프로필 사진 정보. 닉네임과 프로필 사진은 사이트 화면에 쓰지 않아요.
            </li>
            <li>
              <b>후기·후속 이야기를 남길 때:</b> 남긴 내용
            </li>
            <li>
              <b>황금 고민 동물 구독권을 신청할 때:</b> 구독권을 받을 치지직 닉네임
            </li>
            <li>
              <b>자동으로 만들어지는 정보:</b> 같은 사람의 도배를 막고 방문 수를 세기 위한 기기·접속 정보의 암호화된 값. 원래 값으로 되돌릴 수 없게 바꿔서 저장해요.
            </li>
          </ul>
        </section>

        <section>
          <h2>2. 쓰는 곳</h2>
          <ul>
            <li>사연 접수, 방송에서 사연 읽기, 고민 동물 결과 보여주기</li>
            <li>방송 결과·다시보기 링크, 후기, 고민 동물 도감 보여주기</li>
            <li>황금 고민 동물 구독권 지급</li>
            <li>도배·악용 막기, 어떤 홍보 영상으로 들어왔는지 세기</li>
          </ul>
        </section>

        <section>
          <h2>3. 방송과 영상</h2>
          <p>
            사연은 보낼 때 동의한 대로 방송에서 읽히고, 방송 다시보기에 남을 수 있어요. 릴스·쇼츠 영상에는 따로 동의한 사연만 쓰고, 이름은 빼요. 쇼츠 동의는 내 사연 화면에서 언제든 끌 수 있어요.
          </p>
        </section>

        <section>
          <h2>4. 보관 기간</h2>
          <ul>
            <li>사연과 고민 동물 결과: 직접 지울 때까지. 접수번호와 비밀 코드, 또는 내 사연함에서 언제든 지울 수 있어요.</li>
            <li>로그인 계정: 탈퇴할 때까지. 탈퇴하면 계정 정보는 바로 지우고, 원하면 사연도 같이 지워요.</li>
            <li>도배 막기 기록: 3일 뒤 자동 삭제</li>
            <li>방문 수 기록: 180일 뒤 자동 삭제</li>
          </ul>
        </section>

        <section>
          <h2>5. 맡기는 곳 (처리 위탁·국외 이전)</h2>
          <p>사연함을 운영하려고 아래 회사의 서비스를 써요. 정보는 이 서비스들을 거쳐 처리·저장돼요.</p>
          <ul>
            <li>
              <b>Supabase Inc.</b> (데이터 저장, 서버 위치: 싱가포르): 사연과 계정 정보 저장
            </li>
            <li>
              <b>Cloudflare, Inc.</b> (미국): 사이트 화면 전달
            </li>
            <li>
              <b>Anthropic PBC</b> (미국): 고민 동물 결과 만들기. 사연 내용을 AI 로 읽어 결과를 만들고, 이름·연락처처럼 보이는 부분은 가린 뒤 보내요.
            </li>
            <li>
              <b>카카오, Google</b>: 로그인
            </li>
          </ul>
        </section>

        <section>
          <h2>6. 만 14세 미만</h2>
          <p>
            만 14세 미만은 로그인할 수 없고, 로그인 없이 익명으로만 사연을 보낼 수 있어요. 사연에는 실명, 연락처, 주소, 학교·회사 이름을 쓰지 않도록 안내하고, 보내기 전에 한 번 더 확인해요.
          </p>
        </section>

        <section>
          <h2>7. 내 정보 보기·지우기</h2>
          <ul>
            <li>
              내 사연 보기·지우기: <Link to="/check">내 사연 조회</Link>(접수번호와 비밀 코드) 또는 <Link to="/me">내 사연함</Link>
            </li>
            <li>
              탈퇴: <Link to="/me/account">내 사연함 → 계정</Link>
            </li>
            <li>그 밖에 궁금한 점이나 요청은 아래 문의처로 알려 주세요.</li>
          </ul>
        </section>

        <section>
          <h2>8. 문의</h2>
          <p>
            개인정보 보호책임자: 운영자 다웅
            <br />
            문의:{" "}
            {info.chzzk_url ? (
              <a href={info.chzzk_url} target="_blank" rel="noopener noreferrer">
                치지직 채널
              </a>
            ) : (
              "치지직 채널"
            )}
          </p>
        </section>
      </article>
    </div>
  );
}
