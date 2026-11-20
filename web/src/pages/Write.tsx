import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fillTemplate,
  GOMIN,
  optionEmoji,
  optionLabel,
  randomNickname,
  temperatureLabel,
  templateBlanks,
} from "@shared/boxes.ts";
import { findContacts, needsCare } from "@shared/safety.ts";
import { ApiError, callFn, store, supabase } from "../lib/supabase";
import { useSite } from "../lib/site";
import { ChoiceGroup, Dialog, StampSticker, Thermometer, temperatureColor } from "../components/ui";

const DRAFT_KEY = "dg.draft.gomin";
const TOTAL = 10;

type Draft = {
  step: number;
  name_mode: "" | "chzzk" | "anon";
  chzzk_name: string;
  anon_name: string;
  age: string;
  gender: string;
  category: string;
  write_mode: "" | "template" | "free";
  template_id: string;
  template_answers: string[];
  body: string;
  summary: string;
  temperature: number;
  temp_touched: boolean;
  wish: string;
  stamp: string;
  voice: string;
  visibility: string;
  consent_broadcast: boolean;
  consent_privacy: boolean;
};

const EMPTY: Draft = {
  step: 1,
  name_mode: "",
  chzzk_name: "",
  anon_name: "",
  age: "",
  gender: "",
  category: "",
  write_mode: "",
  template_id: "",
  template_answers: [],
  body: "",
  summary: "",
  temperature: 50,
  temp_touched: false,
  wish: "",
  stamp: "",
  voice: "",
  visibility: "",
  consent_broadcast: false,
  consent_privacy: false,
};

function hasContent(d: Draft) {
  return !!(d.body || d.summary || d.template_answers.some(Boolean) || d.category || d.chzzk_name);
}

export function composeBody(d: Draft): string {
  if (d.write_mode === "template") {
    const t = (GOMIN.templates[d.category] ?? []).find((x) => x.id === d.template_id);
    if (!t) return d.body.trim();
    const sentence = fillTemplate(t, d.template_answers);
    return d.body.trim() ? `${sentence}\n\n${d.body.trim()}` : sentence;
  }
  return d.body.trim();
}

const len = (s: string) => [...s].length;

