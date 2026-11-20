// =====================================================================
// 사연함 설정 (화면과 서버가 같이 씀)
// 새 사연함(예: 환불원정대)을 추가하려면 BOXES 에 항목을 하나 더 만들고
// DB boxes 테이블에 같은 id 로 한 줄을 넣으면 됩니다.
// =====================================================================

export type Option = { id: string; label: string; emoji?: string; desc?: string; color?: string };

export type Template = {
  id: string;
  /** [[빈칸 이름]] 자리에 입력칸이 들어갑니다. */
  text: string;
  /** 빈칸마다 보여줄 예시 (순서대로) */
  examples: string[];
};

export type BoxConfig = {
  id: string;
  name: string;
  categories: Option[];
  templates: Record<string, Template[]>;
  wishes: Option[];
  stamps: Option[];
  voices: Option[];
  visibilities: Option[];
  genders: Option[];
};

export const GOMIN: BoxConfig = {
  id: "gomin",
  name: "고민 사연함",
  categories: [
    { id: "love", label: "연애", emoji: "💌" },
    { id: "friend", label: "친구", emoji: "🤝" },
    { id: "family", label: "가족", emoji: "🏠" },
    { id: "school_work", label: "학교·직장", emoji: "🏫" },
    { id: "career", label: "진로·공부", emoji: "🧭" },
    { id: "money", label: "돈", emoji: "💸" },
    { id: "self", label: "나 자신", emoji: "🪞", desc: "외모·건강·성격" },
    { id: "etc", label: "기타", emoji: "📦" },
  ],
  templates: {
    love: [
      {
        id: "love-reply",
        text: "제가 [[누구]]한테 [[한 말이나 행동]] 했는데, 돌아온 답이 [[받은 답]] 였어요. 무슨 뜻일까요?",
        examples: ["썸 타는 사람", "주말에 영화 보자고", "\"아 그날 좀 바빠ㅠ\""],
      },
      {
        id: "love-confess",
        text: "[[누구]]를 좋아한 지 [[기간]] 됐는데, [[걸리는 점]] 때문에 고백을 못 하겠어요.",
        examples: ["같은 반 친구", "6개월", "친구 사이가 깨질까 봐"],
      },
      {
        id: "love-fight",
        text: "연인과 [[다투는 이유]] 때문에 자주 다퉈요. 제 마음은 [[내 마음]]인데 어떻게 해야 할까요?",
        examples: ["연락 빈도", "서운하지만 헤어지고 싶진 않아요"],
      },
    ],
    friend: [
      {
        id: "friend-fault",
        text: "친구가 [[친구가 한 일]] 했는데, 제가 [[내가 한 일]] 한 게 잘못인가요?",
        examples: ["말도 없이 약속을 취소", "단톡방에서 서운하다고 말"],
      },
      {
        id: "friend-distance",
        text: "[[어떤 친구]]랑 요즘 [[달라진 점]] 서운해요. 제가 먼저 [[하고 싶은 것]] 해도 될까요?",
        examples: ["10년 지기 친구", "연락이 뜸해져서", "연락"],
      },
      {
        id: "friend-new",
        text: "[[새로운 곳]]에서 친구를 사귀고 싶은데, [[어려운 점]] 어려워요.",
        examples: ["새 학교", "먼저 말 거는 게"],
      },
    ],
    family: [
      {
        id: "family-want",
        text: "부모님이 [[부모님이 바라는 것]] 하라고 하시는데, 저는 [[내가 하고 싶은 것]] 하고 싶어요.",
        examples: ["공무원 시험 준비", "디자인 공부"],
      },
      {
        id: "family-distance",
        text: "[[가족 중 누구]]랑 [[생긴 일]] 때문에 사이가 멀어졌어요. 다시 [[바라는 것]] 싶어요.",
        examples: ["동생", "말다툼", "편하게 지내고"],
      },
    ],
    school_work: [
      {
        id: "work-person",
        text: "[[학교나 회사]]에서 [[어떤 사람]]이 [[한 일]] 해서 너무 스트레스예요.",
        examples: ["회사", "팀장님", "제 일을 자꾸 다른 사람 앞에서 지적"],
      },
      {
        id: "work-stuck",
        text: "[[맡은 일이나 과제]]을(를) 맡았는데 [[어려운 점]] 때문에 막막해요.",
        examples: ["조별 과제 발표", "조원들이 연락을 안 해서"],
      },
      {
        id: "work-quit",
        text: "[[그만두고 싶은 것]]을(를) 그만둘지 고민이에요. 가장 걸리는 건 [[걱정]]이에요.",
        examples: ["지금 다니는 알바", "다음 자리를 못 구할까 봐"],
      },
    ],
    career: [
      {
        id: "career-choice",
        text: "[[선택지 A]]와(과) [[선택지 B]] 중에 고민이에요. 마음은 [[마음이 가는 쪽]] 쪽이에요.",
        examples: ["취업", "대학원", "대학원"],
      },
      {
        id: "career-anxious",
        text: "[[목표]]을(를) 준비 중인데, [[걱정]] 때문에 자꾸 불안해요.",
        examples: ["편입 시험", "시간이 부족할 것 같아서"],
      },
      {
        id: "career-dream",
        text: "하고 싶은 게 [[하고 싶은 것]]인데, 주변에서는 [[주변 반응]]라고 해요.",
        examples: ["웹툰 작가", "현실적으로 생각하"],
      },
    ],
    money: [
      {
        id: "money-buy",
        text: "[[사고 싶은 것]]을(를) 사고 싶은데 [[가격]] 원이라 망설여져요.",
        examples: ["새 키보드", "25만"],
      },
      {
        id: "money-leak",
        text: "한 달에 [[금액]] 원 정도 쓰는데, 자꾸 [[새는 곳]]에 돈이 새요.",
        examples: ["50만", "배달 음식"],
      },
      {
        id: "money-lend",
        text: "[[누구]]한테 [[금액]] 원을 빌려줬는데, [[지금 상황]].",
        examples: ["친구", "30만", "갚을 생각이 없어 보여요"],
      },
    ],
    self: [
      {
        id: "self-feel",
        text: "요즘 제 [[외모, 건강, 성격 중 무엇]] 때문에 [[어떤 기분]]이에요.",
        examples: ["피부", "사람 만나기 싫은 기분"],
      },
      {
        id: "self-change",
        text: "저는 [[내 성격]] 편인데, [[바꾸고 싶은 모습]] 사람이 되고 싶어요.",
        examples: ["거절을 잘 못하는", "할 말은 하는"],
      },
      {
        id: "self-habit",
        text: "[[고치고 싶은 습관]]을(를) 고치고 싶은데, 매번 [[실패하는 이유]] 때문에 실패해요.",
        examples: ["새벽까지 휴대폰 보기", "누우면 심심해서"],
      },
    ],
    etc: [
      {
        id: "etc-ask",
        text: "[[지금 상황]]인데, [[궁금한 것]]이 궁금해요.",
        examples: ["이사를 앞두고 있는 상황", "혼자 살면 뭐가 제일 힘든지"],
      },
      {
        id: "etc-dawoong",
        text: "다웅이라면 [[상황]]일 때 어떻게 할 거예요?",
        examples: ["친구 결혼식 축사를 부탁받았"],
      },
    ],
  },
  wishes: [
    { id: "warm", label: "따뜻하게 위로해줘", emoji: "🫶" },
    { id: "fact", label: "팩트로 말해줘", emoji: "🔎" },
    { id: "funny", label: "웃기게 풀어줘", emoji: "🤣" },
    { id: "chat", label: "채팅 여론으로 판결해줘", emoji: "⚖️" },
  ],
  stamps: [
    { id: "unfair", label: "억울", emoji: "😤", color: "#F59E0B" },
    { id: "angry", label: "분노", emoji: "😡", color: "#E11D2E" },
    { id: "flutter", label: "설렘", emoji: "💗", color: "#EC4899" },
    { id: "worry", label: "걱정", emoji: "😟", color: "#2563EB" },
    { id: "panic", label: "멘붕", emoji: "🤯", color: "#8B5CF6" },
    { id: "hyeonta", label: "현타", emoji: "🫠", color: "#14B8A6" },
    { id: "sad", label: "슬픔", emoji: "😢", color: "#64748B" },
  ],
  voices: [
    { id: "dj", label: "차분한 라디오 DJ", emoji: "📻", desc: "잔잔하고 낮은 목소리로" },
    { id: "friend", label: "다정한 친구", emoji: "🧸", desc: "편하게 반말 섞어서" },
    { id: "counselor", label: "진지한 상담 선생님", emoji: "🧑‍🏫", desc: "차분하고 진지하게" },
    { id: "anchor", label: "또박또박 뉴스 앵커", emoji: "🎙️", desc: "정확하고 또렷하게" },
    { id: "chic", label: "시크한 형·언니", emoji: "😎", desc: "쿨하고 담백하게" },
    { id: "grandma", label: "따뜻한 할머니", emoji: "👵", desc: "느긋하고 포근하게" },
  ],
  visibilities: [
    { id: "named", label: "방송에서 이름 공개", desc: "정한 이름을 방송에서 불러줘요" },
    { id: "anonymous", label: "방송에서 익명으로 읽기", desc: "이름 없이 사연만 읽어요" },
    { id: "private", label: "방장만 보기", desc: "방송에서 읽지 않고 답장만 받아요" },
  ],
  genders: [
    { id: "male", label: "남" },
    { id: "female", label: "여" },
    { id: "none", label: "선택 안 함" },
  ],
};

