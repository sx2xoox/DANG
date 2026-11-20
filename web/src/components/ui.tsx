import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { GOMIN, HELP_LINES, type Option } from "@shared/boxes.ts";

// ---------------------------------------------------------------- 토스트
const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status" aria-live="polite">
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------- 대화상자
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, input, textarea, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog card stack" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2 className="display" style={{ fontSize: 24 }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 감정 우표
export function StampSticker({
  stamp,
  size = "md",
  pressed = false,
}: {
  stamp: string;
  size?: "sm" | "md" | "lg";
  pressed?: boolean;
}) {
  const s = GOMIN.stamps.find((x) => x.id === stamp);
  if (!s) return null;
  return (
    <span
      className={`stamp stamp-${size}${pressed ? " stamp-pressed" : ""}`}
      style={{ ["--stamp" as string]: s.color }}
      aria-label={`감정 우표: ${s.label}`}
      role="img"
    >
      <span className="stamp-inner">
        <span className="stamp-emoji" aria-hidden="true">
          {s.emoji}
        </span>
        <span className="stamp-label">{s.label}</span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- 온도계
export function temperatureColor(t: number): string {
  // 파랑 → 노랑 → 빨강
  const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
  const from = t <= 50 ? [37, 99, 235] : [255, 212, 0];
  const to = t <= 50 ? [255, 212, 0] : [225, 29, 46];
  const k = t <= 50 ? t / 50 : (t - 50) / 50;
  return `rgb(${lerp(from[0], to[0], k)}, ${lerp(from[1], to[1], k)}, ${lerp(from[2], to[2], k)})`;
}

export function Thermometer({ value, height = 220 }: { value: number; height?: number }) {
  const color = temperatureColor(value);
  const tubeTop = 14;
  const tubeBottom = height - 62;
  const fillTop = tubeBottom - ((tubeBottom - tubeTop) * value) / 100;
  return (
    <svg width="96" height={height} viewBox={`0 0 96 ${height}`} role="img" aria-label={`고민 온도 ${value}도`}>
      <rect x="34" y="6" width="28" height={height - 40} rx="14" fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth="2" />
      <rect
        x="40"
        y={fillTop}
        width="16"
        height={Math.max(0, tubeBottom - fillTop + 20)}
        rx="8"
        fill={color}
        style={{ transition: "y 0.2s ease, height 0.2s ease, fill 0.2s ease" }}
      />
      <circle cx="48" cy={height - 30} r="24" fill={color} stroke="var(--border-strong)" strokeWidth="2" style={{ transition: "fill 0.2s" }} />
      {[0, 25, 50, 75, 100].map((t) => {
        const y = tubeBottom - ((tubeBottom - tubeTop) * t) / 100;
        return (
          <g key={t}>
            <line x1="64" x2="72" y1={y} y2={y} stroke="var(--text-faint)" strokeWidth="2" />
            <text x="76" y={y + 4} fontSize="11" fill="var(--text-faint)">
              {t}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- 도움 연락처
export function HelpLines({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`help-lines ${compact ? "compact" : ""}`} aria-label="도움받을 수 있는 곳">
      <h2 className="display">혼자 견디지 마세요</h2>
      {!compact && <p>지금 많이 힘들다면, 아래 번호로 바로 이야기할 수 있어요. 24시간, 무료예요.</p>}
      <ul>
        {HELP_LINES.map((h) => (
          <li key={h.tel}>
            <a href={`tel:${h.tel.replace(/-/g, "")}`} className="btn btn-sm">
              {h.name} <b>{h.tel}</b>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- 선택 카드 묶음
export function ChoiceGroup({
  name,
  options,
  value,
  onChange,
  wide = false,
  label,
  showEmoji = false,
}: {
  name: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  label: string;
  showEmoji?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`choice-grid ${wide ? "wide" : ""}`}>
      {options.map((o) => (
        <label key={o.id} className="choice">
          <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
          {showEmoji && o.emoji && (
            <span className="emoji" aria-hidden="true">
              {o.emoji}
            </span>
          )}
          <span>
            {o.label}
            {o.desc && <span className="sub">{o.desc}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Spinner({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div className="center" role="status">
      <div className="stack" style={{ alignItems: "center" }}>
        <div className="spinner" />
        <span className="faint">{label}</span>
      </div>
    </div>
  );
}

export function MailIcon({ size = 22, color = "#0B1220" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