export default function Write() {
  const { info, loaded, session } = useSite();
  const navigate = useNavigate();
  const saved = useMemo(() => store.get<Draft | null>(DRAFT_KEY, null), []);
  const [d, setD] = useState<Draft>(() => ({ ...EMPTY, anon_name: randomNickname() }));
  const [askResume, setAskResume] = useState(() => !!saved && hasContent(saved));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmContacts, setConfirmContacts] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  // 임시 저장 (창을 닫아도 남아 있게)
  useEffect(() => {
    if (askResume) return;
    const t = window.setTimeout(() => {
      if (hasContent(d) || d.step > 1) store.set(DRAFT_KEY, d);
    }, 300);
    return () => window.clearTimeout(t);
  }, [d, askResume]);

  // 로그인 사용자는 지난번 이름을 기본값으로
  useEffect(() => {
    if (!session || askResume) return;
    supabase
      .from("profiles")
      .select("default_name, name_mode")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.default_name) return;
        setD((prev) => {
          if (prev.name_mode) return prev;
          return data.name_mode === "chzzk"
            ? { ...prev, name_mode: "chzzk", chzzk_name: data.default_name }
            : { ...prev, name_mode: "anon", anon_name: data.default_name };
        });
      });
  }, [session, askResume]);

  // 단계가 바뀌면 제목으로 포커스 (키보드/화면낭독기 사용자)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [d.step]);

  const body = composeBody(d);
  const contacts = useMemo(
    () => findContacts([body, d.summary, d.chzzk_name].join("\n")),
    [body, d.summary, d.chzzk_name],
  );

  const displayName = d.name_mode === "chzzk" ? d.chzzk_name.trim() : d.anon_name;
  const ageNum = Number(d.age);

  const valid: Record<number, string | null> = {
    1: !d.name_mode ? "이름 방식을 골라주세요." : !displayName ? "치지직 닉네임을 적어주세요." : null,
    2: !d.age || !Number.isInteger(ageNum) || ageNum < 5 || ageNum > 99 ? "나이를 숫자로 적어주세요." : !d.gender ? "성별을 골라주세요." : null,
    3: d.category ? null : "고민 종류를 골라주세요.",
    4: !d.write_mode
      ? "쓰는 방식을 골라주세요."
      : d.write_mode === "template" && !d.template_id
        ? "고민 틀을 골라주세요."
        : d.write_mode === "template" && !d.template_answers.some((a) => a.trim())
          ? "빈칸을 하나 이상 채워주세요."
          : len(body) < 10
            ? "고민을 조금만 더 자세히 써주세요. (10자 이상)"
            : !d.summary.trim()
              ? "한 줄 요약을 적어주세요."
              : len(d.summary.trim()) > 30
                ? "한 줄 요약은 30자 이내로 줄여주세요."
                : null,
    5: null,
    6: d.wish ? null : "듣고 싶은 말을 골라주세요.",
    7: d.stamp ? null : "감정 우표를 하나 골라주세요.",
    8: d.voice ? null : "읽어줄 목소리를 골라주세요.",
    9: !d.visibility
      ? "공개 방식을 골라주세요."
      : !d.consent_broadcast || !d.consent_privacy
        ? "필수 동의에 체크해 주세요."
        : null,
    10: null,
  };

  const [showError, setShowError] = useState(false);
  const stepError = valid[d.step];

  const go = (step: number) => {
    setShowError(false);
    setError("");
    set("step", Math.min(TOTAL, Math.max(1, step)));
  };

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    if (stepError) {
      setShowError(true);
      return;
    }
    if (d.step < TOTAL) go(d.step + 1);
    else submit(false);
  };

  const submit = async (force: boolean) => {
    for (let s = 1; s < TOTAL; s++) {
      if (valid[s]) {
        go(s);
        setShowError(true);
        return;
      }
    }
    if (contacts.length && !force) {
      setConfirmContacts(true);
      return;
    }
    setConfirmContacts(false);
    setSending(true);
    setError("");
    try {
      const res = await callFn("public", {
        action: "submit",
        box_id: "gomin",
        name_mode: d.name_mode,
        display_name: displayName,
        age: ageNum,
        gender: d.gender,
        category: d.category,
        write_mode: d.write_mode,
        template_id: d.write_mode === "template" ? d.template_id : null,
        template_answers: d.write_mode === "template" ? d.template_answers : null,
        body: d.write_mode === "template" ? d.body.trim() : body,
        summary: d.summary.trim(),
        temperature: d.temperature,
        wish: d.wish,
        stamp: d.stamp,
        voice: d.voice,
        visibility: d.visibility,
        consents: { broadcast: d.consent_broadcast, privacy: d.consent_privacy },
      });
      store.remove(DRAFT_KEY);
      const receipt = { ...res, category: d.category, wish: d.wish, temperature: d.temperature };
      // 결과는 이 탭에서만 다시 볼 수 있게 보관 (새로고침 대비)
      store.set("dg.lastReceipt", receipt, true);
      navigate("/write/done", { state: { receipt, fresh: true } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "보내지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  };

  if (loaded && !info.accepting) {
    return (
      <div className="page-narrow">
        <div className="card stack center" style={{ minHeight: "50vh" }}>
          <p className="display" style={{ fontSize: 28 }}>
            지금은 사연을 받지 않아요
          </p>
          <p className="muted">다음 접수 때 다시 와주세요. 쓰던 사연은 이 기기에 그대로 저장돼 있어요.</p>
          <Link to="/" className="btn">
            첫 화면으로
          </Link>
        </div>
      </div>
    );
  }

  const templates = GOMIN.templates[d.category] ?? [];
  const template = templates.find((t) => t.id === d.template_id);

  return (
    <div className="write">
      {sending && <Analyzing />}
      {askResume && saved && (
        <Dialog title="쓰던 사연이 있어요" onClose={() => setAskResume(false)}>
          <p className="muted" style={{ margin: 0 }}>
            지난번에 쓰다 만 사연이 이 기기에 저장돼 있어요. 이어서 쓸까요?
          </p>
          {saved.summary && <p className="card-soft" style={{ margin: 0 }}>“{saved.summary}”</p>}
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setD({ ...EMPTY, ...saved, anon_name: saved.anon_name || randomNickname() });
                setAskResume(false);
              }}
            >
              이어서 쓰기
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                store.remove(DRAFT_KEY);
                setAskResume(false);
              }}
            >
              새로 쓰기
            </button>
          </div>
        </Dialog>
      )}

      {confirmContacts && (
        <Dialog title="연락처처럼 보이는 내용이 있어요" onClose={() => setConfirmContacts(false)}>
          <p style={{ margin: 0 }}>
            사연에 전화번호나 이메일, 아이디처럼 보이는 내용이 있어요. 방송에서 읽힐 수 있으니 지우는 걸 추천해요.
          </p>
          <ul className="contact-list">
            {contacts.map((c, i) => (
              <li key={i}>
                <code>{c.sample}</code>
              </li>
            ))}
          </ul>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => { setConfirmContacts(false); go(4); }}>
              고치러 가기
            </button>
            <button type="button" className="btn" onClick={() => submit(true)}>
              그대로 보내기
            </button>
          </div>
        </Dialog>
      )}

      <div className="write-progress" aria-hidden="true">
        <div className="write-progress-bar" style={{ width: `${(d.step / TOTAL) * 100}%` }} />
      </div>

      <form className="step-card card pinned" onSubmit={next} noValidate>
        <div className="step-top">
          <span className="step-count" aria-label={`전체 ${TOTAL}단계 중 ${d.step}단계`}>
            {d.step}/{TOTAL}
          </span>
          <span className="faint hide-xs">쓰는 내용은 이 기기에 자동 저장돼요</span>
        </div>

        {d.step === 1 && (
          <Step title="어떤 이름으로 보낼까요?" headingRef={headingRef} hint="방송에서 이 이름으로 불러줄 수 있어요.">
            <ChoiceGroup
              name="name_mode"
              label="이름 방식"
              wide
              value={d.name_mode}
              onChange={(v) => set("name_mode", v as Draft["name_mode"])}
              options={[
                { id: "chzzk", label: "치지직 닉네임으로 보내기", desc: "방송에서 내 닉네임으로 불러줘요" },
                { id: "anon", label: "익명으로 보내기", desc: "귀여운 랜덤 이름을 뽑아드려요" },
              ]}
            />
            {d.name_mode === "chzzk" && (
              <div className="field">
                <label htmlFor="chzzk">치지직 닉네임</label>
                <input
                  id="chzzk"
                  className="input"
                  maxLength={20}
                  autoComplete="nickname"
                  value={d.chzzk_name}
                  onChange={(e) => set("chzzk_name", e.target.value)}
                  placeholder="예) 다웅이최고"
                  autoFocus
                />
              </div>
            )}
            {d.name_mode === "anon" && (
              <div className="nick-box">
                <span className="nick-label">나의 랜덤 이름</span>
                <strong className="nick-name display" aria-live="polite">
                  {d.anon_name}
                </strong>
                <button type="button" className="btn" onClick={() => set("anon_name", randomNickname())}>
                  다시 뽑기
                </button>
                <p className="nick-note">
                  이 이름은 <b>방송에서 불릴 이름</b>이에요. <b>고민 동물</b>은 이것과 별개로, 사연을 보내면 내용을 읽고 따로 지어드려요!
                </p>
              </div>
            )}
          </Step>
        )}

        {d.step === 2 && (
          <Step title="나에 대해 알려주세요" headingRef={headingRef} hint="사연을 읽을 때 참고만 해요.">
            <div className="field">
              <label htmlFor="age">나이</label>
              <div className="age-row">
                <button type="button" className="btn" aria-label="한 살 줄이기" onClick={() => set("age", String(Math.max(5, (Number(d.age) || 20) - 1)))}>
                  −
                </button>
                <input
                  id="age"
                  className="input age-input"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={99}
                  value={d.age}
                  onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="예) 21"
                  autoFocus
                />
                <span className="age-unit">살</span>
                <button type="button" className="btn" aria-label="한 살 늘리기" onClick={() => set("age", String(Math.min(99, (Number(d.age) || 19) + 1)))}>
                  +
                </button>
              </div>
            </div>
            <div className="field">
              <span className="label" id="gender-label">
                성별
              </span>
              <ChoiceGroup name="gender" label="성별" value={d.gender} onChange={(v) => set("gender", v)} options={GOMIN.genders} />
            </div>
          </Step>
        )}

        {d.step === 3 && (
          <Step title="어떤 고민인가요?" headingRef={headingRef}>
            <ChoiceGroup
              name="category"
              label="고민 종류"
              value={d.category}
              onChange={(v) => setD((p) => ({ ...p, category: v, template_id: p.category === v ? p.template_id : "", template_answers: p.category === v ? p.template_answers : [] }))}
              options={GOMIN.categories}
            />
          </Step>
        )}

        {d.step === 4 && (
          <Step title="고민을 들려주세요" headingRef={headingRef}>
            <div className="notice notice-danger privacy-notice">
              <strong>실명, 연락처, 주소, 학교·회사 이름은 쓰지 마세요.</strong>
              <br />
              방송에서 읽힐 수 있어요. “친구 A”, “우리 팀장님”처럼 써주세요.
            </div>

            <div className="seg" role="radiogroup" aria-label="쓰는 방식">
              {[
                { id: "template", label: "고민 틀로 쓰기", sub: "빈칸만 채우면 돼요" },
                { id: "free", label: "자유롭게 쓰기", sub: "하고 싶은 말을 마음껏" },
              ].map((m) => (
                <label key={m.id} className="choice">
                  <input
                    type="radio"
                    name="write_mode"
                    checked={d.write_mode === m.id}
                    onChange={() => set("write_mode", m.id as Draft["write_mode"])}
                  />
                  <span>
                    {m.label}
                    <span className="sub">{m.sub}</span>
                  </span>
                </label>
              ))}
            </div>

            {d.write_mode === "template" && (
              <div className="stack">
                <div className="template-pick" role="radiogroup" aria-label="고민 틀 고르기">
                  {templates.map((t) => (
                    <label key={t.id} className="choice template-choice">
                      <input
                        type="radio"
                        name="template"
                        checked={d.template_id === t.id}
                        onChange={() => setD((p) => ({ ...p, template_id: t.id, template_answers: templateBlanks(t).map(() => "") }))}
                      />
                      <span>{t.text.replace(/\[\[(.+?)\]\]/g, "___")}</span>
                    </label>
                  ))}
                </div>
                {template && (
                  <div className="sentence card-soft">
                    <TemplateSentence
                      text={template.text}
                      examples={template.examples}
                      answers={d.template_answers}
                      onChange={(i, v) =>
                        setD((p) => {
                          const a = [...p.template_answers];
                          a[i] = v;
                          return { ...p, template_answers: a };
                        })
                      }
                    />
                  </div>
                )}
                {template && (
                  <div className="field">
                    <label htmlFor="extra">덧붙이고 싶은 말 (선택)</label>
                    <textarea
                      id="extra"
                      className="textarea textarea-lg"
                      maxLength={5000}
                      value={d.body}
                      onChange={(e) => set("body", e.target.value)}
                      onKeyDown={ctrlEnter(next)}
                      placeholder="상황을 조금 더 자세히 알려주면 다웅이 더 잘 답해줄 수 있어요."
                    />
                  </div>
                )}
              </div>
            )}

            {d.write_mode === "free" && (
              <div className="field">
                <label htmlFor="body">고민 내용</label>
                <textarea
                  id="body"
                  className="textarea textarea-lg"
                  maxLength={5000}
                  value={d.body}
                  onChange={(e) => set("body", e.target.value)}
                  onKeyDown={ctrlEnter(next)}
                  placeholder="어떤 일이 있었는지, 어떤 마음인지 편하게 써주세요."
                  autoFocus
                />
                <div className="counter">{len(d.body)} / 5000</div>
              </div>
            )}

            {d.write_mode && (
              <div className="field">
                <label htmlFor="summary">이 고민을 한 줄로 줄이면?</label>
                <input
                  id="summary"
                  className="input"
                  value={d.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  placeholder="예) 약속에 늦은 친구, 내가 잘못한 걸까?"
                  aria-describedby="summary-help"
                />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span id="summary-help" className="faint">
                    방송에서 제목으로 써요
                  </span>
                  <span className={`counter ${len(d.summary) > 30 ? "over" : ""}`}>{len(d.summary)} / 30</span>
                </div>
              </div>
            )}

            {contacts.length > 0 && (
              <div className="notice notice-danger" role="alert">
                <strong>연락처처럼 보이는 내용이 있어요.</strong> 방송에서 읽힐 수 있으니 지워주세요:{" "}
                {contacts.map((c) => c.sample).join(", ")}
              </div>
            )}
            {d.write_mode && <p className="faint kbd-hint hide-touch">Ctrl + Enter 로 다음 단계로 넘어갈 수 있어요.</p>}
          </Step>
        )}

        {d.step === 5 && (
          <Step title="이 고민, 몇 도쯤 되나요?" headingRef={headingRef} hint="방향키(← →)로도 조절할 수 있어요.">
            <div className="temp">
              <Thermometer value={d.temperature} />
              <div className="temp-main">
                <div className="temp-value display" style={{ color: temperatureColor(d.temperature) }}>
                  {d.temperature}°
                </div>
                <div className="temp-label display" aria-live="polite">
                  {tempFace(d.temperature)} {temperatureLabel(d.temperature)}
                </div>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={d.temperature}
                  aria-label="고민 온도"
                  aria-valuetext={`${d.temperature}도, ${temperatureLabel(d.temperature)}`}
                  onChange={(e) => setD((p) => ({ ...p, temperature: Number(e.target.value), temp_touched: true }))}
                  style={{ ["--fill" as string]: `${d.temperature}%`, ["--tcolor" as string]: temperatureColor(d.temperature) }}
                  autoFocus
                />
                <div className="temp-scale" aria-hidden="true">
                  <span>0° 라면 뭐 먹지</span>
                  <span>50° 며칠째 신경 쓰임</span>
                  <span>100° 인생 걸림</span>
                </div>
              </div>
            </div>
          </Step>
        )}

        {d.step === 6 && (
          <Step title="어떤 말이 듣고 싶나요?" headingRef={headingRef}>
            <ChoiceGroup name="wish" label="듣고 싶은 말" wide value={d.wish} onChange={(v) => set("wish", v)} options={GOMIN.wishes} />
          </Step>
        )}

        {d.step === 7 && (
          <Step title="지금 기분을 우표로 붙여주세요" headingRef={headingRef}>
            <div className="stamp-picker" role="radiogroup" aria-label="감정 우표">
              {GOMIN.stamps.map((s) => (
                <label key={s.id} className="stamp-option">
                  <input type="radio" name="stamp" value={s.id} checked={d.stamp === s.id} onChange={() => set("stamp", s.id)} aria-label={s.label} />
                  <StampSticker stamp={s.id} size="md" pressed={d.stamp === s.id} />
                </label>
              ))}
            </div>
          </Step>
        )}

        {d.step === 8 && (
          <Step title="어떤 목소리로 읽어줄까요?" headingRef={headingRef} hint="방송에서 다웅이 이 말투로 사연을 읽어줘요.">
            <ChoiceGroup name="voice" label="읽어줄 목소리" wide value={d.voice} onChange={(v) => set("voice", v)} options={GOMIN.voices} />
          </Step>
        )}

        {d.step === 9 && (
          <Step title="공개 방식을 정해주세요" headingRef={headingRef}>
            <ChoiceGroup name="visibility" label="공개 방식" wide value={d.visibility} onChange={(v) => set("visibility", v)} options={GOMIN.visibilities} />
            <div className="stack" style={{ gap: 8 }}>
              <span className="label">필수 동의</span>
              <label className="check">
                <input type="checkbox" checked={d.consent_broadcast} onChange={(e) => set("consent_broadcast", e.target.checked)} />
                <span>방송에서 읽힐 수 있어요</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={d.consent_privacy} onChange={(e) => set("consent_privacy", e.target.checked)} />
                <span>실명, 연락처, 주소, 학교·회사 이름은 쓰지 않았어요</span>
              </label>
            </div>
          </Step>
        )}

        {d.step === 10 && (
          <Step title="이대로 보낼까요?" headingRef={headingRef}>
            <dl className="review">
              <ReviewRow label="이름" onEdit={() => go(1)}>
                {displayName} <span className="faint">({d.name_mode === "chzzk" ? "치지직 닉네임" : "랜덤 이름"})</span>
              </ReviewRow>
              <ReviewRow label="나에 대해" onEdit={() => go(2)}>
                {d.age}살 · {optionLabel(GOMIN.genders, d.gender)}
              </ReviewRow>
              <ReviewRow label="고민 종류" onEdit={() => go(3)}>
                {optionEmoji(GOMIN.categories, d.category)} {optionLabel(GOMIN.categories, d.category)}
              </ReviewRow>
              <ReviewRow label="한 줄 요약" onEdit={() => go(4)}>
                <strong>{d.summary}</strong>
              </ReviewRow>
              <ReviewRow label="고민 내용" onEdit={() => go(4)}>
                <span className="review-body">{body}</span>
              </ReviewRow>
              <ReviewRow label="고민 온도" onEdit={() => go(5)}>
                {d.temperature}° · {temperatureLabel(d.temperature)}
              </ReviewRow>
              <ReviewRow label="듣고 싶은 말" onEdit={() => go(6)}>
                {optionLabel(GOMIN.wishes, d.wish)}
              </ReviewRow>
              <ReviewRow label="감정 우표" onEdit={() => go(7)}>
                <StampSticker stamp={d.stamp} size="sm" />
              </ReviewRow>
              <ReviewRow label="읽어줄 목소리" onEdit={() => go(8)}>
                {optionLabel(GOMIN.voices, d.voice)}
              </ReviewRow>
              <ReviewRow label="공개 방식" onEdit={() => go(9)}>
                {optionLabel(GOMIN.visibilities, d.visibility)}
              </ReviewRow>
            </dl>
            {needsCare(body) && (
              <p className="notice" style={{ margin: 0 }}>
                보내고 나면 도움받을 수 있는 곳도 함께 알려드릴게요.
              </p>
            )}
          </Step>
        )}

        {(showError && stepError) || error ? (
          <p className="notice notice-danger step-error" role="alert">
            {error || stepError}
          </p>
        ) : null}

        <div className="step-actions">
          {d.step > 1 ? (
            <button type="button" className="btn" onClick={() => go(d.step - 1)}>
              ← 이전
            </button>
          ) : (
            <Link to="/" className="btn btn-ghost">
              그만두기
            </Link>
          )}
          <span className="spacer" />
          <button type="submit" className="btn btn-primary btn-next" disabled={sending}>
            {d.step === TOTAL ? (sending ? "보내는 중…" : "사연 부치기") : "다음 →"}
          </button>
        </div>
        <p className="faint kbd-hint hide-touch" style={{ textAlign: "right", margin: 0 }}>
          Enter 로 다음, Tab 으로 이동
        </p>
      </form>
    </div>
  );
}