export const BOXES: Record<string, BoxConfig> = { gomin: GOMIN };

export function optionLabel(list: Option[], id: string | null | undefined): string {
  return list.find((o) => o.id === id)?.label ?? "";
}

export function optionEmoji(list: Option[], id: string | null | undefined): string {
  return list.find((o) => o.id === id)?.emoji ?? "";
}

/** "[[빈칸]]" 들을 순서대로 꺼냅니다. */
export function templateBlanks(t: Template): string[] {
  return [...t.text.matchAll(/\[\[(.+?)\]\]/g)].map((m) => m[1]);
}

/** 빈칸을 채워 문장을 완성합니다. 비어 있는 칸은 ___ 로 남깁니다. */
export function fillTemplate(t: Template, answers: string[]): string {
  let i = 0;
  return t.text.replace(/\[\[(.+?)\]\]/g, () => {
    const v = (answers[i++] ?? "").trim();
    return v.length ? v : "___";
  });
}

// ---------------------------------------------------------------------
// 익명 랜덤 이름: "행동 + 동물" (고민 동물과는 별개!)
// 비하나 욕설로 읽힐 수 있는 조합이 나오지 않도록 평범한 일상 행동만 씁니다.
// ---------------------------------------------------------------------
export const NAME_ACTIONS = [
  "아령 드는", "뛰는", "라면 끓이는", "출근하는", "줄넘기하는", "낮잠 자는", "노래하는", "춤추는",
  "책 읽는", "그림 그리는", "산책하는", "요가하는", "수영하는", "자전거 타는", "빨래 개는", "설거지하는",
  "일기 쓰는", "별 보는", "김밥 싸는", "붕어빵 사는", "우산 쓴", "목도리 두른", "휘파람 부는", "기지개 켜는",
  "박수 치는", "퍼즐 맞추는", "화분 키우는", "편지 쓰는", "사진 찍는", "커피 내리는", "떡볶이 먹는",
  "스케이트 타는", "피아노 치는", "등산하는", "캠핑하는", "낚시하는", "뜨개질하는", "공부하는", "청소하는",
  "케이크 굽는",
];

