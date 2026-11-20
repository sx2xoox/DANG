import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GOMIN, optionEmoji, optionLabel, temperatureLabel } from "@shared/boxes.ts";
import { ANIMAL_STATE_LABEL, VISIBILITY_LABEL, errMsg, useAdmin, type AnimalRow, type StoryBundle } from "./api";
import { AnimalCard } from "../components/AnimalCard";
import { Dialog, Spinner, StampSticker, temperatureColor, useToast } from "../components/ui";
import { ADMIN_STATUS, FLAG_LABEL, ageGender, daysSince, formatDate } from "../lib/format";
import { useSite } from "../lib/site";
import ReadMode from "./ReadMode";

type Props = {
  id: string;
  onChanged: () => void;
  onDeleted: () => void;
  onBack?: () => void;
};

export default function StoryDetail({ id, onChanged, onDeleted, onBack }: Props) {
  const { call, isOwner } = useAdmin();
  const toast = useToast();
  const [data, setData] = useState<StoryBundle | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await call<StoryBundle>("get", { id }));
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [call, id]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = async () => {
    await load();
    onChanged();
  };

  const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
    try {
      await fn();
      if (okMsg) toast(okMsg);
      await changed();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  if (error) {
    return (
      <div className="adm-panel">
        {onBack && (
          <button className="btn btn-sm" onClick={onBack}>
            ← 목록
          </button>
        )}
        <p className="adm-error" role="alert">
          {error}
        </p>
      </div>
    );
  }
  if (!data) return <Spinner />;

  const s = data.story;
  const care = s.flags.includes("care");

  return (
    <article className="adm-detail" aria-label={`사연 #${s.receipt_no}`}>
      <div className="adm-detail-bar">
        {onBack && (
          <button className="btn btn-sm" onClick={onBack}>
            ← 목록
          </button>
        )}
        <span className="adm-no big">#{s.receipt_no}</span>
        <span className="faint">
          {formatDate(s.created_at, true)} · {daysSince(s.created_at)}일 전
        </span>
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" onClick={() => setReading(true)}>
          읽기 모드
        </button>
        <button
          className="btn btn-sm"
          disabled={s.visibility === "private"}
          title={s.visibility === "private" ? "방장만 보기 사연은 방송 카드에 띄울 수 없어요" : undefined}
          onClick={() => run(() => call("broadcast", { op: "show", id: s.id }), "OBS 카드에 띄웠어요")}
        >
          OBS에 띄우기
        </button>
        {isOwner && (
          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
            삭제
          </button>
        )}
      </div>

      {care && (
        <div className="notice notice-danger" role="note">
          <b>확인 필요</b> · 자해·자살·학대·폭력 관련 표현이 있어요. 자동 답장은 나가지 않으니 직접 확인하고 답장해 주세요. (청소년상담 1388, 자살예방상담 109, 정신건강위기상담 1577-0199)
        </div>
      )}

      <section className="adm-panel">
        <div className="adm-who">
          <div>
            <p className="adm-name">
              {s.display_name}
              <span className="chip">{s.name_mode === "chzzk" ? "치지직 닉네임" : "랜덤 이름"}</span>
              {s.logged_in && <span className="chip chip-blue">로그인</span>}
            </p>
            <p className="faint">
              방송에서 부를 이름: <b>{s.broadcast_name}</b> · {VISIBILITY_LABEL[s.visibility] ?? s.visibility}
              {ageGender(s.age, s.gender) ? ` · ${ageGender(s.age, s.gender)}` : ""}
            </p>
          </div>
          <StampSticker stamp={s.stamp} size="md" />
        </div>

        <StatusControl status={s.status} isOwner={isOwner} onChange={(st) => run(() => call("set_status", { id: s.id, status: st }), `상태: ${ADMIN_STATUS[st]}`)} />

        <div className="adm-flags" aria-label="표시">
          {Object.entries(FLAG_LABEL).map(([f, label]) => {
            const on = s.flags.includes(f);
            if (!isOwner && !on) return null;
            return isOwner ? (
              <button
                key={f}
                className={`chip adm-flag-btn ${on ? (f === "care" ? "chip-red" : "is-on") : ""}`}
                aria-pressed={on}
                onClick={() => run(() => call("toggle_flag", { id: s.id, flag: f }))}
              >
                {on ? "✓ " : "+ "}
                {label}
              </button>
            ) : (
              <span key={f} className={`chip ${f === "care" ? "chip-red" : "adm-flag"}`}>
                {label}
              </span>
            );
          })}
        </div>

        <h2 className="adm-summary display">{s.summary}</h2>
        <div className="adm-meta">
          <Meta label="고민 종류" value={`${optionEmoji(GOMIN.categories, s.category)} ${optionLabel(GOMIN.categories, s.category)}`} />
          <Meta label="듣고 싶은 말" value={`${optionEmoji(GOMIN.wishes, s.wish)} ${optionLabel(GOMIN.wishes, s.wish)}`} strong />
          <Meta label="읽어줄 목소리" value={`${optionEmoji(GOMIN.voices, s.voice)} ${optionLabel(GOMIN.voices, s.voice)}`} strong />
          <div className="adm-meta-item">
            <span className="faint">고민 온도</span>
            <span className="adm-tempbar" style={{ ["--t" as string]: temperatureColor(s.temperature), ["--w" as string]: `${s.temperature}%` }}>
              <span />
            </span>
            <b>
              {s.temperature}° · {temperatureLabel(s.temperature)}
            </b>
          </div>
        </div>
        {s.write_mode === "template" && <p className="chip">고민 틀로 씀</p>}
        <div className="adm-body">{s.body}</div>
        <p className="faint">칭호: {s.badge}</p>
      </section>

      {data.follow_ups.length > 0 && (
        <section className="adm-panel">
          <h3 className="adm-h3">후속 보고 {data.follow_ups.length}</h3>
          <ol className="adm-follow">
            {data.follow_ups.map((f) => (
              <li key={f.id}>
                <span className="faint">{formatDate(f.created_at, true)}</span>
                <p>{f.body}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <AnimalPanel id={s.id} receipt={s.receipt_no} stamp={s.stamp} animal={data.animal} state={s.animal_state} isOwner={isOwner} onChanged={changed} />

      {isOwner && <ReplyEditor bundle={data} onChanged={changed} />}

      {data.picks.length > 0 && <p className="faint">뽑힌 기록: {data.picks.map((p) => formatDate(p.picked_at, true)).join(", ")}</p>}

      {reading && <ReadMode id={s.id} onClose={() => setReading(false)} onChanged={changed} />}

      {confirmDelete && (
        <Dialog title="사연을 삭제할까요?" onClose={() => setConfirmDelete(false)}>
          <p>#{s.receipt_no} 사연과 답장, 고민 동물, 후속 보고가 모두 지워져요. 되돌릴 수 없어요.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                try {
                  await call("delete", { id: s.id });
                  toast("삭제했어요");
                  setConfirmDelete(false);
                  onDeleted();
                } catch (e) {
                  toast(errMsg(e));
                }
              }}
            >
              삭제하기
            </button>
          </div>
        </Dialog>
      )}
    </article>
  );
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="adm-meta-item">
      <span className="faint">{label}</span>
      {strong ? <b>{value}</b> : <span>{value}</span>}
    </div>
  );
}

const STATUS_ORDER = ["new", "starred", "scheduled", "on_air", "read", "hold"];

function StatusControl({ status, isOwner, onChange }: { status: string; isOwner: boolean; onChange: (s: string) => void }) {
  if (!isOwner) {
    const starred = status === "starred";
    const canToggle = status === "new" || starred;
    return (
      <div className="row">
        <span className={`chip adm-status st-${status}`}>{ADMIN_STATUS[status]}</span>
        {canToggle && (
          <button className="btn btn-sm" onClick={() => onChange(starred ? "new" : "starred")}>
            {starred ? "별표 떼기" : "★ 별표 붙이기"}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="adm-seg" role="radiogroup" aria-label="상태 바꾸기">
      {STATUS_ORDER.map((st) => (
        <button key={st} role="radio" aria-checked={status === st} className={`st-${st}`} onClick={() => status !== st && onChange(st)}>
          {ADMIN_STATUS[st]}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ 고민 동물
function AnimalPanel({
  id,
  receipt,
  stamp,
  animal,
  state,
  isOwner,
  onChanged,
}: {
  id: string;
  receipt: number;
  stamp: string;
  animal: AnimalRow | null;
  state: string;
  isOwner: boolean;
  onChanged: () => Promise<void>;
}) {
  const { call } = useAdmin();
  const { info } = useSite();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const st = ANIMAL_STATE_LABEL[state] ?? { label: state, tone: "" };

  const regenerate = async () => {
    setBusy(true);
    try {
      const res = await call<{ animal_state: string; ai_enabled: boolean }>("animal_regenerate", { id });
      toast(res.animal_state === "ready" ? "새 고민 동물을 지었어요" : res.ai_enabled ? "AI가 실패해서 기본 동물을 넣었어요" : "AI 키가 없어 기본 동물을 넣었어요");
      await onChanged();
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-panel">
      <div className="row">
        <h3 className="adm-h3">고민 동물</h3>
        <span className={`chip adm-tone-${st.tone}`}>{st.label}</span>
        <span className="spacer" />
        {isOwner && (
          <>
            <button className="btn btn-sm" onClick={regenerate} disabled={busy}>
              {busy ? "짓는 중…" : "다시 만들기"}
            </button>
            <button className="btn btn-sm" onClick={() => setEditing((v) => !v)} disabled={!animal}>
              {editing ? "수정 닫기" : "직접 수정"}
            </button>
          </>
        )}
      </div>
      <p className="faint">시청자에게는 답장이 나갈 때 함께 공개돼요.</p>
      {animal ? (
        <div className="adm-animal">
          <div className="adm-animal-card">
            <AnimalCard animal={animal} revealed serial={receipt} stamp={stamp} siteName={info.site_name} />
          </div>
          {animal.prev_name && (
            <p className="morph">
              <span>
                <span aria-hidden="true">{animal.prev_emoji}</span> {animal.prev_name}
              </span>
              <span className="morph-arrow" aria-hidden="true">
                →
              </span>
              <span>
                <span aria-hidden="true">{animal.emoji}</span> {animal.name}
              </span>
              <span className="faint" style={{ flexBasis: "100%" }}>
                {animal.change_reason}
              </span>
            </p>
          )}
          {editing && isOwner && (
            <AnimalEditForm
              animal={animal}
              onSave={async (a) => {
                try {
                  await call("animal_update", { id, animal: a });
                  toast("고민 동물을 고쳤어요");
                  setEditing(false);
                  await onChanged();
                } catch (e) {
                  toast(errMsg(e));
                }
              }}
            />
          )}
        </div>
      ) : (
        <p className="faint">아직 고민 동물이 없어요.</p>
      )}
    </section>
  );
}

function AnimalEditForm({ animal, onSave }: { animal: AnimalRow; onSave: (a: Record<string, unknown>) => Promise<void> }) {
  const [a, setA] = useState({
    name: animal.name,
    emoji: animal.emoji,
    why: animal.why,
    description: animal.description,
    quote: animal.quote,
    tags: animal.hashtags.join(" "),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof a) => (e: { target: { value: string } }) => setA((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSave({
      name: a.name,
      emoji: a.emoji,
      why: a.why,
      description: a.description,
      quote: a.quote,
      hashtags: a.tags.split(/[\s,]+/).filter(Boolean).slice(0, 3),
    });
    setBusy(false);
  };
  return (
    <form className="adm-form" onSubmit={submit}>
      <div className="adm-form-row">
        <div className="field" style={{ flex: "0 0 90px" }}>
          <label htmlFor="ae-emoji">이모지</label>
          <input id="ae-emoji" className="input" value={a.emoji} onChange={set("emoji")} maxLength={16} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="ae-name">이름 (12자 이내)</label>
          <input id="ae-name" className="input" value={a.name} onChange={set("name")} maxLength={12} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ae-why">왜 이 동물인지 (한 줄)</label>
        <input id="ae-why" className="input" value={a.why} onChange={set("why")} maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="ae-desc">유형 설명 (3~4문장)</label>
        <textarea id="ae-desc" className="textarea" value={a.description} onChange={set("description")} maxLength={800} style={{ minHeight: 120 }} />
      </div>
      <div className="field">
        <label htmlFor="ae-quote">동물의 한마디</label>
        <input id="ae-quote" className="input" value={a.quote} onChange={set("quote")} maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="ae-tags">해시태그 3개 (띄어쓰기로 구분)</label>
        <input id="ae-tags" className="input" value={a.tags} onChange={set("tags")} />
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "저장 중…" : "고민 동물 저장"}
      </button>
    </form>
  );
}

// ------------------------------------------------------------------ 답장
function ReplyEditor({ bundle, onChanged }: { bundle: StoryBundle; onChanged: () => Promise<void> }) {
  const { call } = useAdmin();
  const toast = useToast();
  const s = bundle.story;
  const r = bundle.reply;
  const sent = !!r?.sent_at;
  const [body, setBody] = useState(sent ? r!.body : r?.draft ?? "");
  const [airedOn, setAiredOn] = useState(r?.aired_on ?? (s.aired_at ? s.aired_at.slice(0, 10) : ""));
  const [vod, setVod] = useState(r?.vod_url ?? "");
  const [yes, setYes] = useState(r?.verdict_yes?.toString() ?? "");
  const [no, setNo] = useState(r?.verdict_no?.toString() ?? "");
  const [busy, setBusy] = useState<"" | "draft" | "save" | "send" | "unsend">("");
  const [aiNote, setAiNote] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const payload = () => ({
    id: s.id,
    body,
    aired_on: airedOn,
    vod_url: vod,
    verdict_yes: yes === "" ? null : Number(yes),
    verdict_no: no === "" ? null : Number(no),
  });

  const act = async (kind: typeof busy, fn: () => Promise<unknown>, msg: string) => {
    setBusy(kind);
    try {
      await fn();
      toast(msg);
      await onChanged();
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const draft = async () => {
    if (body.trim() && !window.confirm("지금 쓴 내용을 AI 초안으로 바꿀까요?")) return;
    setBusy("draft");
    try {
      const res = await call<{ draft: string }>("reply_draft", { id: s.id });
      setBody(res.draft);
      setAiNote(true);
      toast("AI 초안을 넣었어요. 꼭 읽고 고쳐주세요");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const showVerdict = s.wish === "chat" || yes !== "" || no !== "";

  return (
    <section className="adm-panel">
      <div className="row">
        <h3 className="adm-h3">다웅의 답장</h3>
        {sent ? (
          <span className="chip chip-yellow">
            {r!.kind === "auto" ? "자동 답장 보냄" : "보냄"} · {formatDate(r!.sent_at, true)}
            {r!.opened_at ? " · 읽음" : ""}
          </span>
        ) : (
          <span className="chip">아직 안 보냄</span>
        )}
        <span className="spacer" />
        <button className="btn btn-sm btn-blue" onClick={draft} disabled={!!busy}>
          {busy === "draft" ? "초안 쓰는 중…" : "답장 초안 만들기 (AI)"}
        </button>
      </div>
      {sent && r!.kind === "auto" && (
        <p className="notice">
          이 사연은 기간이 지나 자동 답장(고민 동물 + 응원 한마디)이 나갔어요. 직접 답장을 보내면 그 답장으로 바뀌어요.
        </p>
      )}
      {aiNote && (
        <p className="notice notice-yellow" role="note">
          AI가 쓴 초안이에요. 그대로 보내지 말고, 꼭 읽고 다웅의 말로 고친 뒤 보내주세요.
        </p>
      )}
      <div className="field">
        <label htmlFor="rp-body">
          답장 내용 <span className="faint">(듣고 싶은 말: {optionLabel(GOMIN.wishes, s.wish)} · 목소리: {optionLabel(GOMIN.voices, s.voice)})</span>
        </label>
        <textarea id="rp-body" className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="사연자에게 보낼 답장을 써주세요." style={{ minHeight: 200 }} />
      </div>
      <div className="adm-form-row">
        <div className="field">
          <label htmlFor="rp-date">방송 날짜</label>
          <input id="rp-date" className="input" type="date" value={airedOn} onChange={(e) => setAiredOn(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="rp-vod">다시보기 링크 (선택)</label>
          <input id="rp-vod" className="input" type="url" inputMode="url" placeholder="https://chzzk.naver.com/video/…" value={vod} onChange={(e) => setVod(e.target.value)} />
        </div>
      </div>
      {showVerdict ? (
        <fieldset className="adm-verdict">
          <legend>채팅 판결 결과 (선택)</legend>
          <div className="adm-form-row">
            <div className="field">
              <label htmlFor="rp-yes">찬성 %</label>
              <input
                id="rp-yes"
                className="input"
                type="number"
                min={0}
                max={100}
                value={yes}
                onChange={(e) => {
                  setYes(e.target.value);
                  if (e.target.value !== "" && no === "") setNo(String(Math.max(0, 100 - Number(e.target.value))));
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="rp-no">반대 %</label>
              <input id="rp-no" className="input" type="number" min={0} max={100} value={no} onChange={(e) => setNo(e.target.value)} />
            </div>
          </div>
        </fieldset>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setYes("50")}>
          + 채팅 판결 결과 넣기
        </button>
      )}
      <div className="row">
        <button className="btn" disabled={!!busy} onClick={() => act("save", () => call("reply_save", payload()), "저장했어요")}>
          {busy === "save" ? "저장 중…" : sent ? "고친 내용 저장" : "임시 저장"}
        </button>
        <button className="btn btn-primary" disabled={!!busy || body.trim().length < 2} onClick={() => setConfirmSend(true)}>
          {sent ? "답장 다시 보내기" : "답장 보내기"}
        </button>
        {sent && (
          <button
            className="btn btn-ghost"
            disabled={!!busy}
            onClick={() => window.confirm("보낸 답장을 취소할까요? 시청자 화면에서 답장이 사라져요.") && act("unsend", () => call("reply_unsend", { id: s.id }), "답장 보내기를 취소했어요")}
          >
            보낸 답장 취소
          </button>
        )}
      </div>
      {confirmSend && (
        <Dialog title="답장을 보낼까요?" onClose={() => setConfirmSend(false)}>
          <p>
            #{s.receipt_no} {s.display_name}님에게 답장과 고민 동물이 공개돼요. 내용을 다시 한 번 확인해 주세요.
          </p>
          <div className="adm-preview">{body}</div>
          <div className="row">
            <button className="btn" onClick={() => setConfirmSend(false)}>
              다시 볼게요
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setConfirmSend(false);
                await act("send", () => call("reply_send", payload()), "답장을 보냈어요");
                setAiNote(false);
              }}
            >
              보내기
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
