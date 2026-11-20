import { useRef, useState } from "react";
import { GOMIN, optionLabel, temperatureLabel } from "@shared/boxes.ts";
import { AnimalCard, useRevealOnce, type Animal } from "./AnimalCard";
import { StampSticker, temperatureColor, useToast } from "./ui";
import { formatDate, VIEWER_STATUS, WAITING_NOTICE } from "../lib/format";
import { saveNodeAsImage, shareNodeAsImage } from "../lib/image";

export type ResultStory = {
  id: string;
  receipt_no: number;
  summary: string;
  display_name: string;
  stamp: string;
  wish: string;
  category: string;
  temperature: number;
  created_at: string;
  viewer_status?: string;
};

function postDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * 고민 동물 결과 (MBTI 검사 결과처럼)
 * 처음 볼 때는 카드가 뒤집히며 공개되고, 한 번 본 결과는 바로 보여요.
 */
export type CardMarks = { aired?: boolean; reviewed?: boolean; golden?: boolean };

export function ResultView({ story, animal, siteName, marks = {} }: { story: ResultStory; animal: Animal; siteName: string; marks?: CardMarks }) {
  const { revealed, reveal } = useRevealOnce(story.id);
  const [justRevealed, setJustRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const doReveal = () => {
    reveal();
    setJustRevealed(true);
  };

  const save = async () => {
    if (!cardRef.current) return;
    try {
      await saveNodeAsImage(cardRef.current, `고민동물-${story.receipt_no}.png`);
      toast("고민 동물 카드를 저장했어요");
    } catch {
      toast("이미지를 만들지 못했어요");
    }
  };

  const share = async () => {
    if (!cardRef.current) return;
    try {
      const text = marks.aired
        ? `내 사연이 방송에서 읽혔어요! 나의 고민 동물은 ${animal.emoji} ${animal.name} · ${siteName}`
        : `나의 고민 동물은 ${animal.emoji} ${animal.name}! ${siteName}`;
      const r = await shareNodeAsImage(cardRef.current, `고민동물-${story.receipt_no}.png`, text);
      if (r === "saved") toast("공유용 이미지를 저장했어요");
    } catch {
      toast("이미지를 만들지 못했어요");
    }
  };

  return (
    <article className={`result ${revealed ? "is-revealed" : ""}`} aria-label="고민 동물 결과">
      <header className="result-head">
        <p className="result-meta">
          <span>No.{String(story.receipt_no).padStart(4, "0")}</span>
          <span>{postDate(story.created_at)}</span>
          <span>고민 동물 검사 결과</span>
        </p>
        <p className="result-kicker">“{story.summary}” 를 보낸 당신의 고민 동물은</p>
        {revealed ? (
          <h1 className={`result-name ${justRevealed ? "pop-in" : ""}`}>
            <span className="result-emoji" aria-hidden="true">
              {animal.emoji}
            </span>
            {animal.name}
          </h1>
        ) : (
          <h1 className="result-name result-name-hidden">두근두근…</h1>
        )}
      </header>

      <div className="result-grid">
        <div className="result-card-col">
          <AnimalCard
            ref={cardRef}
            animal={animal}
            revealed={revealed}
            onReveal={doReveal}
            serial={story.receipt_no}
            stamp={story.stamp}
            siteName={siteName}
            date={postDate(story.created_at)}
            mysteryText="눌러서 내 고민 동물 확인하기"
            aired={marks.aired}
            reviewed={marks.reviewed}
            golden={marks.golden}
          />
          {revealed && (
            <div className="result-share">
              <button type="button" className="post-btn post-btn-sub" onClick={save}>
                카드 저장
              </button>
              <button type="button" className="post-btn post-btn-sub" onClick={share}>
                공유하기
              </button>
            </div>
          )}
        </div>

        {revealed && (
          <div className={`result-detail ${justRevealed ? "pop-in" : ""}`}>
            {animal.prev_name && animal.prev_name !== animal.name && (
              <p className="result-morph" role="status">
                <span>
                  {animal.prev_emoji} {animal.prev_name}
                </span>
                <span className="morph-arrow" aria-hidden="true">
                  →
                </span>
                <strong>
                  {animal.emoji} {animal.name}
                </strong>
                <span className="result-morph-label">변신!</span>
                {animal.change_reason && <span className="result-morph-reason">{animal.change_reason}</span>}
              </p>
            )}

            <section className="result-section">
              <h2>왜 {animal.name.split(" ").slice(-1)[0]}일까요</h2>
              <p className="result-why">{animal.why}</p>
              <p className="result-comment">{animal.description}</p>
              {animal.quote && <p className="result-quote">“{animal.quote}”</p>}
              {animal.hashtags?.length ? (
                <p className="result-tags">
                  {animal.hashtags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </p>
              ) : null}
            </section>

            <section className="result-section">
              <h2>고민 성분표</h2>
              <dl className="ingredients">
                <div>
                  <dt>고민 온도</dt>
                  <dd>
                    <span className="ing-bar" aria-hidden="true">
                      <span style={{ width: `${story.temperature}%`, background: temperatureColor(story.temperature) }} />
                    </span>
                    <span className="ing-val">
                      {story.temperature}° <small>{temperatureLabel(story.temperature)}</small>
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>주성분</dt>
                  <dd>{optionLabel(GOMIN.categories, story.category)}</dd>
                </div>
                <div>
                  <dt>지금 기분</dt>
                  <dd className="ing-stamp">
                    <StampSticker stamp={story.stamp} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt>필요한 처방</dt>
                  <dd>{optionLabel(GOMIN.wishes, story.wish)}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </div>
    </article>
  );
}

const TRACK = [
  { key: "received", label: "접수" },
  { key: "reviewing", label: "검토" },
  { key: "approved", label: "방송 대기" },
  { key: "aired", label: "방송에서 읽힘" },
];

/** 사연이 지금 어디쯤인지 (배송 조회처럼) */
export function StatusTrack({ status, createdAt, waitingNotice = false }: { status: string; createdAt: string; waitingNotice?: boolean }) {
  const info = VIEWER_STATUS[status] ?? VIEWER_STATUS.reviewing;
  const stepIndex = status === "aired" ? 4 : status === "read" ? 3 : status === "approved" || status === "scheduled" ? 2 : 1;
  const stopped = status === "not_selected";
  const waiting = waitingNotice && (status === "reviewing" || status === "approved" || status === "scheduled");
  return (
    <section className="status-track" aria-label="사연 진행 상황">
      <div className="status-track-head">
        <h2>사연 배송 조회</h2>
        <span className={`status-pill tone-${info.tone}`}>{info.label}</span>
      </div>
      <ol className={`st-steps ${stopped ? "is-stopped" : ""}`}>
        {TRACK.map((t, i) => {
          const state = stopped ? (i <= 1 ? "done" : "skip") : i < stepIndex ? "done" : i === stepIndex ? "now" : "todo";
          return (
            <li key={t.key} className={`st-${state}`} aria-current={state === "now" ? "step" : undefined}>
              <span className="st-dot" aria-hidden="true" />
              <span className="st-label">{t.label}</span>
              {i === 0 && <span className="st-date">{formatDate(createdAt)}</span>}
            </li>
          );
        })}
      </ol>
      <p className="status-desc">{info.desc}</p>
      {waiting && (
        <p className="status-waiting" role="note">
          {WAITING_NOTICE}
        </p>
      )}
    </section>
  );
}
