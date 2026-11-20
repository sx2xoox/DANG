// =====================================================================
// 기본 고민 동물 16종
// AI 가 응답하지 않거나 규칙을 어긴 결과를 낼 때 쓰는 동물입니다.
// 고민 종류, 온도, 듣고 싶은 말, 감정 우표로 하나를 고릅니다.
// =====================================================================

import { HELP_SENTENCE } from "./boxes.ts";

export type AnimalCard = {
  name: string;
  emoji: string;
  why: string;
  description: string;
  quote: string;
  hashtags: string[];
};

export const FALLBACK_ANIMALS: Record<string, AnimalCard> = {
  parrot: {
    name: "두근두근 앵무새",
    emoji: "🦜",
    why: "마음속 말을 백 번쯤 연습하고 있어서",
    description:
      "설렘과 긴장이 동시에 날개를 퍼덕이는 중이에요. 하고 싶은 말이 많다는 건 그만큼 마음이 진심이라는 뜻이죠. 이 유형은 감정을 솔직하게 느낄 줄 아는 게 가장 큰 장점이에요. \"너무 잘하려고 안 해도 괜찮아\"라는 말이 힘이 돼요.",
    quote: "연습은 끝났어… 근데 입이 안 떨어져…",
    hashtags: ["#설렘주의", "#두근두근", "#연습만백번"],
  },
  sea_otter: {
    name: "손잡는 해달",
    emoji: "🦦",
    why: "떠내려가지 않으려고 누군가의 손을 꼭 잡고 싶어서",
    description:
      "지금은 마음이 조금 지쳐서 기댈 곳이 필요한 상태예요. 힘든 걸 힘들다고 말할 수 있는 건 생각보다 큰 용기랍니다. 이 유형은 다른 사람의 마음도 잘 헤아리는 따뜻함이 장점이에요. \"혼자가 아니야\"라는 말이 가장 큰 힘이 돼요.",
    quote: "잠깐만… 손 좀 잡고 있어도 돼?",
    hashtags: ["#토닥토닥", "#같이떠있기", "#위로필요"],
  },
  meerkat: {
    name: "정의의 미어캣",
    emoji: "🐾",
    why: "억울한 일 앞에서 고개를 꼿꼿이 들고 있어서",
    description:
      "\"이건 좀 아니지 않아?\" 하는 마음이 머리 끝까지 차오른 상태예요. 옳고 그름을 따질 줄 안다는 건 스스로를 지킬 줄 안다는 뜻이에요. 이 유형은 쉽게 휘둘리지 않는 단단함이 장점이에요. \"네가 느낀 억울함은 진짜야\"라는 말이 힘이 돼요.",
    quote: "잠깐, 다시 처음부터 따져보자.",
    hashtags: ["#억울주의보", "#정의구현", "#판결원함"],
  },
  raccoon: {
    name: "곱씹는 라쿤",
    emoji: "🦝",
    why: "같은 장면을 머릿속에서 계속 씻고 또 씻는 중이라서",
    description:
      "한번 마음에 걸린 일을 쉽게 내려놓지 못하고 계속 되짚어 보는 중이에요. 그만큼 신중하고 책임감이 강하다는 뜻이기도 해요. 이 유형은 디테일을 놓치지 않는 꼼꼼함이 장점이에요. \"그 정도면 충분히 생각했어\"라는 말이 힘이 돼요.",
    quote: "근데 그때 내가 이렇게 말했으면…?",
    hashtags: ["#생각많음", "#곱씹기장인", "#새벽재생"],
  },
  cat: {
    name: "삐진 고양이",
    emoji: "🐈",
    why: "등 돌리고 앉았지만 사실 알아봐 주길 기다리는 중이라서",
    description:
      "서운한 마음이 차곡차곡 쌓여서 살짝 토라진 상태예요. 서운함을 느낀다는 건 그 관계를 아끼고 있다는 증거예요. 이 유형은 자기 감정을 정확히 아는 섬세함이 장점이에요. \"서운할 만했어\"라는 한마디가 힘이 돼요.",
    quote: "흥. 안 삐졌어. (삐졌음)",
    hashtags: ["#서운함", "#알아줘요", "#츤데레"],
  },
  puppy: {
    name: "꼬리 내린 강아지",
    emoji: "🐕",
    why: "기운이 쭉 빠져서 꼬리가 바닥에 닿아 있어서",
    description:
      "요즘 마음이 축 처져서 평소의 기운이 잘 안 나는 상태예요. 슬픔을 느끼는 건 약해서가 아니라 진심이었기 때문이에요. 이 유형은 누구보다 다정하고 정이 많은 게 장점이에요. \"오늘은 그냥 쉬어도 돼\"라는 말이 힘이 돼요.",
    quote: "산책… 나중에 가도 돼…?",
    hashtags: ["#기운내", "#토닥토닥", "#꼬리올리기"],
  },
  goose: {
    name: "할 말 많은 거위",
    emoji: "🪿",
    why: "속에 쌓인 말이 꽥꽥 넘쳐흐르기 직전이라서",
    description:
      "참고 참았던 말들이 목 끝까지 차오른 상태예요. 화가 난다는 건 지키고 싶은 선이 분명하다는 뜻이에요. 이 유형은 솔직하고 표현력이 좋은 게 장점이에요. \"일단 다 말해봐, 들어줄게\"라는 말이 힘이 돼요.",
    quote: "꽥! 아니 내 말 좀 들어봐!",
    hashtags: ["#할말많음", "#분노게이지", "#일단들어줘"],
  },
  capybara: {
    name: "평화주의 카피바라",
    emoji: "🦫",
    why: "온천에 몸 담그듯 느긋하게 고민을 띄워두고 있어서",
    description:
      "고민이 있긴 하지만 마음의 여유는 아직 넉넉한 상태예요. 이렇게 한 발 떨어져서 볼 줄 아는 게 큰 능력이에요. 이 유형은 주변까지 편안하게 만드는 분위기가 장점이에요. \"어떤 선택이든 괜찮을 거야\"라는 말이 힘이 돼요.",
    quote: "음… 일단 따뜻한 물에 들어가서 생각하자.",
    hashtags: ["#평화", "#여유만만", "#천천히"],
  },
  cheetah: {
    name: "꿈꾸는 치타",
    emoji: "🐆",
    why: "달릴 준비는 끝났고, 어느 쪽으로 달릴지만 고르는 중이라서",
    description:
      "하고 싶은 게 분명하고 마음속 엔진이 이미 켜져 있는 상태예요. 고민이 된다는 건 진지하게 미래를 그리고 있다는 뜻이에요. 이 유형은 한번 마음먹으면 빠르게 나아가는 추진력이 장점이에요. \"너라면 해낼 거야\"라는 말이 힘이 돼요.",
    quote: "출발선은 여기, 결승선은… 이제 정하면 돼!",
    hashtags: ["#꿈", "#준비완료", "#전력질주"],
  },
  owl: {
    name: "새벽 3시 부엉이",
    emoji: "🦉",
    why: "다들 자는 시간에 혼자 눈 뜨고 고민을 지키고 있어서",
    description:
      "걱정이 밤까지 이어져서 쉽게 잠들지 못하는 상태예요. 이렇게 오래 고민한다는 건 그만큼 잘하고 싶은 마음이 크다는 뜻이에요. 이 유형은 깊이 생각하고 멀리 내다보는 게 장점이에요. \"오늘 고민은 여기까지, 내일의 너한테 맡겨도 돼\"라는 말이 힘이 돼요.",
    quote: "부엉… 지금 몇 시지…?",
    hashtags: ["#새벽고민", "#잠못드는밤", "#생각과다"],
  },
  racehorse: {
    name: "팩폭 맞으러 온 경주마",
    emoji: "🐎",
    why: "돌려 말하지 말고 정면으로 달려 달라고 해서",
    description:
      "애매한 위로보다 확실한 답을 듣고 싶은 상태예요. 쓴소리를 먼저 청할 수 있다는 건 이미 바뀔 준비가 됐다는 뜻이에요. 이 유형은 결정하면 바로 움직이는 실행력이 장점이에요. \"정답은 몰라도 방향은 맞아\"라는 말이 힘이 돼요.",
    quote: "돌려 말하지 마. 직진으로 와.",
    hashtags: ["#팩폭환영", "#직진", "#정신차림"],
  },
  turtle: {
    name: "갈림길 거북이",
    emoji: "🐢",
    why: "두 갈래 길 앞에서 천천히 고개를 왔다 갔다 하는 중이라서",
    description:
      "선택지 앞에서 어느 쪽으로 갈지 신중하게 재보는 상태예요. 느리게 고르는 건 틀린 게 아니라 후회를 줄이는 방법이에요. 이 유형은 끈기 있게 끝까지 가는 힘이 장점이에요. \"어느 길이든 네 속도로 가면 돼\"라는 말이 힘이 돼요.",
    quote: "왼쪽… 오른쪽… 일단 한 걸음만.",
    hashtags: ["#선택장애", "#천천히", "#갈림길"],
  },
  hamster: {
    name: "볼 빵빵 햄스터",
    emoji: "🐹",
    why: "걱정을 볼에 한가득 모아두고 있어서",
    description:
      "이것저것 챙기고 대비하느라 마음이 꽉 찬 상태예요. 미리 걱정한다는 건 그만큼 현실을 잘 챙긴다는 뜻이에요. 이 유형은 알뜰하고 계획적인 게 장점이에요. \"지금도 충분히 잘 챙기고 있어\"라는 말이 힘이 돼요.",
    quote: "이건 나중에 필요할 수도 있으니까… 냠.",
    hashtags: ["#알뜰살뜰", "#걱정저장", "#볼빵빵"],
  },
  sloth: {
    name: "이불 속 나무늘보",
    emoji: "🦥",
    why: "일단 이불 밖은 위험하다고 판단해서",
    description:
      "의욕 배터리가 잠깐 방전된 상태예요. 쉬고 싶은 마음이 드는 건 그동안 열심히 버텼다는 증거예요. 이 유형은 자기 페이스를 지킬 줄 아는 게 장점이에요. \"오늘은 한 가지만 해도 잘한 거야\"라는 말이 힘이 돼요.",
    quote: "5분만… 아니 5년만…",
    hashtags: ["#충전중", "#이불밖은위험해", "#슬로우라이프"],
  },
  octopus: {
    name: "갈팡질팡 문어",
    emoji: "🐙",
    why: "여덟 개 다리가 전부 다른 방향을 가리키고 있어서",
    description:
      "생각이 사방으로 뻗어서 머릿속이 정신없는 상태예요. 여러 가능성을 동시에 볼 수 있다는 건 사실 큰 재능이에요. 이 유형은 위기에서도 방법을 찾아내는 유연함이 장점이에요. \"하나씩만 정리해 보자\"라는 말이 힘이 돼요.",
    quote: "잠깐만, 다리 좀 정리하고 올게.",
    hashtags: ["#멘붕", "#생각정리중", "#갈팡질팡"],
  },
  koala: {
    name: "현타 온 코알라",
    emoji: "🐨",
    why: "나무에 매달린 채 \"내가 뭘 하고 있지?\" 생각하는 중이라서",
    description:
      "문득 지금의 나를 돌아보며 힘이 쭉 빠진 상태예요. 현타가 온다는 건 더 나은 방향을 찾고 있다는 신호예요. 이 유형은 자기 자신을 객관적으로 볼 줄 아는 게 장점이에요. \"잠깐 멈춰도 다시 오를 수 있어\"라는 말이 힘이 돼요.",
    quote: "…나 지금 왜 여기 매달려 있지?",
    hashtags: ["#현타", "#멍때리기", "#재정비"],
  },
};

