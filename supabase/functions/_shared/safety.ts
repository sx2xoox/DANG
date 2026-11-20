// =====================================================================
// 안전/개인정보 검사 (화면과 서버가 같이 씀)
// =====================================================================

const PHONE = /(?:\+?82[-\s.]?)?0(?:1[016789]|[2-6]\d?)[-\s.]?\d{3,4}[-\s.]?\d{4}/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const RRN = /\d{6}[-\s]?[1-4]\d{6}/g;
const HANDLE = /(?:카톡|카카오톡|인스타|인스타그램|디코|디스코드|트위터|틱톡)\s*(?:아이디|ID|id)?\s*[:：]?\s*@?[A-Za-z0-9._-]{3,}/g;
const AT_HANDLE = /(^|\s)@[A-Za-z0-9._]{3,}/g;

const SURNAMES =
  "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉";
const PERSON = new RegExp(
  `[${SURNAMES}][가-힣]{1,2}(?=\\s?(?:씨|님|선배|후배|쌤|선생님|교수님|팀장|과장|부장|차장|대리|사원|주임|실장|원장|사장|형|누나|오빠|언니))`,
  "g",
);
const SCHOOL = /[가-힣A-Za-z]{2,12}(?:초등학교|중학교|고등학교|여자고등학교|여자중학교|대학교|대학원|여고|여중|외고|과학고)/g;
const COMPANY = /[가-힣A-Za-z]{2,12}(?:전자|그룹|은행|증권|건설|물산|주식회사|㈜|코리아)/g;
const ADDRESS = /(?:[가-힣]{1,6}(?:시|도)\s)?[가-힣]{1,6}(?:구|군)\s[가-힣0-9]{1,10}(?:동|로|길|읍|면)(?:\s?\d+(?:-\d+)?)?|\d{1,4}동\s?\d{1,4}호|[가-힣0-9]{1,10}(?:로|길)\s?\d{1,4}(?:-\d{1,4})?(?=\s|$|,|\.)/g;

const CARE_WORDS = [
  "자살", "자해", "죽고 싶", "죽고싶", "죽어버리", "뛰어내리", "목숨", "손목", "극단적", "사라지고 싶",
  "사라지고싶", "살기 싫", "살기싫", "그만 살", "유서", "목을 매", "약을 모아", "학대", "때려요", "때려서",
  "때리고", "맞고 있", "폭행", "폭력", "성폭", "성추행", "성희롱", "스토킹", "가정폭력", "왕따",
  "괴롭힘", "따돌림", "협박", "죽을 것 같", "숨이 안 쉬어", "공황",
];

const PROFANITY = [
  "씨발", "시발", "씨빨", "ㅅㅂ", "ㅆㅂ", "병신", "븅신", "ㅂㅅ", "개새끼", "개새기", "좆", "존나",
  "졸라", "지랄", "ㅈㄹ", "미친놈", "미친년", "꺼져", "닥쳐", "엿먹", "fuck", "shit", "썅", "느금",
];

const TARGETING = ["저격", "폭로", "박제", "신상", "고소할", "고발할", "참교육", "죽여버", "매장시", "망신 줘"];

function hits(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w.toLowerCase()));
}

export type ContactWarning = { kind: "phone" | "email" | "rrn" | "handle"; sample: string };

/** 제출 전에 경고할 연락처 비슷한 내용 */
export function findContacts(text: string): ContactWarning[] {
  const out: ContactWarning[] = [];
  for (const m of text.matchAll(PHONE)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 9) out.push({ kind: "phone", sample: m[0] });
  }
  for (const m of text.matchAll(EMAIL)) out.push({ kind: "email", sample: m[0] });
  for (const m of text.matchAll(RRN)) out.push({ kind: "rrn", sample: m[0] });
  for (const m of text.matchAll(HANDLE)) out.push({ kind: "handle", sample: m[0] });
  return out;
}

export function needsCare(text: string): boolean {
  return hits(text, CARE_WORDS).length > 0;
}

export function containsProfanity(text: string): boolean {
  return hits(text, PROFANITY).length > 0;
}

/** 관리자 페이지에 붙일 표시 */
export function detectFlags(text: string): string[] {
  const flags: string[] = [];
  if (needsCare(text)) flags.push("care");
  if (containsProfanity(text)) flags.push("profanity");
  if (hits(text, TARGETING).length > 0 || AT_HANDLE.test(text)) flags.push("targeting");
  AT_HANDLE.lastIndex = 0;
  if (findContacts(text).length > 0) flags.push("pii");
  return flags;
}

/** AI 에게 보내기 전에 이름, 연락처처럼 보이는 부분을 가립니다. */
export function redact(text: string, extraNames: string[] = []): string {
  let t = text;
  for (const name of extraNames) {
    const n = name.trim();
    if (n.length >= 2) t = t.split(n).join("[이름]");
  }
  t = t
    .replace(EMAIL, "[이메일]")
    .replace(RRN, "[개인정보]")
    .replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 9 ? "[연락처]" : m))
    .replace(HANDLE, "[아이디]")
    .replace(AT_HANDLE, "$1[아이디]")
    .replace(SCHOOL, "[학교]")
    .replace(COMPANY, "[회사]")
    .replace(ADDRESS, "[주소]")
    .replace(PERSON, "[이름]");
  return t;
}

/** AI 결과물에 들어가면 안 되는 내용이 있는지 확인 */
export function outputProblems(text: string, forbidden: string[] = []): string[] {
  const problems: string[] = [];
  if (findContacts(text).length) problems.push("연락처 형태가 들어 있음");
  if (containsProfanity(text)) problems.push("욕설이 들어 있음");
  if (/\[(이름|이메일|연락처|아이디|학교|회사|주소|개인정보)\]/.test(text)) problems.push("가린 정보 표시가 들어 있음");
  for (const f of forbidden) {
    const v = f.trim();
    if (v.length >= 2 && text.includes(v)) problems.push(`사연 속 고유 정보("${v}")가 들어 있음`);
  }
  return problems;
}
