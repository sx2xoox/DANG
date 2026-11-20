import { useCallback, useEffect, useState, type FormEvent } from "react";
import { STATUS_LABEL, ANIMAL_STATE_LABEL, errMsg, useAdmin, type AnimalRow, type Status, type StoryBundle } from "./api";
import { CareNote, Facts, StatusChip, Who } from "./parts";
import { AnimalCard } from "../components/AnimalCard";
import { Dialog, Spinner, StampSticker, useToast } from "../components/ui";
import { FLAG_LABEL, daysSince, formatDate } from "../lib/format";
import { useSite } from "../lib/site";
import ReadMode from "./ReadMode";

type Props = {
  id: string;
  onChanged: () => void;
  onDeleted: () => void;
  onBack?: () => void;
};

/** 상태별로 할 수 있는 다음 동작 */
const NEXT: Record<Status, { to: Status; label: string; kind?: string }[]> = {
  pending: [
    { to: "approved", label: "승인", kind: "btn-primary" },
    { to: "rejected", label: "반려", kind: "btn-reject" },
  ],
  approved: [
    { to: "read", label: "읽음 처리" },
    { to: "pending", label: "검토 대기로" },
    { to: "rejected", label: "반려", kind: "btn-reject" },
  ],
  on_air: [
    { to: "read", label: "읽음 처리", kind: "btn-done" },
    { to: "approved", label: "대기열로 되돌리기" },
  ],
  read: [{ to: "approved", label: "대기열로 되돌리기" }],
  rejected: [
    { to: "approved", label: "승인", kind: "btn-primary" },
    { to: "pending", label: "검토 대기로" },
  ],
};

export default function StoryDetail({ id, onChanged, onDeleted, onBack }: Props) {
  const { call, isOwner, pendingCount, setPendingCount } = useAdmin();
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
            목록으로
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
  const canAir = s.status === "approved" || s.status === "on_air" || s.status === "read";

  const setStatus = (to: Status) =>
    run(async () => {
      await call("set_status", { id: s.id, status: to });
      if (s.status === "pending" && to !== "pending") setPendingCount(Math.max(0, pendingCount - 1));
      if (to === "pending" && s.status !== "pending") setPendingCount(pendingCount + 1);
    }, `${STATUS_LABEL[to]}(으)로 바꿨어요`);

  return (
    <article className="adm-detail" aria-label={`사연 #${s.receipt_no}`}>
      <div className="adm-detail-bar">
        {onBack && (
          <button className="btn btn-sm" onClick={onBack}>
            목록으로
          </button>
        )}
        <span className="adm-no big">#{s.receipt_no}</span>
        <StatusChip status={s.status} />
        <span className="adm-dim adm-small">
          {formatDate(s.created_at, true)} · {daysSince(s.created_at)}일 전
        </span>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => setReading(true)}>
          읽기 모드
        </button>
        <button
          className="btn btn-sm"
          disabled={!canAir}
          title={canAir ? undefined : "승인된 사연만 방송 화면에 띄울 수 있어요"}
          onClick={() => run(() => call("broadcast", { op: "show", id: s.id }), "방송 화면에 띄웠어요")}
        >
          방송 화면에 띄우기
        </button>
        {isOwner && (
          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
            삭제
          </button>
        )}
      </div>

      {s.flags.includes("care") && <CareNote />}

      <section className="adm-panel">
        <div className="adm-detail-who">
          <div>
            <p className="adm-rv-meta">
              <Who s={s} />
            </p>
            <h2 className="adm-summary">{s.summary}</h2>
          </div>
          <StampSticker stamp={s.stamp} size="md" />
        </div>

        <div className="adm-actions" role="group" aria-label="상태 바꾸기">
          {isOwner &&
            NEXT[s.status].map((n) => (
              <button key={n.to} className={`btn btn-sm ${n.kind ?? ""}`} onClick={() => setStatus(n.to)}>
                {n.label}
              </button>
            ))}
          <button
            className="btn btn-sm"
            aria-pressed={s.starred}
            onClick={() => run(() => call("toggle_star", { id: s.id }), s.starred ? "별표를 뗐어요" : "별표를 붙였어요")}
          >
            {s.starred ? "★ 별표 떼기" : "☆ 별표"}
          </button>
        </div>

        <div className="adm-flags" aria-label="표시">
          {Object.entries(FLAG_LABEL).map(([f, label]) => {
            const on = s.flags.includes(f);
            if (!isOwner && !on) return null;
            return isOwner ? (
              <button
                key={f}
                className={`adm-flag adm-flag-btn ${on ? "is-on" : ""} ${f === "care" && on ? "is-care" : ""}`}
                aria-pressed={on}
                onClick={() => run(() => call("toggle_flag", { id: s.id, flag: f }))}
              >
                {label}
              </button>
            ) : (
              <span key={f} className={`adm-flag ${f === "care" ? "is-care" : ""}`}>
                {label}
              </span>
            );
          })}
        </div>

        {s.write_mode === "template" && <p className="adm-dim adm-small">고민 틀로 쓴 사연</p>}
        <div className="adm-body">{s.body}</div>
        <Facts s={s} />
        <p className="adm-dim adm-small">
          칭호: {s.badge}
          {s.reviewed_at ? ` · 검토 ${formatDate(s.reviewed_at, true)}` : ""}
          {s.aired_at ? ` · 방송 ${formatDate(s.aired_at, true)}` : ""}
        </p>
      </section>

      {data.follow_ups.length > 0 && (
        <section className="adm-panel">
          <h3 className="adm-h3">후속 보고 {data.follow_ups.length}</h3>
          <ol className="adm-follow">
            {data.follow_ups.map((f) => (
              <li key={f.id}>
                <span className="adm-dim adm-small">{formatDate(f.created_at, true)}</span>
                <p>{f.body}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <AnimalPanel id={s.id} receipt={s.receipt_no} stamp={s.stamp} animal={data.animal} state={s.animal_state} isOwner={isOwner} onChanged={changed} />

      {data.picks.length > 0 && <p className="adm-dim adm-small">뽑힌 기록: {data.picks.map((p) => formatDate(p.picked_at, true)).join(", ")}</p>}

      {reading && <ReadMode id={s.id} onClose={() => setReading(false)} onChanged={changed} />}

      {confirmDelete && (
        <Dialog title="사연을 삭제할까요?" onClose={() => setConfirmDelete(false)}>
          <p>#{s.receipt_no} 사연과 고민 동물, 후속 보고가 모두 지워져요. 사연자도 더 이상 볼 수 없어요. 되돌릴 수 없어요.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                try {
                  await call("delete", { id: s.id });
                  if (s.status === "pending") setPendingCount(Math.max(0, pendingCount - 1));
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
        <span className={`adm-tag ${st.tone}`}>{st.label}</span>
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
      <p className="adm-dim adm-small">사연자는 제출 직후 이 결과를 받았어요. 고치면 사연자 화면에도 바로 바뀌어요.</p>
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
              <span className="adm-dim" style={{ flexBasis: "100%" }}>
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
        <p className="adm-dim">아직 고민 동물이 없어요.</p>
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
        <label htmlFor="ae-desc">코멘트 (2~3문장)</label>
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