const ANALYZE_STEPS = ["사연 읽는 중", "감정 우표 확인하는 중", "고민 온도 재는 중", "어울리는 동물 찾는 중"];

/** 사연을 보내고 고민 동물을 찾는 동안 보여주는 화면 */
function Analyzing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % ANALYZE_STEPS.length), 1800);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="analyzing" role="status" aria-live="polite">
      <div className="analyzing-box">
        <div className="analyzing-lens" aria-hidden="true">
          <span className="analyzing-q">?</span>
        </div>
        <p className="analyzing-title">고민 동물을 찾고 있어요</p>
        <p className="analyzing-step" key={i}>
          {ANALYZE_STEPS[i]}…
        </p>
        <p className="analyzing-note">길면 30초쯤 걸려요. 창을 닫지 말아주세요.</p>
      </div>
    </div>
  );
}

function ctrlEnter(fn: () => void) {
  return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      fn();
    }
  };
}

function tempFace(t: number) {
  if (t <= 15) return "🍜";
  if (t <= 40) return "🙂";
  if (t <= 60) return "😕";
  if (t <= 85) return "😣";
  return "🔥";
}

function Step({
  title,
  hint,
  children,
  headingRef,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="step-body">
      <div className="step-head">
        <h1 className="display step-title" tabIndex={-1} ref={headingRef}>
          {title}
        </h1>
        {hint && <p className="muted step-hint">{hint}</p>}
      </div>
      <div className="stack">{children}</div>
    </div>
  );
}