export type AnimalInput = {
  category: string;
  temperature: number;
  wish: string;
  stamp: string;
  care?: boolean;
};

export function fallbackKey(input: AnimalInput): string {
  // 시험·성적 고민은 진로 고민과 같은 동물 계열로
  const i = { ...input, category: input.category === "exam" ? "career" : input.category };
  if (i.care) return "sea_otter";
  if (i.wish === "fact" && i.stamp !== "sad") return "racehorse";
  if (i.temperature <= 15) return "capybara";
  switch (i.stamp) {
    case "flutter":
      return i.category === "career" ? "cheetah" : "parrot";
    case "unfair":
      return i.wish === "chat" ? "goose" : "meerkat";
    case "angry":
      return i.temperature >= 70 ? "goose" : "cat";
    case "worry":
      if (i.category === "money") return "hamster";
      if (i.category === "career") return i.temperature >= 70 ? "owl" : "turtle";
      return i.temperature >= 70 ? "owl" : "raccoon";
    case "panic":
      return i.category === "career" ? "turtle" : "octopus";
    case "hyeonta":
      return i.temperature < 40 ? "sloth" : "koala";
    case "sad":
      return i.wish === "warm" ? "sea_otter" : "puppy";
    default:
      if (i.category === "career") return "cheetah";
      return "raccoon";
  }
}

export function fallbackAnimal(i: AnimalInput): AnimalCard {
  const base = FALLBACK_ANIMALS[fallbackKey(i)];
  const card = { ...base, hashtags: [...base.hashtags] };
  if (i.care && !card.description.includes("1388")) {
    card.description = `${card.description} ${HELP_SENTENCE}`;
  }
  return card;
}
