import { GOMIN, optionEmoji, optionLabel, temperatureLabel } from "@shared/boxes.ts";
import { HELP_LINES } from "@shared/boxes.ts";
import { STATUS_LABEL, VISIBILITY_LABEL, type AnimalRow, type ListItem, type Status } from "./api";
import { temperatureColor } from "../components/ui";
import { FLAG_LABEL, personLabel } from "../lib/format";

export function StatusChip({ status }: { status: Status }) {
  return <span className={`adm-st st-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function FlagChips({ flags }: { flags: string[] }) {
  if (!flags.length) return null;
  return (
    <>
      {flags.map((f) => (
        <span key={f} className={`adm-flag ${f === "care" || f === "ai_review" ? "is-care" : ""} ${f.startsWith("ai:") ? "is-reason" : ""}`}>
          {f.startsWith("ai:") ? `AI: ${f.slice(3)}` : FLAG_LABEL[f] ?? f}
        </span>
      ))}
    </>
  );
}

export function Temp({ t }: { t: number }) {
  return (
    <span className="adm-temp" style={{ ["--t" as string]: temperatureColor(t) }} title={`고민 온도 ${t}도`}>
      {t}°
    </span>
  );
}

export function Who({ s }: { s: Pick<ListItem, "broadcast_name" | "display_name" | "visibility" | "age" | "age_group" | "age_public" | "gender" | "name_mode" | "logged_in"> }) {
  const ag = personLabel(s, "admin");
  return (
    <span className="adm-who">
      <b>{s.display_name}</b>
      <span className="adm-dim">{s.name_mode === "chzzk" ? "치지직 닉네임" : "랜덤 이름"}</span>
      {s.visibility !== "named" && <span className="adm-dim">· 방송에선 "{s.broadcast_name}"</span>}
      {ag && <span className="adm-dim">· {ag}</span>}
      {s.logged_in && <span className="adm-tag">로그인</span>}
    </span>
  );
}

/** 사연 정보 표: 듣고 싶은 말, 목소리, 종류, 공개 방식, 온도 */
export function Facts({ s }: { s: ListItem }) {
  return (
    <dl className="adm-facts">
      <div>
        <dt>듣고 싶은 말</dt>
        <dd>
          <span aria-hidden="true">{optionEmoji(GOMIN.wishes, s.wish)}</span> {optionLabel(GOMIN.wishes, s.wish)}
        </dd>
      </div>
      <div>
        <dt>읽어줄 목소리</dt>
        <dd>
          <span aria-hidden="true">{optionEmoji(GOMIN.voices, s.voice)}</span> {optionLabel(GOMIN.voices, s.voice)}
        </dd>
      </div>
      <div>
        <dt>고민 종류</dt>
        <dd>{optionLabel(GOMIN.categories, s.category)}</dd>
      </div>
      <div>
        <dt>공개 방식</dt>
        <dd>{VISIBILITY_LABEL[s.visibility] ?? s.visibility}</dd>
      </div>
      <div className="adm-facts-wide">
        <dt>고민 온도</dt>
        <dd>
          <span className="adm-tempbar" style={{ ["--t" as string]: temperatureColor(s.temperature), ["--w" as string]: `${s.temperature}%` }}>
            <span />
          </span>
          <span>
            <b className="adm-mono">{s.temperature}°</b> {temperatureLabel(s.temperature)}
          </span>
        </dd>
      </div>
    </dl>
  );
}

/** 시청자가 받은 고민 동물 (요약) */
export function AnimalMini({ a, state }: { a: AnimalRow | null; state?: string }) {
  if (!a) return <p className="adm-dim">고민 동물이 아직 없어요.</p>;
  return (
    <div className="adm-animal-mini">
      <span className="adm-animal-emoji" aria-hidden="true">
        {a.emoji}
      </span>
      <div>
        <p className="adm-animal-name">
          {a.name}
          {state && (state === "failed" || state === "fallback") && <span className="adm-tag warn">기본 동물</span>}
        </p>
        <p className="adm-dim">{a.why}</p>
        <p className="adm-animal-desc">{a.description}</p>
      </div>
    </div>
  );
}

export function CareNote() {
  return (
    <p className="adm-care" role="note">
      <b>확인 필요</b> 자해·자살·학대·폭력 관련 표현이 있어요. 사연자에게는 제출 직후 상담 연락처가 안내됐어요. 방송에서 다룰지 신중하게 정해주세요. (
      {HELP_LINES.map((h) => `${h.name} ${h.tel}`).join(", ")})
    </p>
  );
}

export function Kbd({ children }: { children: string }) {
  return <kbd className="adm-kbd">{children}</kbd>;
}