function ReviewRow({ label, children, onEdit }: { label: string; children: ReactNode; onEdit: () => void }) {
  return (
    <div className="review-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit} aria-label={`${label} 고치기`}>
        고치기
      </button>
    </div>
  );
}

function TemplateSentence({
  text,
  examples,
  answers,
  onChange,
}: {
  text: string;
  examples: string[];
  answers: string[];
  onChange: (i: number, v: string) => void;
}) {
  const parts = text.split(/(\[\[.+?\]\])/g);
  let i = -1;
  return (
    <>
    <p className="sentence-text">
      {parts.map((p, k) => {
        const m = p.match(/^\[\[(.+)\]\]$/);
        if (!m) return <span key={k}>{p}</span>;
        i++;
        const idx = i;
        const v = answers[idx] ?? "";
        return (
          <input
            key={k}
            className="blank"
            aria-label={m[1]}
            value={v}
            maxLength={200}
            placeholder={m[1]}
            title={examples[idx] ? `예) ${examples[idx]}` : undefined}
            onChange={(e) => onChange(idx, e.target.value)}
            style={{ width: `${Math.min(26, Math.max(6, Math.max([...v].length, [...m[1]].length) + 2)) * 1.05}em` }}
            autoFocus={idx === 0}
          />
        );
      })}
    </p>
    {examples.length > 0 && <p className="faint sentence-example">예시: {examples.join(" / ")}</p>}
    </>
  );
}