export const NAME_ANIMALS = [
  "두더지", "다람쥐", "수달", "펭귄", "하마", "고슴도치", "알파카", "코끼리", "기린", "판다",
  "너구리", "햄스터", "토끼", "고양이", "강아지", "오리", "부엉이", "거북이", "해달", "카피바라",
  "미어캣", "라쿤", "코알라", "북극곰", "여우", "사슴", "양", "염소", "돌고래", "물개",
  "펠리컨", "앵무새", "참새", "비버", "레서판다", "친칠라", "오소리", "두루미", "고래", "청설모",
];

export function randomNickname(rand: () => number = Math.random): string {
  const a = NAME_ACTIONS[Math.floor(rand() * NAME_ACTIONS.length)];
  const b = NAME_ANIMALS[Math.floor(rand() * NAME_ANIMALS.length)];
  return `${a} ${b}`;
}

// ---------------------------------------------------------------------
// 접수증 랜덤 칭호
// ---------------------------------------------------------------------
const BADGES_BY_STAMP: Record<string, string[]> = {
  unfair: ["프로 억울러", "억울함 대변인", "정의 구현 지망생"],
  angry: ["분노 조절 연습생", "불꽃 심장", "참을 인 수집가"],
  flutter: ["설렘 과다 복용러", "두근거림 장인", "핑크빛 탐정"],
  worry: ["걱정 인형 수집가", "새벽 고민러", "만약에 전문가"],
  panic: ["멘붕 극복 중", "정신줄 수색대", "혼돈의 생존자"],
  hyeonta: ["현타 전문가", "인생 2회차 지망생", "멍 때리기 국가대표"],
  sad: ["눈물 젖은 펜", "마음 정리 중", "토닥임 예약자"],
};

const BADGES_COMMON = [
  "오늘의 고민 장인", "용기 있는 사연러", "고민 우체부 단골", "마음 배달 완료", "솔직함 만렙",
  "고민 수집 1급", "사연함 VIP",
];

const BADGES_BY_WISH: Record<string, string[]> = {
  fact: ["팩트 수집가", "냉철한 질문러"],
  chat: ["채팅 재판 원고", "여론 심판 신청인"],
  funny: ["웃음 처방 대기자"],
  warm: ["포근함 신청인"],
};

export function pickBadge(stamp: string, wish: string, rand: () => number = Math.random): string {
  const pool = [
    ...(BADGES_BY_STAMP[stamp] ?? []),
    ...(BADGES_BY_STAMP[stamp] ?? []),
    ...(BADGES_BY_WISH[wish] ?? []),
    ...BADGES_COMMON,
  ];
  return pool[Math.floor(rand() * pool.length)];
}

// ---------------------------------------------------------------------
// 고민 온도 문구
// ---------------------------------------------------------------------
export function temperatureLabel(t: number): string {
  if (t <= 10) return "라면 뭐 먹지 수준";
  if (t <= 30) return "가끔 생각나요";
  if (t <= 45) return "은근히 신경 쓰여요";
  if (t <= 60) return "며칠째 신경 쓰임";
  if (t <= 75) return "잠들기 전에 계속 생각나요";
  if (t <= 90) return "머릿속이 이걸로 꽉 찼어요";
  return "인생 걸림";
}

export const HELP_LINES = [
  { name: "청소년상담", tel: "1388" },
  { name: "자살예방상담", tel: "109" },
  { name: "정신건강위기상담", tel: "1577-0199" },
];

export const HELP_SENTENCE =
  "혼자 견디지 않아도 돼요. 청소년상담 1388, 자살예방상담 109, 정신건강위기상담 1577-0199에서 언제든 이야기를 들어줘요.";
