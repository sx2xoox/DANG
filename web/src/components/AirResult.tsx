import { formatOffset } from "@shared/results.ts";
import { formatDate } from "../lib/format";
import type { AirResult } from "../lib/mystory";

/** 방송 결과: "방송에서 읽었어요!" + 방송 날짜 + 다시보기 링크(읽기 시작한 시간부터) + 다웅의 한마디(선택) */
export function AirResultCard({ result }: { result: AirResult }) {
  const at = formatOffset(result.vod_offset_sec);
  return (
    <section className="air-result" aria-labelledby="air-title">
      <div className="air-badge" aria-hidden="true">
        ON AIR
      </div>
      <div className="air-main">
        <h2 id="air-title">방송에서 읽었어요!</h2>
        {result.aired_at && <p className="air-date">{formatDate(result.aired_at)} 방송</p>}
        {result.vod_url ? (
          <a className="post-btn post-btn-main air-vod" href={result.vod_url} target="_blank" rel="noopener noreferrer">
            ▶ 다시보기{at ? ` · ${at}부터` : ""}
          </a>
        ) : (
          <p className="air-novod">다시보기 링크는 아직 준비 중이에요.</p>
        )}
        {result.vod_url && at && <p className="air-hint">링크가 처음부터 열리면 {at} 지점으로 옮겨서 보세요.</p>}
        {result.host_note && (
          <blockquote className="air-note">
            <span className="air-note-who">다웅의 한마디</span>
            <p>{result.host_note}</p>
          </blockquote>
        )}
      </div>
    </section>
  );
}

/** "확인 필요" 사연에 다웅이 보낸 짧은 개인 메시지 */
export function PrivateMessage({ text }: { text: string }) {
  return (
    <section className="private-msg" aria-label="다웅이 보낸 메시지">
      <h2>다웅이 보낸 메시지</h2>
      <p>{text}</p>
    </section>
  );
}
