import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GOMIN, optionLabel } from "@shared/boxes.ts";
import { errMsg, useAdmin, useWide, type ListItem } from "./api";
import { StampSticker, temperatureColor } from "../components/ui";
import { ADMIN_STATUS, FLAG_LABEL, ageGender, shortDate } from "../lib/format";
import StoryDetail from "./StoryDetail";

type Filters = {
  category: string;
  stamp: string;
  gender: string;
  voice: string;
  status: string;
  visibility: string;
  replied: string;
  flag: string;
  age_min: string;
  age_max: string;
  q: string;
};

const EMPTY: Filters = {
  category: "",
  stamp: "",
  gender: "",
  voice: "",
  status: "",
  visibility: "",
  replied: "",
  flag: "",
  age_min: "",
  age_max: "",
  q: "",
};

export default function Stories() {
  const { id } = useParams();
  const wide = useWide(1100);
  const nav = useNavigate();
  const { call } = useAdmin();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // 검색어는 조금 기다렸다가 반영
  useEffect(() => {
    const t = window.setTimeout(() => setFilters((f) => (f.q === q ? f : { ...f, q })), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [filters, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const f: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(filters)) if (v !== "") f[k] = v;
      const res = await call<{ items: ListItem[]; total: number; page_size: number }>("list", { filters: f, sort, page });
      setItems(res.items);
      setTotal(res.total);
      setPageSize(res.page_size);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [call, filters, sort, page]);

  useEffect(() => {
    load();
  }, [load, reload]);

  const activeCount = useMemo(() => Object.entries(filters).filter(([k, v]) => k !== "q" && v !== "").length, [filters]);
  const set = (k: keyof Filters) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const list = (
    <section className="adm-list" aria-label="사연 목록">
      <div className="adm-list-head">
        <div className="adm-search">
          <label htmlFor="adm-q" className="sr-only">
            키워드 검색
          </label>
          <input id="adm-q" className="input" type="search" placeholder="요약, 본문, 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="row adm-list-tools">
          <label className="sr-only" htmlFor="adm-sort">
            정렬
          </label>
          <select id="adm-sort" className="select adm-select-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">최신순</option>
            <option value="temperature">온도순</option>
            <option value="oldest">오래된순</option>
          </select>
          <button className="btn btn-sm" aria-expanded={showFilters} aria-controls="adm-filters" onClick={() => setShowFilters((s) => !s)}>
            필터{activeCount ? ` ${activeCount}` : ""}
          </button>
          {(activeCount > 0 || q) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFilters(EMPTY);
                setQ("");
              }}
            >
              초기화
            </button>
          )}
        </div>
        {showFilters && (
          <div id="adm-filters" className="adm-filters">
            <Select label="종류" value={filters.category} onChange={set("category")} options={GOMIN.categories} />
            <Select label="우표" value={filters.stamp} onChange={set("stamp")} options={GOMIN.stamps} />
            <Select label="성별" value={filters.gender} onChange={set("gender")} options={GOMIN.genders} />
            <Select label="목소리" value={filters.voice} onChange={set("voice")} options={GOMIN.voices} />
            <Select
              label="상태"
              value={filters.status}
              onChange={set("status")}
              options={Object.entries(ADMIN_STATUS).map(([id, label]) => ({ id, label }))}
            />
            <Select label="공개 방식" value={filters.visibility} onChange={set("visibility")} options={GOMIN.visibilities} />
            <Select
              label="답장"
              value={filters.replied}
              onChange={set("replied")}
              options={[
                { id: "no", label: "아직 안 함" },
                { id: "yes", label: "답장 보냄" },
              ]}
            />
            <Select
              label="표시"
              value={filters.flag}
              onChange={set("flag")}
              options={Object.entries(FLAG_LABEL).map(([id, label]) => ({ id, label }))}
            />
            <div className="field">
              <label htmlFor="adm-age-min">나이</label>
              <div className="row adm-age">
                <input id="adm-age-min" className="input" type="number" inputMode="numeric" min={5} max={99} placeholder="부터" value={filters.age_min} onChange={(e) => set("age_min")(e.target.value)} />
                <span aria-hidden="true">~</span>
                <label htmlFor="adm-age-max" className="sr-only">
                  나이 끝
                </label>
                <input id="adm-age-max" className="input" type="number" inputMode="numeric" min={5} max={99} placeholder="까지" value={filters.age_max} onChange={(e) => set("age_max")(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        <p className="faint" aria-live="polite">
          {loading ? "불러오는 중…" : `${total}개`}
        </p>
      </div>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <ul className="adm-rows">
        {items.map((s) => (
          <li key={s.id}>
            <Link to={`/admin/s/${s.id}`} className={`adm-row ${s.id === id ? "is-active" : ""} ${s.flags.includes("care") ? "is-care" : ""}`}>
              <div className="adm-row-top">
                <span className="adm-no">#{s.receipt_no}</span>
                <span className={`chip adm-status st-${s.status}`}>{ADMIN_STATUS[s.status] ?? s.status}</span>
                {s.flags.map((f) => (
                  <span key={f} className={`chip ${f === "care" ? "chip-red" : "adm-flag"}`}>
                    {FLAG_LABEL[f] ?? f}
                  </span>
                ))}
                <span className="spacer" />
                <span className="faint">{shortDate(s.created_at)}</span>
              </div>
              <div className="adm-row-main">
                <StampSticker stamp={s.stamp} size="sm" />
                <div className="adm-row-text">
                  <strong>{s.summary}</strong>
                  <span className="faint">
                    {s.broadcast_name}
                    {ageGender(s.age, s.gender) ? ` · ${ageGender(s.age, s.gender)}` : ""} · {optionLabel(GOMIN.categories, s.category)}
                  </span>
                </div>
                <span className="adm-temp" style={{ ["--t" as string]: temperatureColor(s.temperature) }} title="고민 온도">
                  {s.temperature}°
                </span>
              </div>
              <div className="adm-row-bottom faint">
                {s.animal && (
                  <span title={s.animal.name}>
                    <span aria-hidden="true">{s.animal.emoji}</span> {s.animal.name}
                  </span>
                )}
                <span>{s.reply_sent_at ? (s.reply_kind === "auto" ? "자동 답장 보냄" : "답장 보냄") : s.has_draft ? "답장 쓰는 중" : "답장 전"}</span>
                {s.follow_up_count > 0 && <span>후속 보고 {s.follow_up_count}</span>}
              </div>
            </Link>
          </li>
        ))}
        {!loading && !items.length && <li className="adm-empty">조건에 맞는 사연이 없어요.</li>}
      </ul>
      {pages > 1 && (
        <div className="row adm-pager">
          <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            이전
          </button>
          <span className="faint">
            {page + 1} / {pages}
          </span>
          <button className="btn btn-sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            다음
          </button>
        </div>
      )}
    </section>
  );

  const detail = id ? (
    <StoryDetail
      key={id}
      id={id}
      onChanged={() => setReload((r) => r + 1)}
      onDeleted={() => {
        setReload((r) => r + 1);
        nav("/admin");
      }}
      onBack={wide ? undefined : () => nav("/admin")}
    />
  ) : (
    <div className="adm-panel adm-placeholder">
      <p className="display">왼쪽에서 사연을 골라주세요</p>
      <p className="faint">사연을 누르면 여기에서 자세히 보고 답장을 쓸 수 있어요.</p>
    </div>
  );

  if (!wide) return id ? detail : list;
  return (
    <div className="adm-split">
      {list}
      <div className="adm-detail-col">{detail}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  const fid = `adm-f-${label}`;
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      <select id={fid} className="select adm-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
