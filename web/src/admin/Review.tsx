import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { errMsg, typingTarget, useAdmin, useWide, type ListItem, type StoryBundle } from "./api";
import { AnimalMini, CareNote, Facts, FlagChips, Kbd, Temp, Who, RiskNote, confirmRiskyApprove } from "./parts";
import { StampSticker, Spinner, useToast } from "../components/ui";
import { formatDate, shortDate } from "../lib/format";

type Undo = { ids: string[]; label: string };

/** 검토 대기: 오래된 사연부터 빠르게 승인 / 반려 */
export default function Review() {
  const { call, isOwner, pendingCount, setPendingCount } = useAdmin();
  const toast = useToast();
  const wide = useWide(900);
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [cur, setCur] = useState(0);
  const [details, setDetails] = useState<Record<string, StoryBundle>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<Undo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await call<{ items: ListItem[]; pending_count: number }>("list", { filters: { status: "pending" }, sort: "oldest", page: 0 });
      setItems(res.items);
      setPendingCount(res.pending_count);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [call, setPendingCount]);

  useEffect(() => {
    load();
  }, [load]);

  const current = items?.[cur] ?? null;

  // 지금 사연과 다음 사연의 본문을 미리 불러옵니다.
  useEffect(() => {
    if (!items) return;
    for (const s of [items[cur], items[cur + 1]]) {
      if (!s || details[s.id]) continue;
      call<StoryBundle>("get", { id: s.id })
        .then((b) => setDetails((d) => ({ ...d, [s.id]: b })))
        .catch(() => {});
    }
  }, [items, cur, call, details]);

  // 지금 사연이 화면에 보이도록
  useEffect(() => {
    if (current) rowRefs.current[current.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);

  const decide = useCallback(
    async (ids: string[], status: "approved" | "rejected") => {
      if (!ids.length || busy) return;
      if (status === "approved" && !confirmRiskyApprove((items ?? []).filter((s) => ids.includes(s.id)))) return;
      setBusy(true);
      try {
        await call("set_status", { ids, status });
        setItems((list) => {
          const next = (list ?? []).filter((s) => !ids.includes(s.id));
          setCur((c) => Math.min(c, Math.max(0, next.length - 1)));
          return next;
        });
        setSelected(new Set());
        setPendingCount(Math.max(0, pendingCount - ids.length));
        setUndo({ ids, label: `${ids.length > 1 ? `${ids.length}개` : "1개"} ${status === "approved" ? "승인" : "반려"}했어요` });
      } catch (e) {
        toast(errMsg(e));
      } finally {
        setBusy(false);
      }
    },
    [busy, call, items, pendingCount, setPendingCount, toast],
  );

  const doUndo = async () => {
    if (!undo) return;
    try {
      await call("set_status", { ids: undo.ids, status: "pending" });
      setUndo(null);
      toast("검토 대기로 되돌렸어요");
      await load();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const star = async (s: ListItem) => {
    try {
      const r = await call<{ starred: boolean }>("toggle_star", { id: s.id });
      setItems((list) => (list ?? []).map((x) => (x.id === s.id ? { ...x, starred: r.starred } : x)));
    } catch (e) {
      toast(errMsg(e));
    }
  };

  // 단축키: J/K 이동, A 승인, R 반려, X 선택, S 별표
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typingTarget(e) || e.metaKey || e.ctrlKey || e.altKey || !items?.length) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCur((c) => Math.min(items.length - 1, c + 1));
      } else if (k === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCur((c) => Math.max(0, c - 1));
      } else if (k === "a" && isOwner && current) {
        decide([current.id], "approved");
      } else if (k === "r" && isOwner && current) {
        decide([current.id], "rejected");
      } else if (k === "x" && current) {
        setSelected((sel) => {
          const n = new Set(sel);
          if (n.has(current.id)) n.delete(current.id);
          else n.add(current.id);
          return n;
        });
      } else if (k === "s" && current) {
        star(current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, current, isOwner, decide]);

  if (error)
    return (
      <p className="adm-error" role="alert">
        {error}
      </p>
    );
  if (!items) return <Spinner />;

  const toggleSel = (id: string) =>
    setSelected((sel) => {
      const n = new Set(sel);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">검토 대기</h1>
          <p className="adm-dim">
            오래된 사연부터 보여줘요. 승인하면 방송 대기열에 들어가고, 반려하면 사연자에게 "이번엔 방송에 소개되지 않아요"로 보여요.
          </p>
        </div>
        <span className="adm-bigcount">
          <b className="adm-mono">{items.length}</b>
          <span>개 남음</span>
        </span>
      </header>

      {wide && isOwner && items.length > 0 && (
        <p className="adm-keys" aria-label="단축키">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd> 이동 <Kbd>A</Kbd> 승인 <Kbd>R</Kbd> 반려 <Kbd>X</Kbd> 선택 <Kbd>S</Kbd> 별표
        </p>
      )}
      {!isOwner && <p className="adm-note">매니저는 검토 대기 사연을 보고 별표만 붙일 수 있어요. 승인과 반려는 방장이 해요.</p>}

      {undo && (
        <div className="adm-undo" role="status">
          <span>{undo.label}</span>
          <button className="adm-linkbtn" onClick={doUndo}>
            되돌리기
          </button>
          <button className="adm-linkbtn adm-dim" onClick={() => setUndo(null)} aria-label="알림 닫기">
            닫기
          </button>
        </div>
      )}

      {isOwner && items.length > 0 && (
        <div className="adm-bulk">
          <label className="adm-checkline">
            <input
              type="checkbox"
              checked={selected.size > 0 && selected.size === items.length}
              ref={(el) => {
                if (el) el.indeterminate = selected.size > 0 && selected.size < items.length;
              }}
              onChange={(e) => setSelected(e.target.checked ? new Set(items.map((s) => s.id)) : new Set())}
            />
            전체 선택
          </label>
          {selected.size > 0 && (
            <>
              <span className="adm-mono">{selected.size}개 선택</span>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => decide([...selected], "approved")}>
                선택 승인
              </button>
              <button className="btn btn-sm btn-reject" disabled={busy} onClick={() => decide([...selected], "rejected")}>
                선택 반려
              </button>
            </>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="adm-empty">
          <p className="adm-title-sm">검토할 사연이 없어요</p>
          <p className="adm-dim">
            새 사연이 들어오면 여기에 쌓여요. 승인한 사연은 <Link to="/admin/broadcast">방송</Link>에서 확인할 수 있어요.
          </p>
        </div>
      ) : (
        <ol className="adm-review">
          {items.map((s, i) => {
            const open = i === cur;
            const d = details[s.id];
            return (
              <li
                key={s.id}
                ref={(el) => {
                  rowRefs.current[s.id] = el;
                }}
                className={`adm-rv ${open ? "is-open" : ""} ${s.flags.includes("care") ? "is-care" : ""}`}
              >
                <div className="adm-rv-head">
                  {isOwner && (
                    <input type="checkbox" className="adm-rv-check" checked={selected.has(s.id)} onChange={() => toggleSel(s.id)} aria-label={`#${s.receipt_no} 선택`} />
                  )}
                  <button className="adm-rv-toggle" aria-expanded={open} onClick={() => setCur(i)}>
                    <span className="adm-no">#{s.receipt_no}</span>
                    <StampSticker stamp={s.stamp} size="sm" />
                    <span className="adm-rv-sum">
                      <b>{s.summary}</b>
                      <span className="adm-dim">
                        {s.broadcast_name} · {shortDate(s.created_at)}
                      </span>
                    </span>
                    <span className="adm-rv-side">
                      <FlagChips flags={s.flags} />
                      {s.starred && <span className="adm-star" aria-label="별표">★</span>}
                      {s.animal && (
                        <span className="adm-rv-animal" title={s.animal.name} aria-label={`고민 동물 ${s.animal.name}`}>
                          {s.animal.emoji}
                        </span>
                      )}
                      <Temp t={s.temperature} />
                    </span>
                  </button>
                </div>

                {open && (
                  <div className="adm-rv-body">
                    {s.flags.includes("care") && <CareNote />}
                    <RiskNote flags={s.flags} />
                    <div className="adm-rv-grid">
                      <div className="adm-rv-main">
                        <p className="adm-rv-meta">
                          <Who s={s} /> <span className="adm-dim">· {formatDate(s.created_at, true)}</span>
                        </p>
                        <h2 className="adm-summary">{s.summary}</h2>
                        {d ? <div className="adm-body">{d.story.body}</div> : <p className="adm-dim">본문 불러오는 중…</p>}
                        <Facts s={s} />
                      </div>
                      <aside className="adm-rv-aside" aria-label="시청자가 받은 고민 동물">
                        <p className="adm-label">시청자가 받은 고민 동물</p>
                        {d ? <AnimalMini a={d.animal} state={s.animal_state} /> : <p className="adm-dim">불러오는 중…</p>}
                      </aside>
                    </div>
                    <div className="adm-rv-actions">
                      {isOwner && (
                        <>
                          <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => decide([s.id], "approved")}>
                            승인 {wide && <Kbd>A</Kbd>}
                          </button>
                          <button className="btn btn-reject btn-lg" disabled={busy} onClick={() => decide([s.id], "rejected")}>
                            반려 {wide && <Kbd>R</Kbd>}
                          </button>
                        </>
                      )}
                      <button className="btn" onClick={() => star(s)} aria-pressed={s.starred}>
                        {s.starred ? "별표 떼기" : "별표"}
                      </button>
                      <span className="spacer" />
                      <Link className="adm-linkbtn" to={`/admin/stories/${s.id}`}>
                        자세히 보기
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
