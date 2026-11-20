import { useSite } from "../lib/site";
import { trackOut } from "../lib/growth";

function ChzzkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#00ffa3" />
      <path d="M7 8h10l-6 8h6" fill="none" stroke="#111" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 28 20" aria-hidden="true">
      <rect width="28" height="20" rx="5" fill="#ff0033" />
      <path d="M11 5.5v9l8-4.5z" fill="#fff" />
    </svg>
  );
}

/**
 * 내 채널 버튼 (치지직·유튜브). 관리자 설정에 주소가 있을 때만 보여요.
 *  - lead: 버튼 위 한 줄 (예: "읽히는 순간 같이 봐요")
 *  - compact: 작게 (바닥글 등)
 */
export function ChannelButtons({ lead, compact = false, className = "" }: { lead?: string; compact?: boolean; className?: string }) {
  const { info } = useSite();
  const hasLinks = !!(info.chzzk_url || info.youtube_url);
  // 채널 주소가 없어도 방송 시간은 보여줘요
  if (!hasLinks && !info.schedule_text) return null;
  return (
    <div className={`ch-box ${compact ? "is-compact" : ""} ${className}`}>
      {(lead || info.schedule_text) && (
        <p className="ch-lead">
          {lead}
          {lead && info.schedule_text ? " · " : ""}
          {info.schedule_text && <b>{info.schedule_text}</b>}
        </p>
      )}
      {hasLinks && <div className="ch-row">
        {info.chzzk_url && (
          <a className="ch-btn ch-chzzk" href={info.chzzk_url} target="_blank" rel="noopener noreferrer" onClick={() => trackOut("chzzk")}>
            <ChzzkIcon />
            <span>{info.on_air ? "지금 라이브 보기" : "치지직 팔로우"}</span>
            {info.on_air && <i className="ch-live-dot" aria-label="방송 중" />}
          </a>
        )}
        {info.youtube_url && (
          <a className="ch-btn ch-youtube" href={info.youtube_url} target="_blank" rel="noopener noreferrer" onClick={() => trackOut("youtube")}>
            <YoutubeIcon />
            <span>유튜브 구독</span>
          </a>
        )}
      </div>}
    </div>
  );
}

/** 관리자가 "방송 시작"을 눌렀을 때 모든 시청자 화면 위에 뜨는 띠 */
export function LiveBanner() {
  const { info } = useSite();
  if (!info.on_air || !info.chzzk_url) return null;
  return (
    <a className="live-banner" href={info.chzzk_url} target="_blank" rel="noopener noreferrer" onClick={() => trackOut("chzzk")}>
      <i className="live-dot" aria-hidden="true" />
      <b>지금 방송 중!</b>
      <span>사연 읽는 중이에요. 치지직에서 같이 보기 →</span>
    </a>
  );
}

/** 모든 시청자 화면 아래: 상담 연락처만 (채널 버튼은 첫 화면과 사연 제출 완료 화면에만) */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-help">힘든 일이 있다면 청소년상담 1388 (문자 #1388) · 학교폭력 117</p>
    </footer>
  );
}
