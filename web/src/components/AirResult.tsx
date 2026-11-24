import { formatDate } from "../lib/format";
import { useSite } from "../lib/site";
import { trackOut } from "../lib/growth";
import type { AirResult } from "../lib/mystory";

/** 방송 결과: "방송에서 읽었어요!" + 방송 날짜 + 한마디(선택) + 유튜브 생방송 안내 */
export function AirResultCard({ result }: { result: AirResult }) {
  const { info } = useSite();
  return (
    <section className="air-result" aria-labelledby="air-title">
      <div className="air-badge" aria-hidden="true">
        ON AIR
      </div>
      <div className="air-main">
        <h2 id="air-title">방송에서 읽었어요!</h2>
        {result.aired_at && <p className="air-date">{formatDate(result.aired_at)} 방송</p>}
        {result.host_note && (
          <blockquote className="air-note">
            <span className="air-note-who">방송에서 남긴 한마디</span>
            <p>{result.host_note}</p>
          </blockquote>
        )}
        <p className="air-novod">사연은 유튜브 생방송에서 같이 들어요{info.schedule_text ? ` · ${info.schedule_text}` : ""}</p>
        {info.youtube_url && (
          <a className="post-btn post-btn-main air-vod" href={info.youtube_url} target="_blank" rel="noopener noreferrer" onClick={() => trackOut("youtube")}>
            ▶ 유튜브 생방송 보러 가기
          </a>
        )}
      </div>
    </section>
  );
}

/** "확인 필요" 사연에 다웅이 보낸 짧은 개인 메시지 */
export function PrivateMessage({ text }: { text: string }) {
  return (
    <section className="private-msg" aria-label="꼭 전하고 싶은 말">
      <h2>꼭 전하고 싶은 말</h2>
      <p>{text}</p>
    </section>
  );
}
