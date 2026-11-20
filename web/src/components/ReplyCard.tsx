import { useRef, useState } from "react";
import { GOMIN, optionLabel } from "@shared/boxes.ts";
import { AnimalCard, useRevealOnce, type Animal } from "./AnimalCard";
import { StampSticker, useToast } from "./ui";
import { formatDate } from "../lib/format";
import { saveNodeAsImage, shareNodeAsImage } from "../lib/image";

export type ReplyStory = {
  id: string;
  receipt_no: number;
  summary: string;
  display_name: string;
  stamp: string;
  wish?: string;
  visibility: string;
  viewer_status: string;
  aired_at?: string | null;
  created_at: string;
};

export type Reply = {
  body: string;
  kind: "manual" | "auto";
  aired_on: string | null;
  vod_url: string | null;
  verdict_yes: number | null;
  verdict_no: number | null;
  sent_at: string;
};

/** 답장 카드: 고민 동물 공개 + 다웅의 답장 + 방송 정보 */
export function ReplyCard({
  story,
  reply,
  animal,
  siteName,
}: {
  story: ReplyStory;
  reply: Reply;
  animal: Animal | null;
  siteName: string;
}) {
  const { revealed, reveal } = useRevealOnce(story.id);
  const [justRevealed, setJustRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const aired = !!(reply.aired_on || reply.vod_url || story.aired_at);
  const hasVerdict = reply.verdict_yes !== null && reply.verdict_yes !== undefined;

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
    if (!cardRef.current || !animal) return;
    try {
      const r = await shareNodeAsImage(cardRef.current, `고민동물-${story.receipt_no}.png`, `나의 고민 동물은 ${animal.emoji} ${animal.name}!`);
      if (r === "saved") toast("공유용 이미지를 저장했어요");
    } catch {
      toast("이미지를 만들지 못했어요");
    }
  };

  return (
    <article className="reply" aria-label={`접수번호 ${story.receipt_no} 답장`}>
      <header className="reply-head">
        <span className="chip chip-red">답장 도착</span>
        <h1 className="display reply-title">“{story.summary}”</h1>
        <p className="faint" style={{ margin: 0 }}>
          #{story.receipt_no} · {story.display_name} · {formatDate(story.created_at)} 접수
        </p>
      </header>

      <section className="reply-animal" aria-label="고민 동물">
        <AnimalCard
          ref={cardRef}
          animal={animal}
          revealed={revealed}
          onReveal={doReveal}
          serial={story.receipt_no}
          stamp={story.stamp}
          siteName={siteName}
          date={formatDate(reply.sent_at)}
          mysteryText="눌러서 내 고민 동물 공개하기"
        />
        {revealed && animal && (
          <div className={`reply-animal-after ${justRevealed ? "pop-in" : ""}`}>
            {animal.prev_name && animal.prev_name !== animal.name && (
              <div className="morph" role="status">
                <span className="big" aria-hidden="true">
                  {animal.prev_emoji}
                </span>
                <span>{animal.prev_name}</span>
                <span className="morph-arrow" aria-hidden="true">
                  →
                </span>
                <span className="big" aria-hidden="true">
                  {animal.emoji}
                </span>
                <span>{animal.name}(으)로 변신!</span>
                {animal.change_reason && <span className="morph-reason">{animal.change_reason}</span>}
              </div>
            )}
            <div className="row" style={{ justifyContent: "center" }}>
              <button type="button" className="btn btn-sm" onClick={save}>
                카드 이미지 저장
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={share}>
                공유하기
              </button>
            </div>
            <p className="faint" style={{ textAlign: "center", margin: 0 }}>
              저장·공유 이미지에는 사연과 답장 내용이 들어가지 않아요.
            </p>
          </div>
        )}
      </section>

      <section className="reply-letter card pinned" aria-label="다웅의 답장">
        {reply.kind === "auto" ? (
          <>
            <p className="notice" style={{ margin: 0 }}>
              다웅이 직접 쓴 답장은 아니지만, 사연은 잘 받았어요. 고민 동물과 응원 한마디를 먼저 보내드려요.
            </p>
            <p className="letter-body">{reply.body}</p>
          </>
        ) : (
          <>
            <div className="letter-to">To. {story.display_name}</div>
            <p className="letter-body">{reply.body}</p>
            <div className="letter-from">From. 다웅</div>
          </>
        )}
        <div className="letter-meta faint">
          {story.wish && <span>듣고 싶은 말: {optionLabel(GOMIN.wishes, story.wish)}</span>}
          <StampSticker stamp={story.stamp} size="sm" />
        </div>
      </section>

      {(aired || hasVerdict) && (
        <section className="reply-aired card" aria-label="방송 정보">
          {aired && (
            <div className="row">
              <span className="chip chip-yellow">📺 방송에서 읽었어요</span>
              {reply.aired_on && <span>{formatDate(reply.aired_on)} 방송</span>}
              {reply.vod_url && (
                <a href={reply.vod_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                  다시보기 ▶
                </a>
              )}
            </div>
          )}
          {hasVerdict && (
            <div className="verdict">
              <div className="verdict-title display">⚖️ 채팅 판결</div>
              <div className="verdict-bar" role="img" aria-label={`찬성 ${reply.verdict_yes}%, 반대 ${reply.verdict_no ?? 100 - (reply.verdict_yes ?? 0)}%`}>
                <span className="v-yes" style={{ width: `${reply.verdict_yes}%` }}>
                  찬성 {reply.verdict_yes}%
                </span>
                <span className="v-no" style={{ width: `${reply.verdict_no ?? 100 - (reply.verdict_yes ?? 0)}%` }}>
                  반대 {reply.verdict_no ?? 100 - (reply.verdict_yes ?? 0)}%
                </span>
              </div>
            </div>
          )}
        </section>
      )}
    </article>
  );
}

/** 답장을 기다리는 동안 보여줄 화면 */
export function WaitingCard({ story, siteName }: { story: ReplyStory; siteName: string }) {
  const msg: Record<string, string> = {
    received: "다웅이 사연을 읽는 중이에요",
    scheduled: "방송에서 읽을 예정이에요!",
    aired: "방송에서 읽었어요! 답장을 쓰는 중이에요",
    private: "다웅만 볼 수 있게 잘 전달됐어요",
  };
  return (
    <section className="waiting card pinned">
      <div className="waiting-anim" aria-hidden="true">
        <span>✉️</span>
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
      </div>
      <h1 className="display">{msg[story.viewer_status] ?? msg.received}</h1>
      <p className="muted" style={{ margin: 0 }}>
        답장이 오면 고민 동물도 함께 공개돼요. 조금만 기다려 주세요!
      </p>
      <div className="waiting-summary">
        <StampSticker stamp={story.stamp} size="sm" />
        <div>
          <strong>“{story.summary}”</strong>
          <div className="faint">
            #{story.receipt_no} · {formatDate(story.created_at)} 접수
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 220, margin: "0 auto" }}>
        <AnimalCard animal={null} revealed={false} compact siteName={siteName} />
      </div>
    </section>
  );
}
